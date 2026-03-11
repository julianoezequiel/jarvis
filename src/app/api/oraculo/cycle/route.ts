/**
 * /api/oraculo/cycle/route.ts
 * Rota acionada a cada 6h pelo cron do vercel.json.
 * Executa pesquisa autônoma sobre tópicos de interesse,
 * salva os resultados em oraculo_knowledge.
 */

const ORACULO_TOPICS = [
  'tendências em inteligência artificial e LLMs',
  'oportunidades de negócios digitais em 2026',
  'marketing digital e estratégias de crescimento',
  'ferramentas de automação e produtividade',
  'tendências em criação de conteúdo e plataformas digitais',
  'finanças pessoais e investimentos para empreendedores',
]

export async function POST(req: Request) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }), { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
    let supabaseClient: any = null
    if (serviceRole && supabaseUrl) {
      const { createClient } = await import('@supabase/supabase-js')
      supabaseClient = createClient(supabaseUrl, serviceRole)
    } else {
      try {
        const mod = await import('../../../../lib/supabase')
        supabaseClient = mod.supabase
      } catch (_) {}
    }

    const results: { topic: string; content: string; quality: number }[] = []

    // Pesquisa em paralelo para todos os tópicos
    await Promise.all(
      ORACULO_TOPICS.map(async (topic) => {
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
              max_tokens: 600,
              system: `Você é o ORÁCULO do JARVIS — um pesquisador autônomo que mantém o usuário informado sobre tendências relevantes. 
Sua missão: pesquisar e sintetizar informações atualizadas sobre o tópico dado.
Regras:
- Forneça uma síntese objetiva e acionável (máx 400 palavras)
- Inclua 2-3 insights práticos que o usuário pode aplicar
- Mencione tendências emergentes quando relevante
- Seja direto e objetivo
- Responda em português`,
              messages: [
                {
                  role: 'user',
                  content: `Pesquise e sintetize as informações mais relevantes e atuais sobre: ${topic}`,
                },
              ],
            }),
          })
          const j = await res.json().catch(() => null)
          const content: string = j?.content?.[0]?.text
          if (content) {
            const quality = Math.min(10, Math.max(1, Math.round(content.length / 60)))
            results.push({ topic, content, quality })
          }
        } catch (e) {
          console.error(`[oraculo] falha no tópico "${topic}":`, e)
        }
      })
    )

    // Persiste os resultados no Supabase
    let savedCount = 0
    if (supabaseClient && results.length > 0) {
      const rows = results.map((r) => ({
        topic: r.topic,
        content: r.content,
        source: 'oraculo-cycle',
        quality: r.quality,
        created_at: new Date().toISOString(),
      }))
      const { error } = await supabaseClient.from('oraculo_knowledge').insert(rows)
      if (error) {
        console.error('[oraculo] erro ao salvar no Supabase:', error)
      } else {
        savedCount = rows.length
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        topics_processed: results.length,
        saved: savedCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[oraculo] erro no ciclo:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

// Permite GET para healthcheck manual
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'oráculo online', next_topics: ORACULO_TOPICS.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
