import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import { watch } from 'chokidar'

const app = express()
app.use(cors())
app.use(express.json())

const TASKS_DIR = path.resolve(process.cwd(), '.tasks')
const CONFIG_PATH = path.join(TASKS_DIR, 'config.yml')

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
watcher.on('all', () => {
  for (const client of sseClients) {
    client.write('data: reload\n\n')
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
    const { taskId, from, to } = req.body
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

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { column, title, labels, priority, depends_on, body, id: customId } = req.body
    const id = customId || slugify(title) || `task-${crypto.randomUUID().slice(0, 8)}`
    const filename = `${id}.md`

    const frontmatter = {
      id,
      title,
      labels: labels || [],
      priority: priority || 'medium',
      created: new Date().toISOString().split('T')[0],
    }
    if (depends_on?.length) frontmatter.depends_on = depends_on


    const content = matter.stringify(body || '', frontmatter)
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

// --- Helpers ---

async function readTasksFromDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const tasks = []

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const raw = await fs.readFile(path.join(dir, entry.name), 'utf-8')
        const { data, content } = matter(raw)
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

const PORT = 4567
app.listen(PORT, () => {
  console.log(`Plank server running on http://localhost:${PORT}`)
})
