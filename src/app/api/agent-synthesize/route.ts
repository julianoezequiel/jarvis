/**
 * /api/agent-synthesize
 * Recebe o resultado bruto de um agente (JSON estruturado ou texto longo) +
 * a pergunta original do usuário e retorna uma resposta concisa e direta.
 *
 * Isso evita que o usuário veja metadados, JSONs e estruturas internas — ele
 * recebe apenas a resposta útil para a sua pergunta.
 */

const SYNTHESIS_PROMPT = `Você é um assistente de síntese. Você recebe o resultado bruto de um agente especialista e a pergunta original do usuário.

Sua missão: analisar o conteúdo do agente e extrair APENAS a resposta direta à pergunta do usuário.

REGRAS:
- Responda DIRETAMENTE à pergunta — sem preâmbulos, sem "Com base no resultado do agente..."
- Use linguagem natural, como se você mesmo soubesse a resposta
- Seja conciso: use o mínimo de palavras necessário para uma resposta completa e útil
- Se o resultado do agente contiver múltiplas informações, filtre apenas o que responde à pergunta
- Para resultados de pesquisa (jogos, notícias, cotações, etc.): dê o fato principal primeiro, com contexto mínimo
- Para resultados de análise: dê o veredito/conclusão principal
- Para resultados de código ou arquivos: dê um resumo do que foi criado e como usar
- Para resultados com listas longas: destaque apenas os 3-5 pontos mais relevantes à pergunta
- Nunca mencione o nome do agente, JSON, campos técnicos ou estruturas internas
- Nunca invente informações que não estão no resultado do agente
- Responda em português brasileiro`

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const question: string = body?.question || body?.task || ''
    const agentResult: string = body?.agentResult || ''
    const agent: string = body?.agent || ''

    if (!question || !agentResult) {
      return Response.json({ text: agentResult }, { status: 200 })
    }

    const userContent = `PERGUNTA DO USUÁRIO: ${question}\n\nAGENTE: ${agent}\n\nRESULTADO DO AGENTE:\n${agentResult.slice(0, 12000)}`

    // Tenta Gemini Flash primeiro (rápido e barato para síntese)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (GEMINI_API_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYNTHESIS_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
          }),
        })
        const j = await res.json().catch(() => null)
        const text = j?.candidates?.[0]?.content?.parts?.[0]?.text
          || j?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text
        if (text && text.trim().length > 0) {
          return Response.json({ text: text.trim(), provider: 'gemini-synthesis' })
        }
      } catch (e) {
        console.warn('[synthesize] Gemini falhou:', e)
      }
    }

    // Fallback: Anthropic Claude
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (ANTHROPIC_KEY) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: SYNTHESIS_PROMPT,
            messages: [{ role: 'user', content: userContent }],
          }),
        })
        const j = await res.json().catch(() => null)
        const text = j?.content?.[0]?.text
        if (text && text.trim().length > 0) {
          return Response.json({ text: text.trim(), provider: 'claude-synthesis' })
        }
      } catch (e) {
        console.warn('[synthesize] Anthropic falhou:', e)
      }
    }

    // Fallback final: retorna o resultado bruto sem síntese
    return Response.json({ text: agentResult, provider: 'raw' })
  } catch (err) {
    console.error('[synthesize] erro:', err)
    return Response.json({ text: '', error: String(err) }, { status: 500 })
  }
}
