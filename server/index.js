import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import { watch } from 'chokidar'

const app = express()
app.use(cors())
app.use(express.json())

const TASKS_DIR = path.resolve(process.cwd(), '.tasks')
const CONFIG_PATH = path.join(TASKS_DIR, 'config.yml')
const DOCS_DIR = path.join(TASKS_DIR, 'docs')

function resolveDocPath(reqPath) {
  const resolved = path.resolve(DOCS_DIR, reqPath)
  if (!resolved.startsWith(DOCS_DIR + path.sep) && resolved !== DOCS_DIR) {
    return null
  }
  return resolved
}

const DEFAULT_CONFIG = {
  board: {
    name: 'TaskBoard',
    columns: [
      { id: 'backlog', name: '백로그', description: '당장은 아니지만 까먹으면 안 되는 것' },
      { id: 'todo', name: '이번주 할 일', description: '이번 주에 반드시 처리할 것' },
      { id: 'in-progress', name: '진행중', description: '지금 작업 중인 것' },
      { id: 'waiting', name: '대기중', description: '진행했지만 외부 대기 필요 (심사, 테스트 등)' },
      { id: 'done', name: '완료', description: '끝난 것 (주차별 자동 정리)' },
    ],
  },
  labels: [
    { id: 'dev', name: '개발', color: '#3B82F6' },
    { id: 'bug', name: '버그', color: '#EF4444' },
  ],
  priorities: [
    { id: 'p0', name: 'P0 지금당장', color: '#DC2626' },
    { id: 'p1', name: 'P1 이번주', color: '#F59E0B' },
    { id: 'p2', name: 'P2 이번달', color: '#3B82F6' },
    { id: 'p3', name: 'P3 언젠가', color: '#6B7280' },
  ],
  done_archive: { enabled: true, group_by: 'week' },
}

// Bootstrap .tasks/ directory and config.yml if missing
async function bootstrap() {
  await fs.mkdir(TASKS_DIR, { recursive: true })

  const columns = DEFAULT_CONFIG.board.columns
  for (const col of columns) {
    await fs.mkdir(path.join(TASKS_DIR, col.id), { recursive: true })
  }

  // Create docs type folders
  const docTypes = ['global', 'epics', 'api', 'schema', 'flows', 'issues']
  for (const dt of docTypes) {
    await fs.mkdir(path.join(DOCS_DIR, dt), { recursive: true })
  }

  try {
    await fs.access(CONFIG_PATH)
  } catch {
    const content = yaml.dump(DEFAULT_CONFIG, { lineWidth: -1, noRefs: true })
    await fs.writeFile(CONFIG_PATH, content, 'utf-8')
    console.log('Created default .tasks/config.yml')
  }
}

// Read config with fallback to defaults
async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    return yaml.load(raw)
  } catch {
    return DEFAULT_CONFIG
  }
}

// SSE clients for live reload
const sseClients = new Set()

// Bootstrap before starting watcher
await bootstrap()

const watcher = watch(TASKS_DIR, { ignoreInitial: true })
watcher.on('all', (event, filePath) => {
  const relative = path.relative(TASKS_DIR, filePath)
  const eventType = relative.startsWith('docs' + path.sep) || relative === 'docs'
    ? 'docs-change'
    : 'task-change'
  for (const client of sseClients) {
    client.write(`event: ${eventType}\ndata: reload\n\n`)
  }
})

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
})

// Load board config
app.get('/api/config', async (req, res) => {
  try {
    const config = await loadConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update board config
app.put('/api/config', async (req, res) => {
  try {
    const newConfig = req.body
    const content = yaml.dump(newConfig, { lineWidth: -1, noRefs: true })
    await fs.writeFile(CONFIG_PATH, content, 'utf-8')

    // Auto-create epic docs for new epics
    if (newConfig.epics?.length) {
      const epicsDir = path.join(DOCS_DIR, 'epics')
      await fs.mkdir(epicsDir, { recursive: true })
      for (const epic of newConfig.epics) {
        const epicFile = path.join(epicsDir, `${epic.id}.md`)
        try {
          await fs.access(epicFile)
        } catch {
          const epicDoc = matter.stringify(
            '## 왜 (Why)\n이 에픽을 만드는 이유.\n\n## 결정된 것\n- YYYY-MM-DD: 결정 내용\n\n## 아직 안 정한 것\n- 미결 사항\n\n## 떠오른 생각\n- 메모',
            { title: epic.name }
          )
          await fs.writeFile(epicFile, epicDoc)
        }
      }
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// List all tasks grouped by column
app.get('/api/tasks', async (req, res) => {
  try {
    const config = await loadConfig()
    const columns = config.board.columns

    const result = {}
    for (const col of columns) {
      const colDir = path.join(TASKS_DIR, col.id)
      result[col.id] = await readTasksFromDir(colDir)
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Move task between columns
app.post('/api/tasks/move', async (req, res) => {
  try {
    const { taskId, from, to, status } = req.body
    const fromDir = path.join(TASKS_DIR, from)
    const toDir = path.join(TASKS_DIR, to)

    // Find the file (search subdirectories for done column)
    const found = await findTaskFileRecursive(fromDir, taskId)

    if (!found) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // If moving to done, put in weekly subfolder
    let destDir = toDir
    if (to === 'done') {
      const weekStr = getWeekString(new Date())
      destDir = path.join(toDir, weekStr)
      await fs.mkdir(destDir, { recursive: true })
    }

    await fs.rename(found.fullPath, path.join(destDir, found.file))

    // Set or remove status field in frontmatter
    if (to === 'done') {
      const destPath = path.join(destDir, found.file)
      const raw = await fs.readFile(destPath, 'utf-8')
      const { data, content } = matter(raw)
      data.status = status || 'done'
      data.completed_at = new Date().toISOString().split('T')[0]
      await fs.writeFile(destPath, matter.stringify(content, data))
    } else if (from === 'done') {
      const destPath = path.join(destDir, found.file)
      const raw = await fs.readFile(destPath, 'utf-8')
      const { data, content } = matter(raw)
      delete data.status
      delete data.completed_at
      await fs.writeFile(destPath, matter.stringify(content, data))
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { column, title, labels, priority, depends_on, refs, epic, body, id: customId, template_id } = req.body
    const id = customId || slugify(title) || `task-${crypto.randomUUID().slice(0, 8)}`
    const filename = `${id}.md`

    // Resolve body: use template if template_id provided and no body
    let taskBody = body || ''
    if (template_id && !body) {
      const config = await loadConfig()
      const tmpl = (config.templates || []).find(t => t.id === template_id)
      if (tmpl) taskBody = tmpl.body
    }

    const frontmatter = {
      id,
      title,
      labels: labels || [],
      priority: priority || 'medium',
      created: new Date().toISOString().split('T')[0],
    }
    if (depends_on?.length) frontmatter.depends_on = depends_on
    if (refs?.length) frontmatter.refs = refs
    if (epic) frontmatter.epic = epic

    const content = matter.stringify(taskBody, frontmatter)
    const colDir = path.join(TASKS_DIR, column || 'backlog')
    await fs.mkdir(colDir, { recursive: true })
    await fs.writeFile(path.join(colDir, filename), content)

    res.json({ ok: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single task
app.get('/api/tasks/:column/:id', async (req, res) => {
  try {
    const { column, id } = req.params
    const colDir = path.join(TASKS_DIR, column)
    const file = await findTaskFile(colDir, id)
    if (!file) return res.status(404).json({ error: 'Not found' })

    const raw = await fs.readFile(path.join(colDir, file), 'utf-8')
    const { data, content } = matter(raw)
    res.json({ ...data, content, _file: file, _column: column })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update task
app.put('/api/tasks/:column/:id', async (req, res) => {
  try {
    const { column, id } = req.params
    const colDir = path.join(TASKS_DIR, column)
    const file = await findTaskFile(colDir, id)
    if (!file) return res.status(404).json({ error: 'Not found' })

    const filePath = path.join(colDir, file)
    const raw = await fs.readFile(filePath, 'utf-8')
    const { data: existingData, content: existingContent } = matter(raw)

    const { content, ...frontmatterUpdates } = req.body
    const newData = { ...existingData, ...frontmatterUpdates }
    const finalContent = content !== undefined ? content : existingContent
    const newContent = matter.stringify(finalContent, newData)
    await fs.writeFile(filePath, newContent)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Soft delete task (move to .trash/)
app.delete('/api/tasks/:column/:id', async (req, res) => {
  try {
    const { column, id } = req.params
    const colDir = path.join(TASKS_DIR, column)
    const found = await findTaskFileRecursive(colDir, id)
    if (!found) return res.status(404).json({ error: 'Not found' })

    const trashDir = path.join(TASKS_DIR, '.trash')
    await fs.mkdir(trashDir, { recursive: true })
    await fs.rename(found.fullPath, path.join(trashDir, found.file))

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// List trashed tasks
app.get('/api/trash', async (req, res) => {
  try {
    const trashDir = path.join(TASKS_DIR, '.trash')
    const tasks = await readTasksFromDir(trashDir)
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Restore from trash
app.post('/api/trash/restore', async (req, res) => {
  try {
    const { taskId, to } = req.body
    const trashDir = path.join(TASKS_DIR, '.trash')
    const found = await findTaskFileRecursive(trashDir, taskId)
    if (!found) return res.status(404).json({ error: 'Not found in trash' })

    const destDir = path.join(TASKS_DIR, to || 'backlog')
    await fs.mkdir(destDir, { recursive: true })
    await fs.rename(found.fullPath, path.join(destDir, found.file))

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Permanent delete from trash
app.delete('/api/trash/:id', async (req, res) => {
  try {
    const trashDir = path.join(TASKS_DIR, '.trash')
    const found = await findTaskFileRecursive(trashDir, req.params.id)
    if (!found) return res.status(404).json({ error: 'Not found in trash' })

    await fs.unlink(found.fullPath)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Docs API ---

async function readDocsTree(dir, basePath = '') {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const children = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        const sub = await readDocsTree(path.join(dir, entry.name), entryPath)
        children.push({ name: entry.name, path: entryPath, type: 'dir', children: sub })
      } else if (entry.name.endsWith('.md')) {
        children.push({ name: entry.name, path: entryPath, type: 'file' })
      }
    }
    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

app.get('/api/docs/tree', async (req, res) => {
  try {
    await fs.mkdir(DOCS_DIR, { recursive: true })
    const children = await readDocsTree(DOCS_DIR)
    res.json({ name: 'docs', path: '', type: 'dir', children })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/docs/flat', async (req, res) => {
  try {
    await fs.mkdir(DOCS_DIR, { recursive: true })
    const results = []
    async function traverse(dir, basePath = '') {
      let entries
      try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          await traverse(path.join(dir, entry.name), entryPath)
        } else if (entry.name.endsWith('.md')) {
          try {
            const raw = await fs.readFile(path.join(dir, entry.name), 'utf-8')
            const { content } = matter(raw)
            const category = basePath.split('/')[0] || ''
            results.push({ path: entryPath, name: entry.name.replace(/\.md$/, ''), category, content })
          } catch { /* skip unreadable files */ }
        }
      }
    }
    await traverse(DOCS_DIR)
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/docs/*', async (req, res) => {
  try {
    const docPath = resolveDocPath(req.params[0])
    if (!docPath) return res.status(400).json({ error: 'Invalid path' })
    const raw = await fs.readFile(docPath, 'utf-8')
    const { data, content } = matter(raw)
    res.json({ data, content, path: req.params[0] })
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/docs/*', async (req, res) => {
  try {
    const docPath = resolveDocPath(req.params[0])
    if (!docPath) return res.status(400).json({ error: 'Invalid path' })
    try {
      await fs.access(docPath)
      return res.status(409).json({ error: 'File already exists' })
    } catch {}
    await fs.mkdir(path.dirname(docPath), { recursive: true })
    const { content, ...frontmatterData } = req.body
    const fileContent = matter.stringify(content || '', frontmatterData)
    await fs.writeFile(docPath, fileContent)
    res.json({ ok: true, path: req.params[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/docs/*', async (req, res) => {
  try {
    const docPath = resolveDocPath(req.params[0])
    if (!docPath) return res.status(400).json({ error: 'Invalid path' })
    const raw = await fs.readFile(docPath, 'utf-8')
    const { data: existingData, content: existingContent } = matter(raw)
    const { content, ...frontmatterUpdates } = req.body
    const newData = { ...existingData, ...frontmatterUpdates }
    const finalContent = content !== undefined ? content : existingContent
    await fs.writeFile(docPath, matter.stringify(finalContent, newData))
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/docs/*', async (req, res) => {
  try {
    const docPath = resolveDocPath(req.params[0])
    if (!docPath) return res.status(400).json({ error: 'Invalid path' })
    await fs.unlink(docPath)
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    res.status(500).json({ error: err.message })
  }
})

// --- Helpers ---

async function readTasksFromDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const tasks = []

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(dir, entry.name)
        const raw = await fs.readFile(filePath, 'utf-8')
        const { data, content } = matter(raw)
        // Fallback: use file mtime if completed_at is missing (for legacy done tasks)
        if (!data.completed_at && data.status) {
          const stat = await fs.stat(filePath)
          data._completedAt = stat.mtime.toISOString().split('T')[0]
        } else if (data.completed_at) {
          data._completedAt = String(data.completed_at).split('T')[0]
        }
        tasks.push({ ...data, content, _file: entry.name })
      }
      // Recurse into subdirectories (e.g., done/2026-W12/)
      if (entry.isDirectory()) {
        const subTasks = await readTasksFromDir(path.join(dir, entry.name))
        tasks.push(...subTasks.map(t => ({ ...t, _week: entry.name })))
      }
    }

    return tasks.sort((a, b) => {
      const pOrder = { p0: 0, p1: 1, p2: 2, p3: 3 }
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2)
    })
  } catch {
    return []
  }
}

async function findTaskFileRecursive(dir, taskId) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const raw = await fs.readFile(fullPath, 'utf-8')
        const { data } = matter(raw)
        if (data.id === taskId || entry.name === `${taskId}.md`) {
          return { file: entry.name, fullPath }
        }
      }
      if (entry.isDirectory()) {
        const found = await findTaskFileRecursive(fullPath, taskId)
        if (found) return found
      }
    }
    return null
  } catch {
    return null
  }
}

async function findTaskFile(dir, taskId) {
  try {
    const files = await fs.readdir(dir)
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const raw = await fs.readFile(path.join(dir, file), 'utf-8')
      const { data } = matter(raw)
      if (data.id === taskId) return file
    }
    // Fallback: match by filename
    const byName = files.find(f => f === `${taskId}.md`)
    return byName || null
  } catch {
    return null
  }
}

function getWeekString(date) {
  const year = date.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const days = Math.floor((date - oneJan) / 86400000)
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[가-힣]+/g, match => match)
    .replace(/[^\w가-힣-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
}

// Production: serve built frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
try {
  const stat = await fs.stat(distDir)
  if (stat.isDirectory()) {
    app.use(express.static(distDir))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }
} catch {}

const preferredPort = parseInt(process.env.PLANK_PORT || '0', 10)

const server = app.listen(preferredPort, () => {
  const actualPort = server.address().port
  console.log(`\n  Plank server running on http://localhost:${actualPort}\n`)
})
server.on('error', (err) => {
  console.error(`  Failed to start: ${err.message}`)
  process.exit(1)
})
