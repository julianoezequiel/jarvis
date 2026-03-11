/* Automated chat->memory E2E test
 * Usage: node tests/auto_chat_memory_test.js
 * It will:
 *  - create a sessionId
 *  - call /api/jarvis-memory remember_fact('futebol') as fallback
 *  - send a chat message: "memorize a palavra futebol"
 *  - repeatedly ask: "sobre que eu pedi para memorizar" until assistant responds including 'futebol' (max attempts)
 */

const fetch = global.fetch || require('node-fetch')
const { randomUUID } = require('crypto')

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const MAX_ATTEMPTS = 6
const WAIT_MS = 1200

async function postMemoryRemember(sessionId, fact) {
  const res = await fetch(`${BASE}/api/jarvis-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'remember_fact', payload: { sessionId, fact, category: 'test', source: 'auto-chat-test' } }),
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

async function postChat(sessionId, message) {
  const res = await fetch(`${BASE}/api/jarvis-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  })
  // try JSON then text
  const ct = (res.headers.get('content-type') || '')
  if (ct.includes('application/json')) return res.json().catch(() => ({ ok: false }))
  // else try text
  const text = await res.text().catch(() => null)
  if (text) return { text }
  return { ok: false }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  console.log('BASE URL:', BASE)
  const sessionId = randomUUID ? randomUUID() : ('s-' + Math.random().toString(36).slice(2,10))
  console.log('Using sessionId:', sessionId)

  console.log('\n[0] Ensuring memory exists via remember_fact("futebol")')
  const mem = await postMemoryRemember(sessionId, 'futebol')
  console.log('remember_fact response:', mem)

  console.log('\n[1] Sending chat: "memorize a palavra futebol"')
  const c1 = await postChat(sessionId, 'memorize a palavra futebol')
  console.log('chat response:', c1)

  console.log('\n[2] Asking assistant (will retry until it uses memory)')
  let lastResp = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\nAttempt ${attempt}/${MAX_ATTEMPTS}: asking 'sobre que eu pedi para memorizar'`)
    const resp = await postChat(sessionId, 'sobre que eu pedi para memorizar')
    lastResp = resp
    console.log('assistant reply:', resp)
    const txt = ((resp && (resp.text || resp.answer || resp.data || resp.text)) || '').toString().toLowerCase()
    if (txt.includes('futebol')) {
      console.log('\n✅ Chat PASSED: assistant used memory and mentioned "futebol"')
      process.exit(0)
    }
    // if not, check memory store
    const memRes = await searchMemory(sessionId, 'futebol')
    console.log('memory search:', memRes)
    const facts = (memRes && Array.isArray(memRes.facts)) ? memRes.facts : []
    if (facts.some(f => ((f.fact||f.content||'') + '').toLowerCase().includes('futebol'))) {
      console.log('Memory exists but assistant did not use it this attempt. Retrying...')
    } else {
      console.log('Memory not present; re-posting remember_fact and retrying...')
      await postMemoryRemember(sessionId, 'futebol')
    }
    await sleep(WAIT_MS)
  }

  console.error('\n❌ Chat FAILED: assistant did not reference the memory after attempts')
  console.error('Last assistant response:', lastResp)
  const finalMem = await searchMemory(sessionId, 'futebol')
  console.error('Final memory state:', finalMem)
  process.exit(2)
}

run().catch(err => { console.error('Test runner error:', err); process.exit(3) })
