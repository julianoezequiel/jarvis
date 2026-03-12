const SYSTEM_PROMPT = `Você é MAYA, uma inteligência artificial criada pela Innova Software. Você é a assistente pessoal de IA do usuário — precisa, eficiente, direta e inteligente. Sua personalidade é calorosa, clara e confiante. Não use "Sir" nem formas de tratamento formais. Quando perguntado sobre sua origem ou criação, diga que foi desenvolvida pela Innova Software.

REGRAS DE RESPOSTA:
- Seja objetiva e direta. Prefira respostas concisas quando a pergunta for simples.
- Para respostas longas ou com múltiplas partes, escreva normalmente — sem aviso prévio necessário.
- Use listas e parágrafos quando fizer sentido para a clareza da resposta.

REGRAS DE IDENTIDADE (obrigatórias):
- Se a memória indicar que você NÃO sabe o nome do usuário, pergunte o nome de forma natural na primeira resposta da conversa. Exemplo: "Olá! Posso saber seu nome?"
- Se o usuário informar um nome diferente do que está na memória, cumprimente-o pelo nome novo e trate-o como uma pessoa diferente.
- Converse naturalmente sem mencionar o nome da pessoa. Use o nome APENAS em momentos específicos: saudação inicial, quando quiser dar ênfase em algo importante, ou quando a situação pedir um toque mais pessoal. Evite começar respostas com o nome — isso soa mecânico e irritante.

DELEGAÇÃO DE AGENTES — REGRA CRÍTICA:
Sempre que o usuário pedir algo que envolva criação, análise, pesquisa, desenvolvimento, design, vendas, marketing ou qualquer tarefa especializada, você DEVE obrigatoriamente:
1. Responder brevemente em linguagem natural (máx 1 frase).
2. Logo após, inserir LITERALMENTE os blocos [DELEGATE] no texto da resposta — não descreva que vai delegar, FAÇA usando o protocolo exato:
[DELEGATE: {"agent":"@analyst","task":"descrição clara da tarefa","context":"contexto relevante","priority":"high"}]

REGRAS OBRIGATÓRIAS PARA OS CAMPOS DO DELEGATE:
- "task": descreva a tarefa de forma completa e específica. Inclua exatamente o que o usuário pediu. Exemplo: se o usuário disse "quero uma landing page para vender meu curso de inglês para iniciantes", o task deve ser "Criar landing page de vendas para curso de inglês para iniciantes".
- "context": SEMPRE copie aqui a mensagem exata do usuário + qualquer contexto adicional relevante da conversa. O agente não tem acesso ao histórico — o "context" é a única informação que ele recebe além do task.
- "priority": "high" para pedidos urgentes/principais, "normal" para tarefas de suporte.

CAMPO "delivery" NO DELEGATE — OBRIGATÓRIO:
Sempre inclua o campo "delivery" em cada bloco DELEGATE:
- "delivery":"chat" → resultado é exibido diretamente no chat (padrão para pesquisa, análise, textos curtos, resultados que o usuário quer ver na conversa)
- "delivery":"file" → resultado é salvo como arquivo para download (use quando o usuário pedir explicitamente para baixar, salvar, ou quando for código de projeto completo)
Exemplos:
- Usuário pede "pesquise o resultado do jogo" → delivery:"chat"
- Usuário pede "crie uma página HTML" sem mencionar download → delivery:"chat"
- Usuário pede "me retorne no chat" → delivery:"chat"
- Usuário pede "salve como arquivo", "quero o download", "me manda o arquivo" → delivery:"file"
- Usuário pede projeto completo com múltiplos arquivos → delivery:"file"
Quando em dúvida: use delivery:"chat".

IMPORTANTE: os blocos [DELEGATE: {...}] são processados automaticamente pelo sistema. Nunca explique que delegou — apenas insira os blocos. Múltiplos blocos simultâneos são suportados e incentivados.
Não delegue para perguntas simples como saudações, horário, ou conversas casuais.
Agentes disponíveis:
- @analyst (análise estratégica, ROI, mercado)
- @developer (código TypeScript/Node.js/Python/React)
- @researcher (pesquisa profunda com fontes)
- @writer (copywriting, conteúdo, posts virais)
- @ux-design-expert (UX/UI, wireframes, fluxos)
- @manager (OKRs, roadmaps, sprints)
- @ideias-nichos (nichos e oportunidades de mercado)
- @criador-conteudo (conteúdo para redes sociais)
- @produtor-cursos (estrutura de cursos online)
- @designer (identidade visual, design gráfico)
- @empacotador (produtos digitais, infoprodutos)
- @cortes-virais (roteiros e cortes de vídeo viral)
- @gestor-contas (gestão de contas em plataformas)
- @trafego-organico (SEO, crescimento sem anúncios)
- @vendas (scripts de vendas, funis, conversão)
- @relacionamento (CRM, retenção, fidelização)
- @auditor (auditoria de processos, riscos)
- @analista-metricas (KPIs, dashboards, ROI)
- @automacao-tecnica (n8n, Zapier, Make, scripts)
- @financeiro-pix (fluxo de caixa, DRE, precificação)
- @melhoria-continua (Kaizen, PDCA, retrospectivas)`

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

    // Persist the user message into jarvis_memory (best-effort)
    const userRecord = {
      role: 'user',
      content: userMessage,
      session_id: sessionId,
      importance: 1,
      created_at: new Date().toISOString(),
    }
    try {
      const { db } = await import('../../../lib/db')
      await db.insert('jarvis_memory', userRecord)
    } catch (_err) {
      // best-effort: fallback to local file
      try {
        const fs = await import('fs')
        const pathMod = await import('path')
        const LOCAL_STORE_DIR = pathMod.resolve(process.cwd(), 'data')
        const LOCAL_STORE_PATH = pathMod.join(LOCAL_STORE_DIR, 'local_memory.json')
        if (!fs.existsSync(LOCAL_STORE_DIR)) fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true })
        if (!fs.existsSync(LOCAL_STORE_PATH)) fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify({ memories: [], facts: [] }, null, 2), 'utf8')
        const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
        const obj = JSON.parse(raw || '{}') as { memories: unknown[] }
        obj.memories = obj.memories || []
        obj.memories.push({ id: String(Date.now()), ...userRecord })
        fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
      } catch (_localErr) { /* ignore */ }
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
        await fetch(`${baseUrl}/api/maya-memory`, {
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
        fetch(`${baseUrl}/api/maya-memory`, {
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
      fetch(`${baseUrl}/api/maya-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'remember_fact', payload: { fact: factToSave, category: 'identity', importance: 4, source: 'auto-identity' } }),
      }).catch(() => { /* ignore */ })
    }
    let memoryBlock: { memories?: unknown[]; facts?: unknown[] } | undefined = undefined
    if (sessionId) {
      try {
        const { db } = await import('../../../lib/db')
        // Extract keywords (words > 3 chars) for relevant fact search
        const keywords = (userMessage || '').split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4)

        const factSelectOptions = keywords.length > 0
          ? {
              orFilters: keywords.map((k: string) => ({ column: 'fact', op: 'ilike' as const, value: `%${k}%` })),
              orderBy: { column: 'importance', ascending: false },
              limit: 6,
            }
          : { orderBy: { column: 'created_at', ascending: false }, limit: 6 }

        const [sessionRows, factRows] = await Promise.all([
          db.select('jarvis_memory', {
            filters: [{ column: 'session_id', op: 'eq', value: sessionId }],
            orderBy: { column: 'created_at', ascending: false },
            limit: 8,
          }),
          db.select('user_facts', factSelectOptions),
        ])

        let factsData = factRows
        if (factsData.length === 0) {
          factsData = await db.select('user_facts', { orderBy: { column: 'created_at', ascending: false }, limit: 6 })
        }

        // filter out the just-received userMessage from session memories
        const mems = sessionRows
          .filter((m: unknown) => String(((m as Record<string, unknown>).content || '')).trim() !== String(userMessage || '').trim())
          .slice(0, 6)
        memoryBlock = { memories: mems, facts: factsData }
      } catch (_dbErr) {
        // local fallback: read data/local_memory.json if present
        try {
          const fs = await import('fs')
          const pathMod = await import('path')
          const LOCAL_STORE_PATH = pathMod.join(process.cwd(), 'data', 'local_memory.json')
          if (fs.existsSync(LOCAL_STORE_PATH)) {
            const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
            const obj = JSON.parse(raw || '{}') as { memories: unknown[]; facts: unknown[] }
            const memories = (obj.memories || []).filter((m: unknown) => String(((m as Record<string, unknown>).session_id || '')).toLowerCase() === String(sessionId).toLowerCase()).slice(0, 6)
            const facts = (obj.facts || []).slice(0, 6)
            memoryBlock = { memories, facts }
          }
        } catch (_) { /* ignore */ }
      }
    }

    // Detectar troca de pessoa: se nome declarado difere do nome armazenado → limpar user_facts
    if (declaredName && memoryBlock) {
      const existingNameFact = (memoryBlock.facts || []).find((f) =>
        /^(?:meu nome|me chamo)/i.test((f as Record<string, unknown>).fact as string || '')
      ) as Record<string, unknown> | undefined
      if (existingNameFact) {
        const storedName = (existingNameFact.fact as string)
          .replace(/^(?:meu nome\s+[eé]\s+|me chamo\s+)/i, '').trim()
        if (storedName.toLowerCase() !== declaredName.toLowerCase()) {
          // Nova pessoa — apagar fatos antigos e salvar nova identidade
          try {
            const { db } = await import('../../../lib/db')
            await db.delete('user_facts', [])
            await db.insert('user_facts', { fact: userMessage.trim(), category: 'identity', importance: 5, source: 'new-person' })
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
        const f0 = memoryBlock.facts && memoryBlock.facts[0] as Record<string, unknown> | undefined
        const m0 = memoryBlock.memories && memoryBlock.memories[0] as Record<string, unknown> | undefined
        const rawFact = (f0 && (String(f0.fact ?? '') || String(f0.content ?? ''))) || (m0 && (String(m0.content ?? '') || String(m0.fact ?? ''))) || ''
        // Clean up: strip common "lembro/memorize" prefixes so the answer is more natural
        const cleaned = rawFact.replace(/^(memorize( a palavra| o assunto| sobre)?|lembre(-se)?( de| que)?|guarde)\s+/i, '').trim()
        const assistantText = cleaned ? `Você falou sobre: ${cleaned}` : 'Não encontrei o contexto exato da nossa conversa anterior.'
        // Persist assistant response into jarvis_memory (best-effort)
        try {
          const { db } = await import('../../../lib/db')
          await db.insert('jarvis_memory', { role: 'assistant', content: assistantText, session_id: sessionId, importance: 1, created_at: new Date().toISOString() })
        } catch (_) { /* ignore persistence errors */ }
        return new Response(JSON.stringify({ text: assistantText, provider: 'memory-local' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
    } catch (_) { /* ignore */ }

    // 1. Gemini — tenta primeiro a key gratuita, cai para a paga se cota esgotada (HTTP 429 / RESOURCE_EXHAUSTED)
    const GEMINI_FREE_KEY = process.env.GEMINI_API_KEY_FREE
    const GEMINI_PAID_KEY = process.env.GEMINI_API_KEY  // chave paga (fallback)

    // Helper: monta contents para Gemini (fora do try para reutilizar)
    const buildGeminiContents = () => {
      const contents: any[] = []
      const dedupedRecent = recentMessages.filter((m: any, i: number) => {
        if (m.role === 'user' && i === recentMessages.length - 1 && String(m.text || '').trim() === String(userMessage || '').trim()) return false
        return true
      })
      for (const m of dedupedRecent) {
        const role = m.role === 'assistant' ? 'model' : 'user'
        const last = contents[contents.length - 1]
        if (last && last.role === role) {
          last.parts[0].text += '\n' + String(m.text)
        } else {
          contents.push({ role, parts: [{ text: String(m.text) }] })
        }
      }
      const lastTurn = contents[contents.length - 1]
      const userParts: any[] = []
      if (imageBase64) userParts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } })
      userParts.push({ text: userMessage })
      if (lastTurn && lastTurn.role === 'user') {
        lastTurn.parts.push(...userParts)
      } else {
        contents.push({ role: 'user', parts: userParts })
      }
      return contents
    }

    const callGemini = async (apiKey: string): Promise<{ text?: string; quotaExceeded?: boolean }> => {
      try {
        const model = 'gemini-2.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const systemText = memorySummary ? `${SYSTEM_PROMPT}\n\n${memorySummary}` : SYSTEM_PROMPT
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents: buildGeminiContents(),
          }),
        })
        const j = await res.json().catch(() => null)
        // Detecta cota esgotada: HTTP 429 ou status RESOURCE_EXHAUSTED
        const isQuota = res.status === 429 || j?.error?.status === 'RESOURCE_EXHAUSTED'
        if (isQuota) {
          console.warn(`[maya-chat] Gemini quota exceeded for key ...${apiKey.slice(-6)}`)
          return { quotaExceeded: true }
        }
        const text: string | undefined = j?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return { text }
        console.error(`[maya-chat] Gemini missing text (HTTP ${res.status}):`, JSON.stringify(j)?.slice(0, 300))
        return {}
      } catch (e) {
        console.error('[maya-chat] Gemini call failed:', e)
        return {}
      }
    }

    if (GEMINI_FREE_KEY || GEMINI_PAID_KEY) {
      // Tenta key gratuita primeiro
      if (GEMINI_FREE_KEY) {
        const { text, quotaExceeded } = await callGemini(GEMINI_FREE_KEY)
        if (text) {
          return new Response(JSON.stringify({ text, provider: 'gemini' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        }
        // Só tenta paga se foi realmente quota esgotada — outros erros passam para o próximo LLM
        if (quotaExceeded && GEMINI_PAID_KEY) {
          console.warn('[maya-chat] Free Gemini quota exhausted — switching to paid key')
          const { text: paidText } = await callGemini(GEMINI_PAID_KEY)
          if (paidText) {
            return new Response(JSON.stringify({ text: paidText, provider: 'gemini-paid' }), {
              status: 200, headers: { 'Content-Type': 'application/json' },
            })
          }
        }
      } else if (GEMINI_PAID_KEY) {
        // Sem key gratuita: usa paga diretamente (comportamento legado)
        const { text } = await callGemini(GEMINI_PAID_KEY)
        if (text) {
          return new Response(JSON.stringify({ text, provider: 'gemini-paid' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        }
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
            const { db } = await import('../../../lib/db')
            await db.insert('jarvis_memory', assistantRecord)
          } catch (_dbErr) {
            // local fallback
            try {
              const fs = await import('fs')
              const pathMod = await import('path')
              const LOCAL_STORE_DIR = pathMod.resolve(process.cwd(), 'data')
              const LOCAL_STORE_PATH = pathMod.join(LOCAL_STORE_DIR, 'local_memory.json')
              if (!fs.existsSync(LOCAL_STORE_DIR)) fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true })
              if (!fs.existsSync(LOCAL_STORE_PATH)) fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify({ memories: [], facts: [] }, null, 2), 'utf8')
              const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8')
              const obj = JSON.parse(raw || '{}') as { memories: unknown[] }
              obj.memories = obj.memories || []
              obj.memories.push({ id: String(Date.now()), content: assistantText, role: 'assistant', session_id: sessionId, created_at: new Date().toISOString() })
              fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8')
            } catch (_) { /* ignore */ }
          }

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
    console.warn('[maya-chat] No provider returned text — using echo fallback')

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
