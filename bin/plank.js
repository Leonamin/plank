#!/usr/bin/env node

import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(__dirname, '..')
const cwd = process.cwd()

// --- Init: copy .claude/ and CLAUDE.md to user's project if missing ---
function initPlankFiles() {
  const filesToCopy = [
    { src: '.claude/hooks/plank-status.sh', dest: '.claude/hooks/plank-status.sh' },
    { src: '.claude/commands/plank.md', dest: '.claude/commands/plank.md' },
    { src: '.claude/settings.json', dest: '.claude/settings.json' },
    { src: 'CLAUDE.md', dest: 'CLAUDE.md' },
  ]

  let copied = 0
  for (const { src, dest } of filesToCopy) {
    const srcPath = path.join(pkgRoot, src)
    const destPath = path.join(cwd, dest)

    if (fs.existsSync(destPath)) continue
    if (!fs.existsSync(srcPath)) continue

    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)

    // Preserve executable permission for shell scripts
    if (src.endsWith('.sh')) {
      fs.chmodSync(destPath, 0o755)
    }

    copied++
    console.log(`  + ${dest}`)
  }

  if (copied > 0) {
    console.log(`Plank: ${copied}개 파일을 프로젝트에 복사했습니다.`)
    console.log('  AI CLI (Claude Code) 연동이 자동으로 활성화됩니다.\n')
  }
}

initPlankFiles()

// --- Start server ---
const serverPath = path.join(pkgRoot, 'server', 'index.js')
const PORT = process.env.PLANK_PORT || 4567

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', PLANK_PORT: String(PORT) },
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
