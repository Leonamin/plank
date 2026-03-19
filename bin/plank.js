#!/usr/bin/env node

import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(__dirname, '..')
const cwd = process.cwd()

const PLANK_START = '<!-- PLANK:START -->'
const PLANK_END = '<!-- PLANK:END -->'

// --- Merge a marked section into an existing file ---
function mergeSection(destPath, srcPath) {
  const srcContent = fs.readFileSync(srcPath, 'utf-8')
  const section = `${PLANK_START}\n${srcContent}\n${PLANK_END}`

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, section + '\n')
    return 'created'
  }

  const existing = fs.readFileSync(destPath, 'utf-8')
  if (existing.includes(PLANK_START)) {
    // Replace existing Plank section
    const updated = existing.replace(
      new RegExp(`${PLANK_START}[\\s\\S]*?${PLANK_END}`),
      section
    )
    if (updated !== existing) {
      fs.writeFileSync(destPath, updated)
      return 'updated'
    }
    return 'unchanged'
  }

  // Append Plank section
  fs.writeFileSync(destPath, existing.trimEnd() + '\n\n' + section + '\n')
  return 'appended'
}

// --- Merge hooks into existing settings.json ---
function mergeSettings(destPath, srcPath) {
  const srcSettings = JSON.parse(fs.readFileSync(srcPath, 'utf-8'))

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, JSON.stringify(srcSettings, null, 2) + '\n')
    return 'created'
  }

  const existing = JSON.parse(fs.readFileSync(destPath, 'utf-8'))

  // Merge hooks: append Plank hooks without duplicating
  const plankHookCmd = 'bash .claude/hooks/plank-status.sh'
  if (srcSettings.hooks) {
    if (!existing.hooks) existing.hooks = {}
    for (const [event, entries] of Object.entries(srcSettings.hooks)) {
      if (!existing.hooks[event]) {
        existing.hooks[event] = entries
      } else {
        // Check if plank hook already exists
        const hasPlank = existing.hooks[event].some(e =>
          e.hooks?.some(h => h.command === plankHookCmd)
        )
        if (!hasPlank) {
          existing.hooks[event].push(...entries)
        } else {
          return 'unchanged'
        }
      }
    }
  }

  fs.writeFileSync(destPath, JSON.stringify(existing, null, 2) + '\n')
  return 'merged'
}

// --- Init Plank files ---
function initPlankFiles() {
  let changes = 0

  // 1. Copy hook script and command (these are Plank-owned files)
  const copyFiles = [
    { src: '.claude/hooks/plank-status.sh', dest: '.claude/hooks/plank-status.sh' },
    { src: '.claude/commands/plank.md', dest: '.claude/commands/plank.md' },
  ]
  for (const { src, dest } of copyFiles) {
    const srcPath = path.join(pkgRoot, src)
    const destPath = path.join(cwd, dest)
    if (!fs.existsSync(srcPath)) continue
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)
    if (src.endsWith('.sh')) fs.chmodSync(destPath, 0o755)
    changes++
    console.log(`  + ${dest}`)
  }

  // 2. Merge CLAUDE.md (append/update Plank section)
  const claudeSrc = path.join(pkgRoot, 'CLAUDE.md')
  const claudeDest = path.join(cwd, 'CLAUDE.md')
  if (fs.existsSync(claudeSrc)) {
    const result = mergeSection(claudeDest, claudeSrc)
    if (result !== 'unchanged') {
      changes++
      console.log(`  ${result === 'created' ? '+' : '~'} CLAUDE.md (Plank section ${result})`)
    }
  }

  // 3. Merge settings.json (add Plank hooks)
  const settingsSrc = path.join(pkgRoot, '.claude/settings.json')
  const settingsDest = path.join(cwd, '.claude/settings.json')
  if (fs.existsSync(settingsSrc)) {
    const result = mergeSettings(settingsDest, settingsSrc)
    if (result !== 'unchanged') {
      changes++
      console.log(`  ${result === 'created' ? '+' : '~'} .claude/settings.json (${result})`)
    }
  }

  if (changes > 0) {
    console.log(`\nPlank: ${changes}개 파일을 설정했습니다.`)
    console.log('  AI CLI (Claude Code) 연동이 활성화됩니다.\n')
  }
}

initPlankFiles()

// --- Start server (random port by default) ---
const serverPath = path.join(pkgRoot, 'server', 'index.js')
const PORT = process.env.PLANK_PORT || '0'

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', PLANK_PORT: PORT },
  cwd,
})

server.on('error', (err) => {
  console.error('Failed to start Plank server:', err.message)
  process.exit(1)
})

server.on('close', (code) => {
  process.exit(code || 0)
})

process.on('SIGINT', () => server.kill('SIGINT'))
process.on('SIGTERM', () => server.kill('SIGTERM'))
