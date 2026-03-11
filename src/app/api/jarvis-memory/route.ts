import { supabase, saveJarvisFile } from '../../../lib/supabase'
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
          const { data, error } = await supabase.from('user_facts').insert([
            { fact: p.fact, category: p.category || null, importance: p.importance || 1, source: p.source || null }
          ])
          if (error) {
            // Fallback to local store
            const row = appendFactLocal(p)
            if (row) return new Response(JSON.stringify({ ok: true, data: [row], fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            return new Response(JSON.stringify({ error: error.message }), { status: 500 })
          }
          return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e: any) {
          // Supabase client failed — write locally
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

        // If sessionId provided, prefer returning recent session-scoped memories (helps conversational recall)
        try {
          if (sessionId) {
            const sessionRes = await supabase.from('jarvis_memory').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(limit)
            if (!sessionRes.error) {
              // still search facts by query if query provided
              let factRes: any = { data: [], error: null }
              if (query) {
                const q = `%${query}%`
                factRes = await supabase.from('user_facts').select('*').ilike('fact', q).limit(limit)
              }
              if (sessionRes.error || factRes.error) {
                const local = searchLocal(query || '', limit, sessionId)
                return new Response(JSON.stringify({ ok: true, memories: local.memories, facts: local.facts, fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
              }
              return new Response(JSON.stringify({ ok: true, memories: sessionRes.data || [], facts: (factRes.data || []) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            }
          }

          // Fallback: perform text search across memories and facts
          const q = `%${query || ''}%`
          const [memRes, factRes] = await Promise.all([
            supabase.from('jarvis_memory').select('*').ilike('content', q).limit(limit),
            supabase.from('user_facts').select('*').ilike('fact', q).limit(limit)
          ])

          if (memRes.error || factRes.error) {
            const local = searchLocal(query || '', limit, sessionId)
            return new Response(JSON.stringify({ ok: true, memories: local.memories, facts: local.facts, fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }

          return new Response(JSON.stringify({ ok: true, memories: memRes.data || [], facts: factRes.data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch (e) {
          const local = searchLocal(query || '', limit, sessionId)
          return new Response(JSON.stringify({ ok: true, memories: local.memories, facts: local.facts, fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      }

      case 'write_file': {
        const p = payload as WriteFilePayload
        if (!p?.path || !p?.content) {
          return new Response(JSON.stringify({ error: 'missing path or content' }), { status: 400 })
        }
        const res = await saveJarvisFile(p.path, p.content, p.project_name || undefined)
        if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 500 })
        return new Response(JSON.stringify({ ok: true, data: res.data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      case 'save_project': {
        const { project_name, files } = payload as { project_name?: string; files?: Array<{ path: string; content: string }> }
        if (!project_name || !Array.isArray(files) || files.length === 0) {
          return new Response(JSON.stringify({ error: 'missing project_name or files' }), { status: 400 })
        }
        const rows = files.map((f) => ({ path: f.path, content: f.content, project_name }))
        const { data, error } = await supabase.from('jarvis_files').insert(rows)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      case 'clear_memory': {
        const { scope = 'all', sessionId: clearSessionId } = payload as { scope?: 'all' | 'history' | 'facts'; sessionId?: string }
        let errors: string[] = []

        // Clear Supabase tables — usa service role para garantir que o DELETE passa pelo RLS
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
          const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
          const adminClient = serviceRole
            ? createClient(supabaseUrl, serviceRole)
            : supabase // fallback para anon key se não houver service role

          if (scope === 'all' || scope === 'history') {
            const q = clearSessionId
              ? adminClient.from('jarvis_memory').delete().eq('session_id', clearSessionId)
              : adminClient.from('jarvis_memory').delete().neq('id', '00000000-0000-0000-0000-000000000000')
            const res = await q
            if (res.error) errors.push(`jarvis_memory: ${res.error.message}`)
          }
          if (scope === 'all' || scope === 'facts') {
            const res = await adminClient.from('user_facts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
            if (res.error) errors.push(`user_facts: ${res.error.message}`)
          }
        } catch (e) {
          errors.push(`supabase: ${String(e)}`)
        }

        // Clear local JSON file
        try {
          ensureLocalStore()
          const obj: { memories: any[]; facts: any[] } = { memories: [], facts: [] }
          if (scope === 'history') {
            // keep facts, only clear memories
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const existing = JSON.parse(raw || '{}')
            obj.facts = existing.facts || []
          } else if (scope === 'facts') {
            // keep memories, only clear facts
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const existing = JSON.parse(raw || '{}')
            obj.memories = existing.memories || []
          }
          fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
        } catch (e) {
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
