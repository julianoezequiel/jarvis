// TTS endpoint — fallback chain: Azure TTS → Gemini 2.5 Flash TTS → OpenAI tts-1 → 503
// Client-side (useMayaChat) uses browser SpeechSynthesis when this returns non-200

// Azure TTS — Francisca (pt-BR, Neural) — 500k chars/mês grátis
// Obter keys em: portal.azure.com → Cognitive Services → Speech
// AZURE_TTS_KEY=<sua-key>
// AZURE_TTS_REGION=eastus  (ou brazilsouth, westeurope, etc.)
async function tryAzure(text: string): Promise<Response | null> {
  const key = process.env.AZURE_TTS_KEY
  const region = process.env.AZURE_TTS_REGION || 'eastus'
  if (!key) return null

  const ssml = `<speak version='1.0' xml:lang='pt-BR'>
    <voice name='pt-BR-FranciscaNeural'>${text.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] ?? c))}</voice>
  </speak>`

  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'MayaAIOS',
      },
      body: ssml,
    })

    if (!res.ok) {
      console.warn('[maya-tts] Azure failed:', res.status, await res.text().catch(() => ''))
      return null
    }

    const buf = await res.arrayBuffer()
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(buf.byteLength), 'Cache-Control': 'no-store', 'X-TTS-Provider': 'azure-francisca' },
    })
  } catch (e) {
    console.warn('[maya-tts] Azure error:', e)
    return null
  }
}

async function tryOpenAI(text: string, voice: string): Promise<Response | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const doRequest = () => fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice, response_format: 'mp3' }),
  })

  let res = await doRequest()

  // Retry once after 800ms on rate limit
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 800))
    res = await doRequest()
  }

  if (!res.ok) {
    console.warn('[maya-tts] OpenAI failed:', res.status)
    return null
  }

  const buf = await res.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(buf.byteLength), 'Cache-Control': 'no-store', 'X-TTS-Provider': 'openai' },
  })
}

function buildWavHeader(pcmLen: number, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0);  h.writeUInt32LE(36 + pcmLen, 4);  h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16);           h.writeUInt16LE(1, 20)
  h.writeUInt16LE(channels, 22);  h.writeUInt32LE(sampleRate, 24)
  h.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28)
  h.writeUInt16LE(channels * bitDepth / 8, 32);  h.writeUInt16LE(bitDepth, 34)
  h.write('data', 36); h.writeUInt32LE(pcmLen, 40)
  return h
}

async function tryGemini(text: string): Promise<Response | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`

  // Use single voice to avoid double RPM consumption
  for (const voiceName of ['Kore']) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        console.warn('[maya-tts] Gemini HTTP', res.status, errBody.slice(0, 300))
        continue
      }

      const j = await res.json().catch(() => null)
      const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as string | undefined

      if (!b64) {
        console.warn('[maya-tts] Gemini no audio, finishReason:', j?.candidates?.[0]?.finishReason)
        continue
      }

      const pcm = Buffer.from(b64, 'base64')
      const wav = Buffer.concat([buildWavHeader(pcm.byteLength), pcm])
      return new Response(wav, {
        status: 200,
        headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(wav.byteLength), 'Cache-Control': 'no-store', 'X-TTS-Provider': `gemini-${voiceName}` },
      })
    } catch (e) {
      console.warn('[maya-tts] Gemini error:', e)
    }
  }

  return null
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json().catch(() => ({ text: '' }))
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400 })
    }

    const voice = process.env.NEXT_PUBLIC_MAYA_VOICE || 'nova'

    // 1. Azure TTS — Francisca pt-BR Neural (500k chars/mês grátis)
    const azureRes = await tryAzure(text)
    if (azureRes) return azureRes

    // 2. Try Gemini TTS first (gratuito, mas 10 RPM)
    const geminiRes = await tryGemini(text)
    if (geminiRes) return geminiRes

    // 3. Try OpenAI (with 1 retry on 429)
    const openaiRes = await tryOpenAI(text, voice)
    if (openaiRes) return openaiRes

    // 4. All failed — client will use browser SpeechSynthesis
    console.error('[maya-tts] All providers failed')
    return new Response(JSON.stringify({ error: 'All TTS providers failed' }), { status: 503 })

  } catch (err) {
    console.error('[maya-tts] unhandled error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

