#!/usr/bin/env node

import { fileURLToPath } from 'url'
import path from 'path'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(__dirname, '..', 'server', 'index.js')

const PORT = process.env.PLANK_PORT || 4567

// Start the server (it serves both API and static files in production)
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', PLANK_PORT: String(PORT) },
  cwd: process.cwd(),
})

server.on('error', (err) => {
  console.error('Failed to start Plank server:', err.message)
  process.exit(1)
})

server.on('close', (code) => {
  process.exit(code || 0)
})

// Forward signals
process.on('SIGINT', () => server.kill('SIGINT'))
process.on('SIGTERM', () => server.kill('SIGTERM'))
