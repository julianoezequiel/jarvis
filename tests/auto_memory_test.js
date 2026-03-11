/* Automated memory tests for Jarvis
 * Usage: node tests/auto_memory_test.js
 * Requires the dev server running at http://localhost:3000
 */

const fetch = global.fetch || require('node-fetch')
const { randomUUID } = require('crypto')

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function postRememberFact(sessionId, fact) {
  const res = await fetch(`${BASE}/api/jarvis-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'remember_fact', payload: { sessionId, fact, category: 'test', source: 'auto-test' } }),
  })
  return res.json().catch(() => ({ ok: false, status: res.status }))
}

async function searchMemory(sessionId, query) {
  const res = await fetch(`${BASE}/api/jarvis-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'search_memory', payload: { sessionId, query, limit: 10 } }),
  })
  return res.json().catch(() => ({ ok: false, status: res.status }))
}

async function run() {
  console.log('BASE URL:', BASE)
  const sessionId = randomUUID ? randomUUID() : ('s-' + Math.random().toString(36).slice(2,10))
  console.log('Using sessionId:', sessionId)

  console.log('\n[1] Posting remember_fact("futebol")')
  const r1 = await postRememberFact(sessionId, 'futebol')
  console.log('remember_fact response:', r1)

  console.log('\n[2] Searching memory for "futebol" (session-scoped)')
  const r2 = await searchMemory(sessionId, 'futebol')
  console.log('search_memory response:', JSON.stringify(r2, null, 2))

  // Accept either 'memories' or 'facts' results from the memory endpoint
  const foundInMemories = r2 && Array.isArray(r2.memories) && r2.memories.some(m => ((m.content || m.fact || '') + '').toLowerCase().includes('futebol'))
  const foundInFacts = r2 && Array.isArray(r2.facts) && r2.facts.some(f => ((f.content || f.fact || '') + '').toLowerCase().includes('futebol'))
  const found = !!(foundInMemories || foundInFacts)
  if (found) {
    console.log('\n✅ Test PASSED: memory found for "futebol"')
    process.exit(0)
  } else {
    console.error('\n❌ Test FAILED: memory not found. If server is offline, start dev server and retry.')
    process.exit(2)
  }
}

run().catch(err => { console.error('Test runner error:', err); process.exit(3) })
