# Passo a Passo — Implementação Speaker ID com Vosk

## Pré-requisitos

- [x] `models/vosk-model-spk-0.4/` baixado e extraído (ver [MODELO_DOWNLOAD.md](./MODELO_DOWNLOAD.md))
- [x] `npm install vosk wavefile` executado

---

## FASE 1 — Setup de dependências

### 1.1 Instalar pacotes

```bash
npm install vosk wavefile
```

### 1.2 Adicionar `models/` ao .gitignore

```
# .gitignore (adicionar se não existir)
models/
```

### 1.3 Baixar modelo (ver MODELO_DOWNLOAD.md)

```powershell
New-Item -ItemType Directory -Force -Path models
Invoke-WebRequest -Uri "https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip" -OutFile "models\vosk-model-spk-0.4.zip"
Expand-Archive -Path "models\vosk-model-spk-0.4.zip" -DestinationPath "models\" -Force
Remove-Item "models\vosk-model-spk-0.4.zip"
```

---

## FASE 2 — Backend: `src/lib/voskSpeaker.ts`

Cria o módulo singleton que carrega o modelo e expõe as funções de extração e comparação.

```typescript
// src/lib/voskSpeaker.ts
import path from 'path'

// Importação dinâmica para evitar erros no build do Vercel
// (vosk só funciona em ambiente local/Docker com filesystem)
let voskModule: any = null
let spkModelInstance: any = null

function getVosk() {
  if (!voskModule) {
    voskModule = require('vosk')
    voskModule.setLogLevel(0) // silencia logs do Vosk
  }
  return voskModule
}

export function getSpkModel() {
  if (!spkModelInstance) {
    const vosk = getVosk()
    const MODEL_PATH = path.join(process.cwd(), 'models', 'vosk-model-spk-0.4')
    spkModelInstance = new vosk.SpkModel(MODEL_PATH)
  }
  return spkModelInstance
}

/**
 * Extrai o x-vector (128 dimensões) de um buffer de áudio WAV.
 * O áudio deve ser 16kHz, mono, PCM16.
 * Retorna null se o áudio for muito curto ou sem voz detectada.
 */
export function extractEmbedding(wavBuffer: Buffer): number[] | null {
  const vosk = getVosk()
  const spkModel = getSpkModel()

  // Pular header WAV (44 bytes) para pegar só o PCM
  const SAMPLE_RATE = 16000
  const rec = new vosk.KaldiRecognizer(
    new vosk.Model(''), // Model vazio — só queremos speaker, não ASR
    SAMPLE_RATE
  )
  // Alternativa sem ASR model: usar apenas o SpkModel
  rec.setSpkModel(spkModel)

  // Processar em chunks de 4000 amostras (~250ms a 16kHz)
  const pcm = wavBuffer.slice(44) // pular header WAV
  const CHUNK = 8000 // 4000 amostras × 2 bytes (int16)
  let lastSpk: number[] | null = null

  for (let offset = 0; offset + CHUNK <= pcm.length; offset += CHUNK) {
    const chunk = pcm.slice(offset, offset + CHUNK)
    rec.acceptWaveform(chunk)
  }

  const result = JSON.parse(rec.finalResult())
  if (result.spk && result.spk.length === 128) {
    lastSpk = result.spk
  }

  rec.free()
  return lastSpk
}

/**
 * Similaridade cosseno entre dois vetores de 128 dimensões.
 * Retorna valor entre -1 e 1. Para voz, valores > 0.85 indicam mesma pessoa.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export const SPEAKER_THRESHOLD = 0.85
```

> **Nota:** O `Model('')` vazio pode não funcionar dependendo da versão do Vosk. Ver seção de troubleshooting no final.

---

## FASE 2 (alternativa) — sem ASR Model

Se `new vosk.Model('')` lançar erro, usar um wrapper diferente:

```typescript
// Alternativa: usar apenas SpkModel sem KaldiRecognizer completo
// Processar via Recognizer com modelo de fala mínimo
// ou adaptar para usar vosk.Model com modelo small-pt baixado também
```

---

## FASE 3 — Rota de Enrollment: `src/app/api/speaker-enroll/route.ts`

```typescript
// src/app/api/speaker-enroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extractEmbedding } from '../../../lib/voskSpeaker'
import { supabase } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json()
    // audio: string base64 de arquivo WAV (16kHz, mono, PCM16)

    if (!audio) {
      return NextResponse.json({ error: 'audio é obrigatório' }, { status: 400 })
    }

    const wavBuffer = Buffer.from(audio, 'base64')
    const embedding = extractEmbedding(wavBuffer)

    if (!embedding) {
      return NextResponse.json(
        { error: 'Não foi possível extrair voiceprint. Fale por mais tempo (10–20s).' },
        { status: 422 }
      )
    }

    // Salvar no Supabase — sobrescreve enrollment anterior se existir
    const { error } = await supabase
      .from('user_facts')
      .upsert({
        fact: JSON.stringify({ voiceprint: embedding }),
        category: 'voice_print',
        importance: 10,
        source: 'vosk-enrollment',
      }, { onConflict: 'category' })

    if (error) throw error

    return NextResponse.json({ enrolled: true, dimensions: embedding.length })
  } catch (err: any) {
    console.error('[speaker-enroll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## FASE 4 — Rota de Verificação: `src/app/api/speaker-verify/route.ts`

```typescript
// src/app/api/speaker-verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extractEmbedding, cosineSimilarity, SPEAKER_THRESHOLD } from '../../../lib/voskSpeaker'
import { supabase } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json()

    if (!audio) {
      return NextResponse.json({ error: 'audio é obrigatório' }, { status: 400 })
    }

    // Buscar voiceprint salvo
    const { data, error } = await supabase
      .from('user_facts')
      .select('fact')
      .eq('category', 'voice_print')
      .single()

    if (error || !data) {
      // Sem enrollment: skip verificação, permitir acesso
      return NextResponse.json({ match: true, confidence: 1.0, reason: 'no_enrollment' })
    }

    const stored: number[] = JSON.parse(data.fact).voiceprint
    const wavBuffer = Buffer.from(audio, 'base64')
    const embedding = extractEmbedding(wavBuffer)

    if (!embedding) {
      return NextResponse.json({ match: false, confidence: 0, reason: 'no_voice_detected' })
    }

    const confidence = cosineSimilarity(embedding, stored)
    const match = confidence >= SPEAKER_THRESHOLD

    return NextResponse.json({ match, confidence: parseFloat(confidence.toFixed(4)), reason: 'compared' })
  } catch (err: any) {
    console.error('[speaker-verify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## FASE 5 — Hook Frontend: `src/hooks/useSpeakerVerify.ts`

```typescript
// src/hooks/useSpeakerVerify.ts
'use client'
import { useRef, useCallback } from 'react'

interface VerifyResult {
  match: boolean
  confidence: number
  reason: string
}

export function useSpeakerVerify() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  /**
   * Grava `durationMs` ms de áudio e verifica identidade.
   * Retorna { match, confidence } ou null em caso de erro.
   */
  const verify = useCallback(async (durationMs = 3000): Promise<VerifyResult | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }})

      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      await new Promise<void>(resolve => {
        recorder.onstop = () => resolve()
        recorder.start()
        setTimeout(() => recorder.stop(), durationMs)
      })

      stream.getTracks().forEach(t => t.stop())

      // Converter para base64
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const res = await fetch('/api/speaker-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
      })

      return await res.json()
    } catch (err) {
      console.error('[useSpeakerVerify]', err)
      return null
    }
  }, [])

  /**
   * Grava 15s de áudio para enrollment (cadastro de voz).
   */
  const enroll = useCallback(async (durationMs = 15000): Promise<{ enrolled: boolean } | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
      }})

      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      await new Promise<void>(resolve => {
        recorder.onstop = () => resolve()
        recorder.start()
        setTimeout(() => recorder.stop(), durationMs)
      })

      stream.getTracks().forEach(t => t.stop())

      const blob = new Blob(chunks, { type: 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const res = await fetch('/api/speaker-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
      })

      return await res.json()
    } catch (err) {
      console.error('[useSpeakerVerify enroll]', err)
      return null
    }
  }, [])

  return { verify, enroll }
}
```

---

## FASE 6 — Botão de Enrollment no SettingsPanel

Adicionar na aba de configurações do Maya:

```tsx
// Trecho a adicionar em SettingsPanel.tsx
import { useSpeakerVerify } from '../../hooks/useSpeakerVerify'

// Dentro do componente:
const { enroll } = useSpeakerVerify()
const [enrolling, setEnrolling] = useState(false)
const [enrollDone, setEnrollDone] = useState(false)

const handleEnroll = async () => {
  setEnrolling(true)
  const result = await enroll(15000) // 15 segundos
  setEnrolling(false)
  setEnrollDone(result?.enrolled ?? false)
}

// JSX:
<div>
  <button onClick={handleEnroll} disabled={enrolling}>
    {enrolling ? 'Gravando 15s... fale normalmente' : 'Cadastrar minha voz'}
  </button>
  {enrollDone && <span>✅ Voz cadastrada com sucesso!</span>}
</div>
```

---

## FASE 7 — Integrar com Wake Word (useWakeWord.ts)

```typescript
// Após detectar wake word, verificar identidade antes de processar
// Trecho a adicionar em MayaCockpit.tsx ou useWakeWord.ts:

const { verify } = useSpeakerVerify()

// No handler de wake word:
const result = await verify(3000)
if (result && !result.match && result.reason === 'compared') {
  window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' }}))
  // Maya responde que não reconheceu a voz
  return
}
// Procede normalmente...
```

---

## Troubleshooting

### `vosk` not working with Next.js App Router
Adicionar ao `next.config.js`:
```js
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['vosk'],
  },
  devIndicators: false,
}
module.exports = nextConfig
```

### `new vosk.Model('')` throws error
Usar apenas SpkModel com um recognizer simplificado ou baixar também o modelo ASR small-pt.

### Áudio WebM precisa de conversão para WAV 16kHz
O servidor precisa do pacote `wavefile` ou `ffmpeg` para converter:
```typescript
import { WaveFile } from 'wavefile'
// converter webm→pcm é mais complexo, pode precisar de ffmpeg
// alternativa: capturar no frontend já em PCM via AudioWorklet
```

### Acurácia baixa
- Aumentar duração do enrollment (15–30s)
- Garantir ambiente silencioso durante enrollment
- Baixar threshold para 0.75 se tiver muitas rejeições falsas
