// TTS endpoint — fallback chain: EdgeTTS (free) → Azure TTS → Gemini 2.5 Flash TTS → OpenAI tts-1 → 503
// Client-side (useMayaChat) uses browser SpeechSynthesis when this returns non-200

// ─── EdgeTTS — FREE — Microsoft Edge Read Aloud API ──────────────────────────
// Mesma voz Neural pt-BR-FranciscaNeural do Azure, sem chave de API.
// Usa o serviço gratuito do Microsoft Edge (server-side only — não funciona no browser).
// Instalar: npm install msedge-tts
async function tryEdgeTTS(text: string): Promise<Response | null> {
  try {
    // Sanitize XML special characters (msedge-tts injeta o texto em SSML <prosody>)
    const escaped = text.replace(/[<>&'"]/g, c =>
      ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[c] ?? c)
    )

    // Dynamic import para evitar problemas de bundling no Vercel
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts')

    const tts = new MsEdgeTTS()
    await tts.setMetadata('pt-BR-FranciscaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

    const { audioStream } = tts.toStream(escaped)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk))
      audioStream.on('close', () => resolve())
      audioStream.on('error', (e: Error) => reject(e))
    })

    const buf = Buffer.concat(chunks)
    if (buf.byteLength === 0) {
      console.warn('[maya-tts] EdgeTTS returned empty audio')
      return null
    }

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'no-store',
        'X-TTS-Provider': 'edge-francisca',
      },
    })
  } catch (e) {
    console.warn('[maya-tts] EdgeTTS error:', e)
    return null
  }
}

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

async function tryGemini(text: string, voiceParam?: string): Promise<Response | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`

  for (const voiceName of [voiceParam || 'Kore']) {
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
    const { text, provider, voice } = await req.json().catch(() => ({ text: '', provider: undefined, voice: undefined }))
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400 })
    }

    const resolvedVoice = voice || process.env.NEXT_PUBLIC_MAYA_VOICE || 'nova'

    // If a specific provider is requested, use only that one (no cascade)
    if (provider === 'edge') {
      const r = await tryEdgeTTS(text)
      if (r) return r
    }
    if (provider === 'azure') {
      const r = await tryAzure(text)
      if (r) return r
    }
    if (provider === 'gemini') {
      const r = await tryGemini(text, resolvedVoice)
      if (r) return r
    }
    if (provider === 'openai') {
      const r = await tryOpenAI(text, resolvedVoice)
      if (r) return r
    }

    // No provider specified (or requested provider failed) — run default cascade
    // 1. Edge TTS — FREE — no API key needed
    const edgeRes = await tryEdgeTTS(text)
    if (edgeRes) return edgeRes

    // 2. Azure TTS
    const azureRes = await tryAzure(text)
    if (azureRes) return azureRes

    // 3. Gemini TTS
    const geminiRes = await tryGemini(text, resolvedVoice)
    if (geminiRes) return geminiRes

    // 4. OpenAI TTS
    const openaiRes = await tryOpenAI(text, resolvedVoice)
    if (openaiRes) return openaiRes

    console.error('[maya-tts] All providers failed')
    return new Response(JSON.stringify({ error: 'All TTS providers failed' }), { status: 503 })

  } catch (err) {
    console.error('[maya-tts] unhandled error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

