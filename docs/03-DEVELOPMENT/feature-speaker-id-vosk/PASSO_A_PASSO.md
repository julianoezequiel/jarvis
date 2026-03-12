# Passo a Passo — Implementação Speaker ID com Vosk (Multi-Usuário)

## Modelo de perfis de voz

Múltiplas pessoas podem ser cadastradas. Cada uma ocupa **uma linha** em `user_facts`:

```
category = 'voice_profile'  (fixo para todos os perfis)
fact     = '{"name":"Juliano","voiceprint":[0.12,-0.45,...]}'
```

Quando alguém fala, o sistema compara com **todos os perfis** e retorna o maior match.

---

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

Recebe `{ name, audio }` e salva um novo perfil de voz. Cada pessoa = uma linha.

```typescript
// src/app/api/speaker-enroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extractEmbedding } from '../../../lib/voskSpeaker'
import { supabase } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name, audio } = await req.json()

    if (!name || !audio) {
      return NextResponse.json({ error: 'name e audio são obrigatórios' }, { status: 400 })
    }

    const wavBuffer = Buffer.from(audio, 'base64')
    const embedding = extractEmbedding(wavBuffer)

    if (!embedding) {
      return NextResponse.json(
        { error: 'Não foi possível extrair voiceprint. Fale por mais tempo (10–20s) em ambiente silencioso.' },
        { status: 422 }
      )
    }

    // Verificar se já existe um perfil com este nome
    const { data: existing } = await supabase
      .from('user_facts')
      .select('id')
      .eq('category', 'voice_profile')
      .ilike('fact', `%"name":"${name}"%`)
      .maybeSingle()

    if (existing?.id) {
      // Atualizar perfil existente
      await supabase
        .from('user_facts')
        .update({
          fact: JSON.stringify({ name, voiceprint: embedding }),
          source: 'vosk-enrollment',
        })
        .eq('id', existing.id)
    } else {
      // Criar novo perfil
      await supabase.from('user_facts').insert({
        fact: JSON.stringify({ name, voiceprint: embedding }),
        category: 'voice_profile',
        importance: 10,
        source: 'vosk-enrollment',
      })
    }

    return NextResponse.json({ enrolled: true, name, dimensions: embedding.length })
  } catch (err: any) {
    console.error('[speaker-enroll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Listar todos os perfis cadastrados
export async function GET() {
  const { data } = await supabase
    .from('user_facts')
    .select('id, fact, created_at')
    .eq('category', 'voice_profile')
    .order('created_at', { ascending: true })

  const profiles = (data ?? []).map(row => {
    const parsed = JSON.parse(row.fact)
    return { id: row.id, name: parsed.name, enrolledAt: row.created_at }
  })

  return NextResponse.json({ profiles })
}

// Remover um perfil por nome
export async function DELETE(req: NextRequest) {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })

  await supabase
    .from('user_facts')
    .delete()
    .eq('category', 'voice_profile')
    .ilike('fact', `%"name":"${name}"%`)

  return NextResponse.json({ deleted: true, name })
}
```

---

## FASE 4 — Rota de Verificação: `src/app/api/speaker-verify/route.ts`

Compara com **todos** os perfis e retorna o melhor match.

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

    // Buscar TODOS os perfis cadastrados
    const { data, error } = await supabase
      .from('user_facts')
      .select('fact')
      .eq('category', 'voice_profile')

    if (error) throw error

    if (!data || data.length === 0) {
      // Sem nenhum perfil: skip verificação, permite acesso
      return NextResponse.json({ match: true, speaker: null, confidence: 1.0, reason: 'no_enrollment' })
    }

    const wavBuffer = Buffer.from(audio, 'base64')
    const embedding = extractEmbedding(wavBuffer)

    if (!embedding) {
      return NextResponse.json({ match: false, speaker: null, confidence: 0, reason: 'no_voice_detected' })
    }

    // Comparar com todos os perfis — retornar o melhor match
    let bestMatch = { name: '', confidence: 0 }
    for (const row of data) {
      const profile: { name: string; voiceprint: number[] } = JSON.parse(row.fact)
      const sim = cosineSimilarity(embedding, profile.voiceprint)
      if (sim > bestMatch.confidence) {
        bestMatch = { name: profile.name, confidence: sim }
      }
    }

    const match = bestMatch.confidence >= SPEAKER_THRESHOLD

    return NextResponse.json({
      match,
      speaker: match ? bestMatch.name : null,
      confidence: parseFloat(bestMatch.confidence.toFixed(4)),
      reason: 'compared',
    })
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

export interface VerifyResult {
  match: boolean
  speaker: string | null   // nome da pessoa reconhecida, ou null
  confidence: number
  reason: string
}

export interface EnrollResult {
  enrolled: boolean
  name: string
  error?: string
}

export function useSpeakerVerify() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  /** Grava `durationMs` ms e identifica o falante. */
  const verify = useCallback(async (durationMs = 3000): Promise<VerifyResult | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })

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

      const blob = new Blob(chunks, { type: 'audio/webm' })
      const base64 = await blobToBase64(blob)

      const res = await fetch('/api/speaker-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
      })

      return await res.json()
    } catch (err) {
      console.error('[useSpeakerVerify.verify]', err)
      return null
    }
  }, [])

  /** Grava `durationMs` ms e cadastra como perfil de voz com o nome dado. */
  const enrollByName = useCallback(async (
    name: string,
    durationMs = 12000
  ): Promise<EnrollResult | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      })

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
      const base64 = await blobToBase64(blob)

      const res = await fetch('/api/speaker-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, audio: base64 }),
      })

      return await res.json()
    } catch (err) {
      console.error('[useSpeakerVerify.enrollByName]', err)
      return null
    }
  }, [])

  /** Lista todos os perfis cadastrados via GET /api/speaker-enroll */
  const listProfiles = useCallback(async (): Promise<{ id: string; name: string; enrolledAt: string }[]> => {
    const res = await fetch('/api/speaker-enroll')
    const json = await res.json()
    return json.profiles ?? []
  }, [])

  /** Remove um perfil por nome via DELETE /api/speaker-enroll */
  const deleteProfile = useCallback(async (name: string): Promise<boolean> => {
    const res = await fetch('/api/speaker-enroll', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()
    return json.deleted === true
  }, [])

  return { verify, enrollByName, listProfiles, deleteProfile }
}

// Utilitário
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
}
```

---

## FASE 6 — `VoiceEnrollModal.tsx` (componente de cadastro)

Exibido quando o usuário inicia o fluxo de cadastro via chat.

```tsx
// src/components/cockpit/VoiceEnrollModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSpeakerVerify } from '../../hooks/useSpeakerVerify'

interface Props {
  name: string                        // nome já informado no chat
  onDone: (success: boolean) => void  // callback para Maya confirmar/erro
}

export function VoiceEnrollModal({ name, onDone }: Props) {
  const { enrollByName } = useSpeakerVerify()
  const [phase, setPhase] = useState<'ready' | 'recording' | 'done' | 'error'>('ready')
  const [secondsLeft, setSecondsLeft] = useState(12)
  const DURATION = 12000

  const handleRecord = async () => {
    setPhase('recording')
    setSecondsLeft(DURATION / 1000)

    const countdown = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(countdown); return 0 }
        return prev - 1
      })
    }, 1000)

    const result = await enrollByName(name, DURATION)
    clearInterval(countdown)

    if (result?.enrolled) {
      setPhase('done')
      onDone(true)
    } else {
      setPhase('error')
      onDone(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a1628', border: '1px solid #00d4ff44',
        borderRadius: 12, padding: 32, maxWidth: 400, textAlign: 'center',
        fontFamily: 'Share Tech Mono, monospace', color: '#e0f7ff',
      }}>
        <div style={{ fontSize: 14, color: '#00d4ff', marginBottom: 8, letterSpacing: 2 }}>
          CADASTRO DE VOZ
        </div>
        <div style={{ fontSize: 22, marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
          Fale naturalmente por 12 segundos. Diga frases variadas como:<br />
          <em style={{ color: '#00d4ff99' }}>
            "Olá Maya, como você está? Quero ver o relatório de hoje..."
          </em>
        </div>

        {phase === 'ready' && (
          <button
            onClick={handleRecord}
            style={{
              background: '#00d4ff22', border: '1px solid #00d4ff',
              color: '#00d4ff', borderRadius: 8, padding: '10px 28px',
              fontSize: 14, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            ⬤ GRAVAR
          </button>
        )}

        {phase === 'recording' && (
          <div>
            <div style={{ color: '#ff4444', fontSize: 16, marginBottom: 8 }}>
              ● GRAVANDO — {secondsLeft}s restantes...
            </div>
            <div style={{
              width: '100%', height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(secondsLeft / (DURATION / 1000)) * 100}%`,
                background: '#ff4444',
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ color: '#00ff88', fontSize: 16 }}>
            ✅ Voz de {name} cadastrada com sucesso!
          </div>
        )}

        {phase === 'error' && (
          <div style={{ color: '#ff4444', fontSize: 14 }}>
            ❌ Não consegui capturar a voz.<br />
            Tente em ambiente mais silencioso.
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## FASE 7 — Intent Detection no chat (`useMayaChat.ts` ou `jarvisPrompt.ts`)

### 7.1 State para gerenciar o fluxo de cadastro

```typescript
// Estado a adicionar em MayaCockpit.tsx (ou onde está o estado do chat)
const [enrollFlow, setEnrollFlow] = useState<{
  active: boolean
  pendingName: string | null
} >({ active: false, pendingName: null })
```

### 7.2 Detectar o intent de cadastro na mensagem

```typescript
// Verificar antes de enviar mensagem para a Maya:
function checkEnrollIntent(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return (
    normalized.includes('cadastrar nova voz') ||
    normalized.includes('cadastrar voz') ||
    normalized.includes('nova voz') ||
    normalized.includes('adicionar voz') ||
    normalized.includes('registrar voz')
  )
}

// Fluxo:
function handleSend(text: string) {
  if (enrollFlow.active && enrollFlow.pendingName === null) {
    // Usuário está respondendo o nome
    setEnrollFlow({ active: true, pendingName: text.trim() })
    // Maya confirma e mostra botão
    addMayaMessage(`Ok! Quando estiver pronto, clique em ⬤ GRAVAR e fale por 12 segundos.`)
    return
  }

  if (checkEnrollIntent(text)) {
    setEnrollFlow({ active: true, pendingName: null })
    addMayaMessage(`Qual é o nome da pessoa que deseja cadastrar?`)
    return
  }

  // Envio normal para a Maya
  sendToMaya(text)
}
```

### 7.3 Exibir VoiceEnrollModal quando nome estiver definido

```tsx
{/* No JSX do MayaCockpit.tsx */}
{enrollFlow.active && enrollFlow.pendingName && (
  <VoiceEnrollModal
    name={enrollFlow.pendingName}
    onDone={(success) => {
      setEnrollFlow({ active: false, pendingName: null })
      if (success) {
        addMayaMessage(`✅ Voz de ${enrollFlow.pendingName} cadastrada! Ela agora tem permissão para usar comandos de voz.`)
      } else {
        addMayaMessage(`❌ Não consegui capturar a voz de ${enrollFlow.pendingName}. Tente novamente em um ambiente mais silencioso.`)
      }
    }}
  />
)}
```

---

## FASE 8 — Camada pré-transcrição (useWakeWord.ts)

A verificação de voz ocorre **antes** da transcrição do comando. Só prossegue se o falante for reconhecido.

```typescript
// Trecho a integrar no handler de wake word em MayaCockpit.tsx:
import { useSpeakerVerify } from '../hooks/useSpeakerVerify'

const { verify } = useSpeakerVerify()

// No handler de wake word detectado:
async function onWakeWordDetected() {
  window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'listening' } }))

  // CAMADA 1: Verificar identidade (2-3s de áudio)
  const result = await verify(3000)

  if (result && result.reason === 'compared' && !result.match) {
    // Há perfis cadastrados mas não reconheceu
    window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
    // Opcional: feedback visual/sonoro de rejeição
    console.warn(`[SpeakerID] Voz não reconhecida (confidence: ${result.confidence})`)
    return  // ← NÃO processa o comando
  }

  const speakerName = result?.speaker ?? null
  // speakerName = 'Juliano' | 'Mayara' | null (se no_enrollment)

  // CAMADA 2: Transcrição normal do comando
  // Passa speakerName para o chat:
  // sendToMaya(transcribedCommand, { speaker: speakerName })
  //
  // Maya pode personalizar: "Olá Juliano!" ou responder normalmente se null
}
```

---

## Resultado Final — Fluxo completo

```
Usuário fala "Maya"
    ↓
Wake Word detectado
    ↓
[FASE 8] verify(3000ms)  ← 2-3s de áudio capturado
    ↓
Compara com Juliano, Mayara, Elizabeth (todos os perfis)
    ↓
Retorna: { match: true, speaker: "Mayara", confidence: 0.91 }
    ↓
[FASE 8] Prossegue — captura o comando por voz
    ↓
POST /api/maya-chat { message: "...", speakerName: "Mayara" }
    ↓
Maya: "Olá Mayara! ..."
```

---

## Troubleshooting

### `vosk` não funciona com Next.js App Router

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

### Múltiplos cadastros para o mesmo nome

O sistema atualiza o perfil existente (não duplica).


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
