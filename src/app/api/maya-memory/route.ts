import { db } from '../../../lib/db'
import fs from 'fs'
import path from 'path'

const LOCAL_STORE_DIR = path.resolve(process.cwd(), 'data')
const LOCAL_STORE_PATH = path.join(LOCAL_STORE_DIR, 'local_memory.json')

function ensureLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_STORE_DIR)) fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true })
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify({ memories: [], facts: [] }, null, 2), 'utf8')
    }
  } catch (e) {
    // ignore filesystem errors
  }
}

function appendFactLocal(p: any) {
  try {
    ensureLocalStore()
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
    const obj = JSON.parse(raw || '{}')
    obj.facts = obj.facts || []
    const row = { id: String(Date.now()), fact: p.fact, category: p.category || null, importance: p.importance || 1, source: p.source || null, created_at: new Date().toISOString() }
    obj.facts.push(row)
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
    return row
  } catch (e) {
    return null
  }
}

function scoreText(text: string, q: string): number {
  if (!q) return 1
  if (text === q) return 4
  if (text.startsWith(q + ' ') || text.startsWith(q + ',')) return 3
  if (text.startsWith(q)) return 2
  if (text.includes(q)) return 1
  return 0
}

function searchLocal(query: string, limit = 10, sessionId?: string | null) {
  try {
    ensureLocalStore()
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
    const obj = JSON.parse(raw || '{}')
    const q = (query || '').toLowerCase()

    let memories = (obj.memories || []) as any[]
    if (sessionId) {
      memories = memories.filter((m: any) => String(m.session_id || '').toLowerCase() === String(sessionId).toLowerCase())
    } else if (q) {
      memories = memories.filter((m: any) => scoreText(String(m.content || '').toLowerCase(), q) > 0)
    }
    memories = memories
      .map((m: any) => ({ ...m, _score: scoreText(String(m.content || '').toLowerCase(), q) }))
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit)

    let facts = (obj.facts || []) as any[]
    if (q) {
      facts = facts.filter((f: any) => scoreText(String(f.fact || '').toLowerCase(), q) > 0)
    }
    facts = facts
      .map((f: any) => ({ ...f, _score: scoreText(String(f.fact || '').toLowerCase(), q) }))
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit)

    return { memories, facts }
  } catch (e) {
    return { memories: [], facts: [] }
  }
}

type RememberFactPayload = {
  fact: string
  category?: string
  importance?: number
  source?: string | null
}

type WriteFilePayload = {
  path: string
  content: string
  project_name?: string | null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const tool: string = body.tool || body.action || body.name
    const payload = body.payload || body

    if (!tool) {
      return new Response(JSON.stringify({ error: 'missing tool name' }), { status: 400 })
    }

    switch (tool) {
      case 'remember_fact': {
        const p = payload as RememberFactPayload
        if (!p?.fact) {
          return new Response(JSON.stringify({ error: 'missing fact' }), { status: 400 })
        }
        try {
          await db.insert('user_facts', {
            fact: p.fact,
            category: p.category || null,
            importance: p.importance || 1,
            source: p.source || null,
          })
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: unknown) {
          // Fallback to local store
          const row = appendFactLocal(p)
          if (row) return new Response(JSON.stringify({ ok: true, data: [row], fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
        }
      }

      case 'search_memory': {
        const { query, limit = 10, sessionId } = payload as { query?: string; limit?: number; sessionId?: string | null }
        if (!query && !sessionId) {
          return new Response(JSON.stringify({ error: 'missing query or sessionId' }), { status: 400 })
        }

        const q = `%${query || ''}%`
        try {
          if (sessionId) {
            const [memRows, factRows] = await Promise.all([
              db.select('jarvis_memory', {
                filters: [{ column: 'session_id', op: 'eq', value: sessionId }],
                orderBy: { column: 'created_at', ascending: false },
                limit,
              }),
              query
                ? db.select('user_facts', {
                    filters: [{ column: 'fact', op: 'ilike', value: q }],
                    limit,
                  })
                : Promise.resolve([]),
            ])
            return new Response(JSON.stringify({ ok: true, memories: memRows, facts: factRows }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }

          const [memRows, factRows] = await Promise.all([
            db.select('jarvis_memory', {
              filters: [{ column: 'content', op: 'ilike', value: q }],
              limit,
            }),
            db.select('user_facts', {
              filters: [{ column: 'fact', op: 'ilike', value: q }],
              limit,
            }),
          ])
          return new Response(JSON.stringify({ ok: true, memories: memRows, facts: factRows }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: unknown) {
          const local = searchLocal(query || '', limit, sessionId)
          return new Response(JSON.stringify({ ok: true, memories: local.memories, facts: local.facts, fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      }

      case 'write_file': {
        const p = payload as WriteFilePayload
        if (!p?.path || !p?.content) {
          return new Response(JSON.stringify({ error: 'missing path or content' }), { status: 400 })
        }
        try {
          await db.insert('jarvis_files', {
            path: p.path,
            content: p.content,
            project_name: p.project_name || null,
          })
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: unknown) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
        }
      }

      case 'save_project': {
        const { project_name, files } = payload as { project_name?: string; files?: Array<{ path: string; content: string }> }
        if (!project_name || !Array.isArray(files) || files.length === 0) {
          return new Response(JSON.stringify({ error: 'missing project_name or files' }), { status: 400 })
        }
        try {
          const rows = files.map((f) => ({ path: f.path, content: f.content, project_name }))
          await db.insert('jarvis_files', rows)
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: unknown) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
        }
      }

      case 'save_agent_knowledge': {
        const { agent_id, skill_name, content: knowledgeContent, quality = 7 } = payload as {
          agent_id?: string; skill_name?: string; content?: string; quality?: number
        }
        if (!agent_id || !knowledgeContent) {
          return new Response(JSON.stringify({ error: 'missing agent_id or content' }), { status: 400 })
        }
        try {
          await db.insert('agent_knowledge', {
            agent_id,
            skill_name: skill_name || 'general',
            content: knowledgeContent,
            quality,
            created_at: new Date().toISOString(),
          })
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: unknown) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
        }
      }

      case 'clear_memory': {
        const { scope = 'all', sessionId: clearSessionId } = payload as { scope?: 'all' | 'history' | 'facts'; sessionId?: string }
        const errors: string[] = []

        // Clear DB tables — db adapter uses service role when available (bypasses RLS)
        try {
          if (scope === 'all' || scope === 'history') {
            const filters = clearSessionId
              ? [{ column: 'session_id', op: 'eq' as const, value: clearSessionId }]
              : []
            await db.delete('jarvis_memory', filters)
          }
          if (scope === 'all' || scope === 'facts') {
            await db.delete('user_facts', [])
          }
        } catch (e: unknown) {
          errors.push(`db: ${String(e)}`)
        }

        // Clear local JSON file (kept for resilience / offline use)
        try {
          ensureLocalStore()
          const obj: { memories: unknown[]; facts: unknown[] } = { memories: [], facts: [] }
          if (scope === 'history') {
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const existing = JSON.parse(raw || '{}') as { memories: unknown[]; facts: unknown[] }
            obj.facts = existing.facts || []
          } else if (scope === 'facts') {
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const existing = JSON.parse(raw || '{}') as { memories: unknown[]; facts: unknown[] }
            obj.memories = existing.memories || []
          }
          fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
        } catch (e: unknown) {
          errors.push(`local: ${String(e)}`)
        }

        return new Response(
          JSON.stringify({ ok: true, errors: errors.length ? errors : undefined }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(JSON.stringify({ error: `unknown tool: ${tool}` }), { status: 400 })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
