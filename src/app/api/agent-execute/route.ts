export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const record = {
      role: 'agent',
      content: typeof body === 'string' ? body : JSON.stringify(body),
      session_id: (body && body.sessionId) || null,
      importance: body && body.priority === 'high' ? 5 : 1,
      created_at: new Date().toISOString(),
    }

    // Try to write to Supabase if available. Prefer a server-side service role key
    // when present (do NOT expose this key to the client). If not available,
    // fall back to the client/anon key client from `lib/supabase`.
    let saved = null
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''

      let supabaseClient: any = null
      if (serviceRole && supabaseUrl) {
        // create a server-side client with elevated privileges for writes
        const { createClient } = await import('@supabase/supabase-js')
        supabaseClient = createClient(supabaseUrl, serviceRole)
      } else {
        // dynamic import of the existing public client wrapper
        try {
          const mod = await import('../../../lib/supabase')
          supabaseClient = mod.supabase
        } catch (e) {
          console.warn('supabase client not available', String(e))
        }
      }

      if (supabaseClient) {
        const { data, error } = await supabaseClient.from('jarvis_memory').insert([record]).select().limit(1)
        if (error) {
          console.warn('supabase insert error', error)
        } else {
          saved = data && data[0]
        }
      }
    } catch (e) {
      console.warn('supabase not available or insert failed', String(e))
    }

    const response = {
      agent: (body && body.agent) || 'unknown',
      status: 'accepted',
      saved: !!saved,
      savedRecord: saved,
      received: body,
    }

    // If a task was provided, attempt to run the agent by invoking LLM providers
    const agentId = (body && body.agent) || 'unknown'
    const task = (body && (body.task || body.prompt || body.message)) || ''
    const context = (body && body.context) || ''

    if (task) {
      // Small built-in system prompts for core agents. Keep concise — UI may extend.
      const AGENT_PROMPTS: Record<string, string> = {
        '@analyst': `You are an Analyst. Provide strategic analysis, competitor insights, and concise recommendations. Task: ${task}\nContext: ${context}`,
        '@developer': `You are a Senior Full-Stack Developer. Provide code-level instructions, steps, and minimal code snippets when needed. Task: ${task}\nContext: ${context}`,
        '@researcher': `You are a Researcher. Provide sourced research, references, and a short summary. Task: ${task}\nContext: ${context}`,
        '@writer': `You are a Copywriter. Produce high-impact concise copy, subject lines, and short drafts. Task: ${task}\nContext: ${context}`,
        '@ux-design-expert': `You are a UX expert. Provide wireframe ideas, user flows, and accessibility tips. Task: ${task}\nContext: ${context}`,
        '@manager': `You are a Project Manager. Produce roadmap steps, priorities, and acceptance criteria. Task: ${task}\nContext: ${context}`,
      }

      const systemPrompt = AGENT_PROMPTS[agentId] || `You are a helpful specialist agent (${agentId}). Task: ${task}\nContext: ${context}`

      // Try same provider order as jarvis-chat: Gemini -> Anthropic -> OpenAI
      // 1) Gemini
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY
      if (GEMINI_API_KEY) {
        try {
          const model = 'gemini-2.5-flash'
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: task }] }] }),
          })
          const j = await res.json().catch(() => null)
          const text: string | undefined = j?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            return new Response(JSON.stringify({ text, provider: 'gemini', agent: agentId, saved: !!saved }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }
          console.error('Gemini agent response missing text:', JSON.stringify(j))
        } catch (e) {
          console.error('Gemini agent call failed', e)
        }
      }

      // 2) Anthropic
      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
      if (ANTHROPIC_API_KEY) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: [{ role: 'user', content: task }] }),
          })
          const j = await res.json().catch(() => null)
          const text: string | undefined = j?.content?.[0]?.text
          if (text) {
            return new Response(JSON.stringify({ text, provider: 'anthropic', agent: agentId, saved: !!saved }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }
          console.error('Anthropic agent response missing text:', JSON.stringify(j))
        } catch (e) {
          console.error('Anthropic agent call failed', e)
        }
      }

      // 3) OpenAI
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY
      if (OPENAI_API_KEY) {
        try {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: task }], max_tokens: 800 }),
          })
          const j = await res.json().catch(() => null)
          const text: string | undefined = j?.choices?.[0]?.message?.content
          if (text) {
            return new Response(JSON.stringify({ text, provider: 'openai', agent: agentId, saved: !!saved }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }
          console.error('OpenAI agent response missing text:', JSON.stringify(j))
        } catch (e) {
          console.error('OpenAI agent call failed', e)
        }
      }

      // fallback
      return new Response(JSON.stringify({ text: `Agent ${agentId} accepted task but no provider available.`, provider: 'echo', agent: agentId, saved: !!saved }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
