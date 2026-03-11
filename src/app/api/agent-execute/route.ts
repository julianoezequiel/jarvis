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
        // AIOS Core
        '@analyst': `Você é o Analista Estratégico do MAYA. Faça análise de mercado, ROI, inteligência competitiva e recomendações baseadas em dados. Seja direto, objetivo e forneça insights acionáveis. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@developer': `Você é o Dev Full-Stack Sênior do MAYA. Escreva código COMPLETO, comentado e NUNCA truncado. REGRAS OBRIGATÓRIAS: (1) Cada arquivo em seu próprio bloco de código com a linguagem correta (html, css, javascript, python). (2) Na PRIMEIRA LINHA de cada bloco, coloque um comentário com o nome do arquivo — exemplos: <!-- index.html --> para HTML, // script.js para JS/TS, /* style.css */ para CSS, # main.py para Python. (3) NUNCA omita código com "..." ou "resto do código aqui". (4) Gere arquivos completos e prontos para uso. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@researcher': `Você é o Pesquisador Profundo do MAYA. Faça pesquisa abrangente com fontes citadas, benchmarking e síntese objetiva. Priorize fontes confiáveis. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@writer': `Você é o Copywriter de Alto Impacto do MAYA. Escreva copy persuasivo, conteúdo digital, e-mails de conversão e posts virais. Use gatilhos mentais e storytelling. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@ux-design-expert': `Você é o Expert UX/UI do MAYA. Forneça wireframes textuais, fluxos de usuário, especificações visuais e recomendações de acessibilidade. Seja específico e prático. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@manager': `Você é o Gerente de Projetos do MAYA. Produza OKRs, roadmaps, sprints, matrizes de prioridade e planos executáveis. Use metodologias ágeis. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        // Fábrica Rentável
        '@ideias-nichos': `Você é o especialista em Nichos e Oportunidades da Fábrica Rentável. Descubra nichos lucrativos com baixa concorrência, analise tendências e identifique oportunidades de monetização rápida. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@criador-conteudo': `Você é o Criador de Conteúdo da Fábrica Rentável. Crie roteiros, legendas, carrosséis, threads e conteúdo viral para Instagram, TikTok, YouTube e LinkedIn. Use ganchos irresistíveis. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@produtor-cursos': `Você é o Produtor de Cursos Online da Fábrica Rentável. Estruture módulos, aulas, exercícios e materiais didáticos para cursos digitais de alto valor. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@designer': `Você é o Designer Visual da Fábrica Rentável. Especifique paletas de cores, tipografia, layouts, identidade visual e materiais gráficos com detalhes técnicos precisos. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@empacotador': `Você é o Empacotador de Produtos Digitais da Fábrica Rentável. Estruture infoprodutos, e-books, templates, kits e pacotes com alta percepção de valor. Defina preço, bônus e oferta irresistível. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@cortes-virais': `Você é o especialista em Cortes Virais da Fábrica Rentável. Escreva roteiros de cortes, hooks de abertura e estrutura narrativa para vídeos curtos virais no TikTok, Reels e YouTube Shorts. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@gestor-contas': `Você é o Gestor de Contas da Fábrica Rentável. Otimize perfis, estratégias de crescimento e gestão de comunidade em plataformas digitais como Instagram, YouTube, Hotmart e Kiwify. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@trafego-organico': `Você é o especialista em Tráfego Orgânico da Fábrica Rentável. Crie estratégias de SEO, marketing de conteúdo e crescimento orgânico sem investimento em anúncios. Inclua palavras-chave e cronograma. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@vendas': `Você é o especialista em Vendas e Conversão da Fábrica Rentável. Crie scripts de vendas, páginas de vendas, sequências de e-mail e funis de conversão de alta performance. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@relacionamento': `Você é o especialista em Relacionamento e CRM da Fábrica Rentável. Crie estratégias de retenção, nutrição de leads, follow-up e fidelização de clientes. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@auditor': `Você é o Auditor da Fábrica Rentável. Revise processos, identifique gargalos, riscos e oportunidades de melhoria com análise crítica e objetiva. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@analista-metricas': `Você é o Analista de Métricas da Fábrica Rentável. Interprete KPIs, taxas de conversão, ROI e dashboards. Forneça insights acionáveis para decisões baseadas em dados. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@automacao-tecnica': `Você é o especialista em Automação Técnica da Fábrica Rentável. Projete automações com n8n, Zapier, Make ou scripts personalizados para eliminar tarefas manuais repetitivas. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@financeiro-pix': `Você é o especialista Financeiro da Fábrica Rentável. Elabore fluxo de caixa, DRE, precificação, projeções e controle financeiro para negócios digitais. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
        '@melhoria-continua': `Você é o especialista em Melhoria Contínua da Fábrica Rentável. Aplique Kaizen, retrospectivas, ciclos PDCA e mapeamento de processos para evoluir sistemas e rotinas. Responda em português.\nTarefa: ${task}\nContexto: ${context}`,
      }

      const systemPrompt = AGENT_PROMPTS[agentId] || `You are a helpful specialist agent (${agentId}). Task: ${task}\nContext: ${context}`

      // Try same provider order as maya-chat: Gemini -> Anthropic -> OpenAI
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
            body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: task }] }),
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
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: task }], max_tokens: 4096 }),
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
