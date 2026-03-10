#!/usr/bin/env node
/*
  Lightweight AIOS skeleton for local development.
  - Exposes a /health endpoint
  - Runs a periodic task loop (placeholder for agent orchestration)
  - Read configuration from env (ANTHROPIC_API_KEY, SUPABASE, etc.)
*/

const http = require('http')

const PORT = process.env.AIOS_PORT || 4000
const INTERVAL_MS = parseInt(process.env.AIOS_INTERVAL_MS || '180000', 10) // 3 minutes

function log(...args) {
  console.log('[aios]', ...args)
}

const AGENT_EXECUTE_URL = process.env.AGENT_EXECUTE_URL || 'http://localhost:3000/api/agent-execute'

async function runCycle() {
  const at = new Date().toISOString()
  log('cycle start', at)
  try {
    const payload = {
      agent: '@aios',
      task: 'scheduled-cycle',
      context: 'Periodic run from aios skeleton',
      priority: 'low'
    }

    // Node 18+ provides global fetch; fall back to node-fetch if unavailable
    const _fetch = global.fetch || (await import('node-fetch').then(m => m.default))
    const res = await _fetch(AGENT_EXECUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Read response body as text, attempt to parse JSON, then log status + body
    const txt = await res.text().catch(() => null)
    let parsed = null
    try {
      parsed = txt ? JSON.parse(txt) : null
    } catch (e) {
      parsed = txt
    }

    if (!res.ok) {
      log('agent-execute status', res.status)
      log('agent-execute body', parsed)
    } else {
      log('agent-execute status', res.status)
      log('agent-execute body', parsed)
    }
  } catch (err) {
    log('agent-execute call failed', err)
  }

  // Placeholder: additional work can go here (Supabase, Claude calls, etc.)
  log('cycle placeholder executed')
  log('cycle end', new Date().toISOString())
}

function startLoop() {
  // run immediately, then interval
  runCycle().catch((e) => log('cycle error', e))
  setInterval(() => {
    runCycle().catch((e) => log('cycle error', e))
  }, INTERVAL_MS)
}

function startHttpServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  server.listen(PORT, () => {
    log(`aios HTTP server listening on port ${PORT}`)
  })

  return server
}

function main() {
  log('starting AIOS skeleton')
  startHttpServer()
  startLoop()
  process.on('SIGINT', () => {
    log('shutting down')
    process.exit(0)
  })
}

main()
