const SYSTEM_PROMPT = `Você é MAYA, uma inteligência artificial criada pela Innova Software. Você é a assistente pessoal de IA do usuário — precisa, eficiente, direta e inteligente. Sua personalidade é calorosa, clara e confiante. Não use "Sir" nem formas de tratamento formais. Quando perguntado sobre sua origem ou criação, diga que foi desenvolvida pela Innova Software.

REGRAS DE RESPOSTA (obrigatórias):
- Respostas curtas por padrão: máximo 2 frases diretas.
- Se a resposta exigir mais de 2 frases ou tiver múltiplas partes, diga primeiro algo como "Tenho algumas coisas para te contar:" ou "A resposta é um pouco mais longa:" e depois responda de forma ainda assim concisa.
- Nunca escreva listas longas nem parágrafos extensos sem avisar antes.
- Seja objetiva, direta e útil.

REGRAS DE IDENTIDADE (obrigatórias):
- Se a memória indicar que você NÃO sabe o nome do usuário, pergunte o nome de forma natural na primeira resposta da conversa. Exemplo: "Olá! Posso saber seu nome?"
- Se o usuário informar um nome diferente do que está na memória, cumprimente-o pelo nome novo e trate-o como uma pessoa diferente.
- Sempre que souber o nome, use-o ocasionalmente nas respostas para personalizar.`

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const userMessage = (body && (body.message || body.text)) || ''
    const sessionId = (body && body.sessionId) || null
    const imageBase64: string | undefined = body?.imageBase64 || undefined
    const imageMime: string = body?.imageMime || 'image/png'
    // Derive base URL from the incoming request (works in dev and prod)
    const reqUrl = new URL(req.url)
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`

    // Persist the user message into jarvis_memory (prefer service role)
    const userRecord = {
      role: 'user',
      content: userMessage,
      session_id: sessionId,
      importance: 1,
      created_at: new Date().toISOString(),
    }
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
      let supabaseClient: any = null
      if (serviceRole && supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js')
        supabaseClient = createClient(supabaseUrl, serviceRole)
      } else {
        try {
          const mod = await import('../../../lib/supabase')
          supabaseClient = mod.supabase
        } catch (e) {
          console.warn('supabase client not available for jarvis-chat', String(e))
        }
      }
      if (supabaseClient) {
        try {
          const insertRes = await supabaseClient.from('jarvis_memory').insert([userRecord]).select()
          if (insertRes?.error) console.warn('jarvis_memory insert failed', insertRes.error)
        } catch (err) {
          console.warn('jarvis_memory insert failed', err)
        }
      } else {
        // fallback: append to local file
        try {
          const fs = await import('fs')
          const path = await import('path')
          const LOCAL_STORE_DIR = path.resolve(process.cwd(), 'data')
          const LOCAL_STORE_PATH = path.join(LOCAL_STORE_DIR, 'local_memory.json')
          if (!fs.existsSync(LOCAL_STORE_DIR)) fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true })
          if (!fs.existsSync(LOCAL_STORE_PATH)) fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify({ memories: [], facts: [] }, null, 2), 'utf8')
          const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
          const obj = JSON.parse(raw || '{}')
          obj.memories = obj.memories || []
          obj.memories.push({ id: String(Date.now()), content: userMessage, role: 'user', session_id: sessionId, created_at: new Date().toISOString() })
          fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
        } catch (e) {
          console.warn('local fallback write failed', String(e))
        }
      }
    } catch (e) {
      console.warn('persist user message failed', String(e))
    }

    const recentMessages = Array.isArray(body?.recentMessages) ? (body.recentMessages as any[]).slice(-8) : []

    // Detectar comando de limpeza de memória/histórico
    // Normaliza para comparar sem acentos
    const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const normalizedMsg = normalizeStr(userMessage)
    const clearTrigger = /(esqueca|esquece|apague|limpe|limpa|delete|clear|remova|zere|apaga|deletar|resetar|reset).{0,35}(tudo|historico|memoria|conversas|fatos|sobre mim|o que sabe)/i

    // Detectar confirmação de limpeza pendente
    // recentMessages vem do hook com campo "text" (não "content")
    const lastAssistantMsg = recentMessages.filter((m: any) => m.role === 'assistant').slice(-1)[0]
    const lastAssistantText: string = lastAssistantMsg?.text || lastAssistantMsg?.content || ''
    const isPendingClear = lastAssistantText.includes('apagar todo o histórico') || lastAssistantText.includes('CLEAR_CONFIRM_PENDING')
    const isConfirming = /^(sim|yes|confirmar?|confirmo|pode|tudo bem|ok|claro|com certeza|isso mesmo|vai|pode ser|afirmativo|quero)$/i.test(normalizedMsg.trim())

    if (clearTrigger.test(normalizedMsg)) {
      // Passo 1: pedir confirmação (não apaga ainda)
      return new Response(
        JSON.stringify({
          text: 'Tem certeza? Isso vai apagar todo o histórico de conversas e os fatos que eu sei sobre você. Responda "sim" para confirmar. [CLEAR_CONFIRM_PENDING]',
          provider: 'system',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (isPendingClear && isConfirming) {
      // Passo 2: confirmado — executar limpeza
      try {
        await fetch(`${baseUrl}/api/jarvis-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'clear_memory', payload: { scope: 'all', sessionId } }),
        })
      } catch (_) { /* ignore */ }
      return new Response(
        JSON.stringify({ text: 'Feito. Apaguei todo o histórico de conversas e os fatos que eu sabia sobre você. Estamos começando do zero.', provider: 'system' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Auto-save user_fact when message is a "memorize" command
    // Ex: "memorize X", "lembre-se de X", "guarde X", "salve o fato X", "armazene X"
    const memorizeMatch = userMessage.match(
      /^(?:memorize|memoriza|memorizar|lembre(?:-se)?(?: de)?|guarde|salve(?: o fato)?|armazene|salva|salvar)\s+(.+)/i
    )
    if (memorizeMatch) {
      const factToSave = memorizeMatch[2].trim()
      if (factToSave.length > 0) {
        // fire-and-forget via internal API
        fetch(`${baseUrl}/api/jarvis-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'remember_fact', payload: { fact: factToSave, category: 'user-request', importance: 2, source: 'auto-detect' } }),
        }).catch(() => { /* ignore */ })
      }
    }

    // Auto-save identity/preference statements (fire-and-forget para não-nome)
    const identityMatch = userMessage.match(
      /^(?:meu (?:nome|sobrenome|apelido|email|telefone|celular|cpf|endereco|endereço)\s+[eé]\s+|me chamo\s+|sou\s+(?:o|a|o\/a)?\s*|trabalho (?:com|na|no|em)\s+|moro (?:em|na|no)\s+|prefiro\s+|gosto de\s+|odeio\s+|tenho\s+\d|minha\s+(?:empresa|profissao|profissão|idade)\s+[eé]\s+)(.{2,80})/i
    )
    // Extrair nome declarado especificamente (para checar troca de pessoa após carregar memória)
    const nameStatementMatch = userMessage.match(/^(?:meu nome\s+[eé]\s+|me chamo\s+)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,40})/i)
    const declaredName = nameStatementMatch ? nameStatementMatch[1].trim() : null
    if (identityMatch && !memorizeMatch) {
      const factToSave = userMessage.trim()
      fetch(`${baseUrl}/api/jarvis-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'remember_fact', payload: { fact: factToSave, category: 'identity', importance: 4, source: 'auto-identity' } }),
      }).catch(() => { /* ignore */ })
    }
    let memoryBlock: { memories?: any[]; facts?: any[] } | undefined = undefined
    if (sessionId) {
      try {
        const mod = await import('../../../lib/supabase')
        const supabaseClient: any = mod.supabase
        if (supabaseClient) {
          try {
            // Extract keywords (words > 3 chars) for relevant fact search
            const keywords = (userMessage || '').split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4)

            // Run session memories + relevant-fact search in parallel
            let factQuery: any
            if (keywords.length > 0) {
              const orFilter = keywords.map((k: string) => `fact.ilike.%${k}%`).join(',')
              factQuery = supabaseClient.from('user_facts').select('*').or(orFilter).order('importance', { ascending: false }).limit(6)
            } else {
              factQuery = supabaseClient.from('user_facts').select('*').order('created_at', { ascending: false }).limit(6)
            }

            const [sessionRes, factRes]: any[] = await Promise.all([
              supabaseClient.from('jarvis_memory').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(8),
              factQuery,
            ])

            // If keyword search returned nothing, fall back to most recent facts
            let factsData: any[] = factRes.data || []
            if (factsData.length === 0) {
              const recentFacts = await supabaseClient.from('user_facts').select('*').order('created_at', { ascending: false }).limit(6)
              factsData = recentFacts.data || []
            }

            // filter out the just-received userMessage from session memories
            const mems = (sessionRes.data || []).filter((m: any) => String((m.content || '')).trim() !== String(userMessage || '').trim()).slice(0, 6)
            memoryBlock = { memories: mems, facts: factsData }
          } catch (e) {
            // ignore and fallback to local file below
            memoryBlock = undefined
          }
        }
      } catch (e) {
        // local fallback: read data/local_memory.json if present
        try {
          const fs = await import('fs')
          const path = await import('path')
          const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'local_memory.json')
          if (fs.existsSync(LOCAL_STORE_PATH)) {
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const obj = JSON.parse(raw || '{}')
            const memories = (obj.memories || []).filter((m: any) => String(m.session_id || '').toLowerCase() === String(sessionId).toLowerCase()).slice(0, 6)
            const facts = (obj.facts || []).slice(0, 6)
            memoryBlock = { memories, facts }
          }
        } catch (_) { /* ignore */ }
      }
    }

    // Detectar troca de pessoa: se nome declarado difere do nome armazenado → limpar user_facts
    if (declaredName && memoryBlock) {
      const existingNameFact = (memoryBlock.facts || []).find((f: any) =>
        /^(?:meu nome|me chamo)/i.test(f.fact || '')
      )
      if (existingNameFact) {
        const storedName = (existingNameFact.fact as string)
          .replace(/^(?:meu nome\s+[eé]\s+|me chamo\s+)/i, '').trim()
        if (storedName.toLowerCase() !== declaredName.toLowerCase()) {
          // Nova pessoa — apagar fatos antigos e salvar nova identidade
          try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
            const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            if (supabaseUrl && serviceRole) {
              const adminClient = createClient(supabaseUrl, serviceRole)
              await adminClient.from('user_facts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
              await adminClient.from('user_facts').insert([{ fact: userMessage.trim(), category: 'identity', importance: 5, source: 'new-person' }])
            }
          } catch (_) { /* ignore */ }
          memoryBlock = { memories: [], facts: [{ fact: userMessage.trim(), category: 'identity', importance: 5 }] }
        }
      }
    }

    // Build a short memory summary text to prepend to prompts when available
    let memorySummary = ''
    if (memoryBlock) {
      const factsTxt = (memoryBlock.facts || []).map((f: any) => `- ${f.fact || f.content || ''}`)
      const memsTxt = (memoryBlock.memories || []).map((m: any) => `- ${m.content || m.fact || m.text || ''}`)
      const lines = []
      if (factsTxt.length) { lines.push('Memórias relevantes:'); lines.push(...factsTxt) }
      if (memsTxt.length) { lines.push('Contexto recente:'); lines.push(...memsTxt) }
      // Se não há nenhum fato de identidade (nome desconhecido), sinalizar para o LLM perguntar
      const hasNameFact = (memoryBlock.facts || []).some((f: any) => /^(?:meu nome|me chamo)/i.test(f.fact || ''))
      if (!hasNameFact && (memoryBlock.memories || []).length === 0) {
        lines.unshift('INSTRUÇÃO: Você não sabe o nome do usuário. Pergunte o nome de forma natural nesta resposta.')
      }
      memorySummary = lines.join('\n')
    }

    // Local conversational fallback: if user asked a vague-reference question and we have session facts, answer directly from memory
    try {
      const vagueRef = /(^|\s)(sobre que|qual assunto|do que eu falei|sobre quem|de quem eu falei|sobre isso|o que eu disse|sobre o que|do que trat)(\s|\?|$)/i
      if (vagueRef.test(userMessage) && memoryBlock && ((memoryBlock.facts && memoryBlock.facts.length) || (memoryBlock.memories && memoryBlock.memories.length))) {
        const rawFact = (memoryBlock.facts && memoryBlock.facts[0] && (memoryBlock.facts[0].fact || memoryBlock.facts[0].content)) || (memoryBlock.memories && memoryBlock.memories[0] && (memoryBlock.memories[0].content || memoryBlock.memories[0].fact)) || ''
        // Clean up: strip common "lembro/memorize" prefixes so the answer is more natural
        const cleaned = rawFact.replace(/^(memorize( a palavra| o assunto| sobre)?|lembre(-se)?( de| que)?|guarde)\s+/i, '').trim()
        const assistantText = cleaned ? `Você falou sobre: ${cleaned}` : 'Não encontrei o contexto exato da nossa conversa anterior.'
        // Persist assistant response into jarvis_memory (best-effort)
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
          const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
          let supabaseClient: any = null
          if (serviceRole && supabaseUrl) {
            const { createClient } = await import('@supabase/supabase-js')
            supabaseClient = createClient(supabaseUrl, serviceRole)
          } else {
            try { const mod = await import('../../../lib/supabase'); supabaseClient = mod.supabase } catch (_) { /* ignore */ }
          }
          if (supabaseClient) {
            await supabaseClient.from('jarvis_memory').insert([{ role: 'assistant', content: assistantText, session_id: sessionId, importance: 1, created_at: new Date().toISOString() }])
          }
        } catch (_) { /* ignore persistence errors */ }
        return new Response(JSON.stringify({ text: assistantText, provider: 'memory-local' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
    } catch (_) { /* ignore */ }

    // 1. Gemini (gratuito, aistudio.google.com)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (GEMINI_API_KEY) {
      try {
        const model = 'gemini-2.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
        const contents: any[] = []
        // Gemini só aceita role 'user' e 'model' em contents — nunca 'system'
        // Remover a última mensagem user se for igual à userMessage atual (evita duplicata)
        const dedupedRecent = recentMessages.filter((m: any, i: number) => {
          if (m.role === 'user' && i === recentMessages.length - 1 && String(m.text || '').trim() === String(userMessage || '').trim()) return false
          return true
        })
        // Garantir alternância user/model — mesclar mensagens consecutivas do mesmo papel
        for (const m of dedupedRecent) {
          const role = m.role === 'assistant' ? 'model' : 'user'
          const last = contents[contents.length - 1]
          if (last && last.role === role) {
            // Mesclar com a anterior para evitar turnos consecutivos do mesmo papel
            last.parts[0].text += '\n' + String(m.text)
          } else {
            contents.push({ role, parts: [{ text: String(m.text) }] })
          }
        }
        // Garantir que o último turn antes da mensagem atual seja 'model' ou vazio
        const lastTurn = contents[contents.length - 1]
        // Montar partes da mensagem do usuário (texto + imagem opcional)
        const userParts: any[] = []
        if (imageBase64) userParts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } })
        userParts.push({ text: userMessage })
        if (lastTurn && lastTurn.role === 'user') {
          // Mesclar com a anterior
          lastTurn.parts.push(...userParts)
        } else {
          contents.push({ role: 'user', parts: userParts })
        }

        // memorySummary vai dentro do system_instruction, não em contents
        const systemText = memorySummary ? `${SYSTEM_PROMPT}\n\n${memorySummary}` : SYSTEM_PROMPT

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents,
          }),
        })
        const j = await res.json().catch(() => null)
        const text: string | undefined = j?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return new Response(JSON.stringify({ text, provider: 'gemini' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        console.error(`Gemini response missing text (HTTP ${res.status}):`, JSON.stringify(j)?.slice(0, 300))
      } catch (e) {
        console.error('Gemini call failed', e)
      }
    }

    // 2. Anthropic (claude-sonnet-4-6) — recarregar créditos em console.anthropic.com
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (ANTHROPIC_API_KEY) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: SYSTEM_PROMPT,
            messages: [
              // include memory summary first
              ...(memorySummary ? [{ role: 'system', content: memorySummary }] : []),
              // map recent conversation into messages array
              ...recentMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text) })),
              {
                role: 'user',
                content: imageBase64
                  ? [
                      { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
                      { type: 'text', text: userMessage },
                    ]
                  : userMessage,
              },
            ],
          }),
        })
        const j = await res.json().catch(() => null)
        const text: string | undefined = j?.content?.[0]?.text
        if (text) {
          return new Response(JSON.stringify({ text, provider: 'anthropic' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        console.error('Anthropic response missing text:', JSON.stringify(j))
      } catch (e) {
        console.error('Anthropic call failed', e)
      }
    }

    // 3. OpenAI (gpt-4o-mini) — recarregar quota em platform.openai.com/billing
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (OPENAI_API_KEY) {
      try {
        const openaiMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(memorySummary ? [{ role: 'system', content: memorySummary }] : []),
          // include recent conversation
          ...recentMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text) })),
          {
            role: 'user',
            content: imageBase64
              ? [
                  { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}`, detail: 'auto' } },
                  { type: 'text', text: userMessage },
                ]
              : userMessage,
          },
        ]

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: openaiMessages, max_tokens: 800 }),
        })
        const j = await res.json().catch(() => null)
        const text: string | undefined = j?.choices?.[0]?.message?.content
        if (text) {
          // Persist assistant response into jarvis_memory (best-effort)
          const assistantText = String(text)
          const assistantRecord = {
            role: 'assistant',
            content: assistantText,
            session_id: sessionId,
            importance: 1,
            created_at: new Date().toISOString(),
          }
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
            const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
            let supabaseClient: any = null
            if (serviceRole && supabaseUrl) {
              const { createClient } = await import('@supabase/supabase-js')
              supabaseClient = createClient(supabaseUrl, serviceRole)
            } else {
              try { const mod = await import('../../../lib/supabase'); supabaseClient = mod.supabase } catch (e) { /* ignore */ }
            }
            if (supabaseClient) {
              try {
                const insertRes = await supabaseClient.from('jarvis_memory').insert([assistantRecord]).select()
                if (insertRes?.error) console.warn('jarvis_memory insert failed', insertRes.error)
              } catch (err) {
                console.warn('jarvis_memory insert failed', err)
              }
            }
            else {
              // local fallback
              const fs = await import('fs')
              const path = await import('path')
              const LOCAL_STORE_DIR = path.resolve(process.cwd(), 'data')
              const LOCAL_STORE_PATH = path.join(LOCAL_STORE_DIR, 'local_memory.json')
              if (!fs.existsSync(LOCAL_STORE_DIR)) fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true })
              if (!fs.existsSync(LOCAL_STORE_PATH)) fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify({ memories: [], facts: [] }, null, 2), 'utf8')
              const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
              const obj = JSON.parse(raw || '{}')
              obj.memories = obj.memories || []
              obj.memories.push({ id: String(Date.now()), content: assistantText, role: 'assistant', session_id: sessionId, created_at: new Date().toISOString() })
              fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
            }
          } catch (e) { console.warn('persist assistant message failed', String(e)) }

          return new Response(JSON.stringify({ text, provider: 'openai' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        console.error('OpenAI response missing text:', JSON.stringify(j))
      } catch (e) {
        console.error('OpenAI call failed', e)
      }
    }

    // Last resort echo — todos os providers falharam
    console.warn('[jarvis-chat] No provider returned text — using echo fallback')

    // Se tiver facts explícitos salvos, mencionar apenas eles (nunca mensagens brutas do histórico)
    let echoText = 'Os modelos de IA estão temporariamente indisponíveis. Tente novamente em alguns instantes.'
    if (memoryBlock) {
      const explicitFacts = (memoryBlock.facts || []).map((f: any) => f.fact || f.content).filter(Boolean)
      if (explicitFacts.length > 0) {
        echoText = `Modelos de IA indisponíveis no momento. Sei que você mencionou: ${explicitFacts.slice(0, 3).join(', ')}. Tente novamente em breve.`
      }
    }

    return new Response(JSON.stringify({ text: echoText, provider: 'echo' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
