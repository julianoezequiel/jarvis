import { useCallback, useRef, useState, useEffect } from 'react'
import { stripProtocols } from '../lib/agentRouter'

export type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; text: string }

// Remove marcações Markdown do texto antes de enviar ao TTS
// O chat continua exibindo a formatação — só o áudio recebe texto limpo
function stripMarkdownForTTS(text: string): string {
  return text
    // Blocos de código: ```...``` e `code` → só o conteúdo (sem backticks)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Cabeçalhos: # Título → Título
    .replace(/^#{1,6}\s+/gm, '')
    // Negrito/itálico: **texto**, __texto__, *texto*, _texto_
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Links: [texto](url) → texto
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Imagens: ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Tabelas: linhas com | → remove pipes, mantém conteúdo
    .replace(/^\|.*\|$/gm, line => line.replace(/\|/g, ' ').replace(/\s{2,}/g, ' ').trim())
    // Linhas de separação de tabela (|---|---|)
    .replace(/^\s*[\|]?[\s\-:]+[\|][\s\-:|]*$/gm, '')
    // Separadores: --- ou *** ou ___
    .replace(/^[\-*_]{3,}\s*$/gm, '')
    // Blockquote: > texto → texto
    .replace(/^>\s*/gm, '')
    // Bullets: - item, * item, + item → item
    .replace(/^[\-*+]\s+/gm, '')
    // Listas numeradas: 1. item → item
    .replace(/^\d+\.\s+/gm, '')
    // Emojis de status comuns que ficam estranhos na voz
    .replace(/✅|❌|⚠️|🔴|🟢|🟡|📌|💡|🚀|⭐|🎯|📊|🔧|💬|📝|🎉|👉|ℹ️|➡️/g, '')
    // Múltiplas quebras de linha → espaço
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    // Espaços duplicados
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ─── Audio singleton ────────────────────────────────────────────────────────
// One shared token per "generation". Each new speakText call gets a new token;
// the previous generation sees the token is stale and stops itself.
let _speakGeneration = 0
let _activeAudio: HTMLAudioElement | null = null
// Tracks which generation "owns" __mayaSpeaking.
// Prevents stale finally blocks from overwriting the flag of a newer speakText call.
let _activeSpeakGen = -1

// Global user mute (set by CentralOrb click) — prevents TTS output when true
let _muteGlobal = false
if (typeof window !== 'undefined') {
  window.addEventListener('maya:mute', (ev: Event) => {
    const muted = (ev as CustomEvent<{ muted: boolean }>).detail?.muted ?? false
    _muteGlobal = muted
    // If MAYA is currently speaking and user just muted — stop immediately
    if (muted) stopCurrentAudio()
  })
}

// ─── Speaker session trust ───────────────────────────────────────────────────
// Once a speaker passes the INITIAL threshold (high confidence), they are
// trusted for the session. Subsequent verifications use a much lower threshold
// (SESSION_THRESHOLD) — just enough to catch a session-hijacker speaking over
// the verified user. Trust expires after SESSION_EXPIRE_MS of silence.
const INITIAL_THRESHOLD_DEFAULT = 0.70   // first-pass: requires solid match
const SESSION_THRESHOLD          = 0.45  // subsequent: just "sounds like the same person"
const SESSION_EXPIRE_MS          = 8 * 60 * 1000  // 8 minutes of inactivity

let _sessionSpeaker: string | null = null
let _sessionExpireTimer: ReturnType<typeof setTimeout> | null = null

function _touchSession(speaker: string) {
  _sessionSpeaker = speaker
  if (_sessionExpireTimer) clearTimeout(_sessionExpireTimer)
  _sessionExpireTimer = setTimeout(() => {
    console.log('[maya:session] trust expired — next utterance requires full verification')
    _sessionSpeaker = null
  }, SESSION_EXPIRE_MS)
}

function _clearSession() {
  _sessionSpeaker = null
  if (_sessionExpireTimer) { clearTimeout(_sessionExpireTimer); _sessionExpireTimer = null }
}

// Mute/unmute the speech recognition while MAYA is speaking to prevent feedback loop
function dispatchMicControl(enabled: boolean) {
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent('maya:listen-control', { detail: { enabled } })) } catch (_) {}
  }
}

export function stopCurrentAudio() {
  _speakGeneration++ // invalidate any in-flight speak
  if (_activeAudio) {
    try { _activeAudio.pause() } catch (_) {}
    try { _activeAudio.src = '' } catch (_) {}
    _activeAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel() } catch (_) {}
  }
  // NOTE: do NOT re-enable mic here — speakText's finally block owns that
}

// Kill audio on page unload/refresh so it never bleeds into next load
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', stopCurrentAudio)
  window.addEventListener('pagehide', stopCurrentAudio)
  // Lock session from Settings panel
  window.addEventListener('maya:lock-session', () => {
    _clearSession()
    console.log('[maya:session] manually locked — next utterance requires full verification')
  })
  // Also stop when tab becomes hidden — unless user opted to keep audio in background
  document.addEventListener('visibilitychange', () => {
    try {
      if (document.visibilityState === 'hidden') {
        const raw = window.localStorage.getItem('maya_settings')
        const keep = raw ? (JSON.parse(raw).keepAudioInBackground === true) : false
        if (!keep) stopCurrentAudio()
      }
    } catch (e) {
      if (document.visibilityState === 'hidden') stopCurrentAudio()
    }
  })
}

// Plays text using Gemini TTS; resolves only when audio FINISHES (or is interrupted)
// onPlayStart is called the moment audio actually begins playing
// Fallback: browser SpeechSynthesis (instant, no network)
function speakWithSynthesis(text: string, onPlayStart?: () => void): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { resolve(); return }
    onPlayStart?.()
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    const voices = window.speechSynthesis.getVoices()
    // Prefer female pt-BR voice; fall back to any pt voice
    const ptVoice =
      voices.find(v => v.lang.startsWith('pt') && /female|feminina|maria|vitoria|francisca/i.test(v.name)) ||
      voices.find(v => v.lang === 'pt-BR') ||
      voices.find(v => v.lang.startsWith('pt'))
    if (ptVoice) utter.voice = ptVoice
    utter.onend = () => resolve()
    utter.onerror = () => resolve()
    window.speechSynthesis.speak(utter)
  })
}

// Sem timeout artificial — EdgeTTS é server-side e sempre disponível.
// Fallback para browser SpeechSynthesis só ocorre se a API retornar erro HTTP real (não apenas lentidão).

async function speakText(text: string, onPlayStart?: () => void): Promise<void> {
  // Text-only mode — no TTS, only chat
  if (typeof localStorage !== 'undefined' && localStorage.getItem('maya_text_only_mode') === 'true') return
  // User has muted MAYA — skip TTS entirely but still allow text responses
  if (_muteGlobal) return

  stopCurrentAudio() // also calls dispatchMicControl(true) — will be overridden below
  const myGen = _speakGeneration
  const isStale = () => myGen !== _speakGeneration

  if (isStale()) return

  // Mute mic while MAYA is speaking — prevents the speaker audio from re-entering the mic
  dispatchMicControl(false)
  ;(window as any).__mayaSpeaking = true
  _activeSpeakGen = myGen // este call agora é o dono do estado de speaking

  try {
    // Read user settings at invocation time so changes apply immediately
    const loadSettings = () => {
      try {
        if (typeof window === 'undefined') return null
        const raw = window.localStorage.getItem('maya_settings')
        if (!raw) return null
        return JSON.parse(raw) as { ttsProvider?: string; ttsVoice?: string }
      } catch (_) { return null }
    }

    const settings = loadSettings() || { ttsProvider: undefined, ttsVoice: undefined }

    // If user explicitly requests browser TTS, use SpeechSynthesis immediately
    if (settings.ttsProvider === 'browser') {
      await speakWithSynthesis(text, onPlayStart)
      return
    }

    const controller = new AbortController()

    // Aguarda a API diretamente — sem timeout artificial.
    // AbortController cancela automaticamente se o usuário enviar nova mensagem (isStale).
    // Browser SpeechSynthesis só é usado como último recurso em caso de erro HTTP real.
    let blob: Blob | null = null
    try {
      const res = await fetch('/api/maya-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: settings.ttsProvider, voice: settings.ttsVoice }),
        signal: controller.signal,
      })
      if (!res.ok) {
        console.warn('[tts] API falhou:', res.status)
      } else {
        blob = await res.blob()
        if (blob) console.log('[tts] API respondeu, tipo:', blob.type, 'bytes:', blob.size)
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') console.warn('[tts] fetch falhou:', e)
    }

    if (isStale()) return

    if (!blob) {
      // API retornou erro HTTP — browser SpeechSynthesis como último recurso
      console.warn('[tts] API indisponível → SpeechSynthesis fallback')
      await speakWithSynthesis(text, onPlayStart)
      return
    }

    // API respondeu — reproduz áudio
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    _activeAudio = audio

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        try { URL.revokeObjectURL(url) } catch (_) {}
        if (_activeAudio === audio) _activeAudio = null
        resolve()
      }
      audio.onended = cleanup
      audio.onerror = cleanup
      audio.onpause = () => { if (!audio.ended) cleanup() }
      audio.onplaying = () => { onPlayStart?.() }
      audio.play().then(() => { onPlayStart?.() }).catch(e => { console.warn('[tts] audio.play() falhou:', e); cleanup() })
    })
  } finally {
    // Só limpa __mayaSpeaking se este call ainda é o dono (não foi substituído por uma geração mais nova)
    if (_activeSpeakGen === myGen) {
      ;(window as any).__mayaSpeaking = false
      dispatchMicControl(true)
    }
  }
}

// Plays a welcome message to warm up the EdgeTTS WebSocket connection on startup.
// Should be called once after the boot sequence finishes.
export async function playWelcomeTTS(): Promise<void> {
  // Text-only mode — skip welcome TTS
  if (typeof window !== 'undefined' && window.localStorage.getItem('maya_text_only_mode') === 'true') return
  // Mensagem padrão dinâmica: só inclui "diga Maya para ativar" se wake word estiver ativo
  const wakeEnabled = typeof window !== 'undefined'
    ? window.localStorage.getItem('maya_wake_word_enabled') !== 'false'
    : true
  let welcomeText = wakeEnabled
    ? 'Sistemas online. Aguardando seu comando — diga Maya para ativar.'
    : 'Sistemas online. Pronta para receber seus comandos.'
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('maya_settings') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.welcomeMessage && typeof parsed.welcomeMessage === 'string' && parsed.welcomeMessage.trim()) {
        welcomeText = parsed.welcomeMessage.trim()
      }
    }
  } catch (_) {}
  await speakText(welcomeText)
  // After welcome TTS, restore standby if wake word mode is active
  try {
    if (typeof window !== 'undefined') {
      const wakeEnabled = window.localStorage.getItem('maya_wake_word_enabled') !== 'false'
      const nextStatus = wakeEnabled ? 'standby' : 'idle'
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: nextStatus } }))
    }
  } catch (_) {}
}

export function useMayaChat() {
  // Ensure a persistent session id exists per browser (used to scope memory)
  const [sessionId, setSessionId] = useState<string | null>(null)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const key = 'maya_session_id'
      let sid = window.localStorage.getItem(key)
      if (!sid) {
        try {
          sid = (window.crypto && (window.crypto as any).randomUUID && (window.crypto as any).randomUUID()) || null
        } catch (_) { sid = null }
        if (!sid) sid = 's-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
        try { window.localStorage.setItem(key, sid) } catch (_) {}
      }
      setSessionId(sid)
    } catch (e) {
      // ignore
    }
  }, [])

  // Pre-warm SpeechSynthesis voices to reduce first-play latency when browser fallback is used
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length > 0) {
      console.log('[tts] voices preloaded:', voices.length)
      return
    }
    const onVoices = () => {
      try { console.log('[tts] voices loaded:', window.speechSynthesis.getVoices().length) } catch (_) {}
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    // try to trigger voices list in some browsers
    window.speechSynthesis.getVoices()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
  }, [sessionId])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([]) // sempre atualizado — evita stale closure no sendMessage
  const [_status, _setStatus] = useState<string>('idle')
  const setStatus = useCallback((s: string) => {
    _setStatus(s)
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: s } }))
      }
    } catch (e) { /* ignore */ }
  }, [])
  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false) // prevent concurrent sendMessage calls

  // Ouvir evento de limpeza de mensagens (disparado pelo SettingsPanel ou pelo retorno do servidor)
  useEffect(() => {
    const handler = () => setMessages([])
    window.addEventListener('maya:clear-messages', handler)
    return () => window.removeEventListener('maya:clear-messages', handler)
  }, [])

  // Ouvir resultados inline de agentes (curtos/chat) — exibe no chat e fala via TTS Gemini/Azure
  useEffect(() => {
    const handler = (e: Event) => {
      const { agent, task, text } = (e as CustomEvent<{ agent: string; task?: string; text: string }>).detail || {}
      if (!agent || !text) return
      const taskLabel = task ? ` — *${task.slice(0, 80)}*` : ''
      const msg = `**${agent}**${taskLabel}\n\n${text}`
      setMessages(prev => [
        ...prev,
        { id: `agent-inline-${agent}-${Date.now()}`, role: 'assistant', text: msg },
      ])
      // Fala o resultado do agente via Gemini/Azure TTS (mesma pipeline da MAYA)
      // Aguarda brevemente para não cortar fala anterior em andamento
      const speakDelay = (window as any).__mayaSpeaking ? 400 : 0
      setTimeout(() => {
        speakText(stripMarkdownForTTS(text), () => {
          try { window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'speaking (agent)' } })) } catch (_) {}
        }).then(() => {
          try { window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } })) } catch (_) {}
        }).catch(() => {})
      }, speakDelay)
    }
    window.addEventListener('maya:agent-inline', handler)
    return () => window.removeEventListener('maya:agent-inline', handler)
  }, [])

  // Ouvir resultados de agentes salvos em DOCS (arquivos/conteúdo longo)
  useEffect(() => {
    const handler = (e: Event) => {
      const { agent, task, text } = (e as CustomEvent<{ agent: string; task?: string; text: string }>).detail || {}
      if (!agent || !text) return
      const preview = text.length > 150 ? text.slice(0, 150) + '\u2026' : text
      const taskLabel = task ? ` — ${task.slice(0, 60)}` : ''
      const msg = `\u2705 **${agent}**${taskLabel}\n\nArquivo salvo na aba **DOCS** para download.\n\n${preview}`
      setMessages(prev => [
        ...prev,
        { id: `agent-${agent}-${Date.now()}`, role: 'system', text: msg },
      ])
    }
    window.addEventListener('maya:agent-result', handler)
    return () => window.removeEventListener('maya:agent-result', handler)
  }, [])

  // Persist messages to localStorage so history is kept across reloads
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('maya_messages')
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    messagesRef.current = messages
    try {
      if (typeof window === 'undefined') return
      window.localStorage.setItem('maya_messages', JSON.stringify(messages))
    } catch (e) {
      // ignore storage errors
    }
  }, [messages])

  // Helper: check if console logging is enabled in user settings (`maya_settings.log`)
  const isLogEnabled = useCallback(() => {
    try {
      if (typeof window === 'undefined') return false
      const raw = window.localStorage.getItem('maya_settings')
      if (!raw) return false
      const s = JSON.parse(raw)
      return !!s.log
    } catch (_) { return false }
  }, [])

  
  const sendMessage = useCallback(async (payload: { sessionId?: string; userId?: string; message: string; imageBase64?: string; imageMime?: string }) => {
    // Abortar qualquer requisição em andamento e parar o áudio
    stopCurrentAudio()
    abortRef.current?.abort()
    // Resetar a guarda imediatamente após o abort — o catch da requisição anterior
    // vai tentar setar false novamente, o que é inofensivo
    sendingRef.current = false
    sendingRef.current = true
    setStatus('thinking')
    const ac = new AbortController()
    abortRef.current = ac

    try {
      // Ensure sessionId is present and persisted so server can scope memory
      const effectiveSessionId = payload.sessionId || sessionId || undefined

      // Try to fetch relevant memories from the server and attach to the chat payload
      let memoryBlock: any = undefined
      const isVagueReference = (text: string) => {
        if (!text) return false
        const t = text.trim().toLowerCase()
        // common Portuguese vague reference patterns
        return /(^|\s)(sobre que|qual assunto|do que eu falei|sobre quem|de quem eu falei|sobre isso|o que eu disse|sobre o que)(\s|\?|$)/i.test(t)
      }

      try {
        // If the user message is a vague reference, request recent session-scoped memories only
        if (isVagueReference(payload.message) && effectiveSessionId) {
          try {
            const memRes = await fetch('/api/maya-memory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: 'search_memory', payload: { sessionId: effectiveSessionId, limit: 6 } }),
              signal: ac.signal,
            })
            if (memRes.ok) {
              const memJson = await memRes.json().catch(() => null)
              if (memJson && memJson.ok) memoryBlock = { memories: memJson.memories || [], facts: memJson.facts || [] }
            }
          } catch (e) {
            console.warn('[memory] session fetch failed', e)
          }
        } else {
          const memRes = await fetch('/api/maya-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: 'search_memory', payload: { query: payload.message, limit: 6, sessionId: effectiveSessionId } }),
            signal: ac.signal,
          })
          if (memRes.ok) {
            const memJson = await memRes.json().catch(() => null)
            if (memJson && memJson.ok) memoryBlock = { memories: memJson.memories || [], facts: memJson.facts || [] }
          }
        }
      } catch (e) {
        console.warn('[memory] search failed', e)
        memoryBlock = undefined
      }

      // Attach recent conversation messages so the server can build context
      // Usa messagesRef.current (sempre atualizado) para evitar stale closure — garante que
      // a mensagem [CLEAR_CONFIRM_PENDING] do assistente seja enviada quando o usuário responde "sim"
      const currentMessages = messagesRef.current
      const recent = currentMessages.slice(Math.max(0, currentMessages.length - 8)).map(m => ({ role: m.role, text: m.text }))
      const chatBody = Object.assign({}, payload, memoryBlock ? { memory: memoryBlock } : {}, effectiveSessionId ? { sessionId: effectiveSessionId } : {}, { recentMessages: recent },
        payload.imageBase64 ? { imageBase64: payload.imageBase64, imageMime: payload.imageMime || 'image/png' } : {})

      const res = await fetch('/api/maya-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
        signal: ac.signal,
      })

      // Try streaming response if available and content-type is not JSON
      const contentType = res.headers.get('content-type') || ''
      if (res.body && typeof res.body.getReader === 'function' && !contentType.includes('application/json')) {
        setStatus('streaming')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let partial = ''
        let ttsStarted = false
        let ttsPromise: Promise<void> | null = null

        // Split text into sentences to start TTS as early as possible
        const SENTENCE_RE = /[^.!?\n]+[.!?\n]+/g
        let lastTtsOffset = 0

        const tryEarlyTts = (text: string, force = false) => {
          if (ttsStarted) return
          // Find complete sentences from the position we last checked
          const chunk = text.slice(lastTtsOffset)
          const matches = chunk.match(SENTENCE_RE)
          // Start TTS after first 2 sentences or if forced (stream done)
          // Start TTS after first sentence (faster start) or if forced (stream done)
          if (force || (matches && matches.length >= 1)) {
              ttsStarted = true
              // Take the first complete sentence available (safer than requiring two)
              let endOffset = lastTtsOffset + (matches![0].length)
              // If there are at least two sentences, include them to make speech smoother
              if (matches!.length >= 2) endOffset += matches![1].length
              const firstPart = force ? text : text.slice(0, endOffset)
              setStatus('thinking')
              ttsPromise = speakText(stripMarkdownForTTS(firstPart), () => setStatus('speaking (stream)'))
            }
          if (matches) lastTtsOffset += matches.reduce((a, m) => a + m.length, 0)
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          partial += decoder.decode(value, { stream: true })
          const cleanPartial = stripProtocols(partial)
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (!last || last.role !== 'assistant') {
              copy.push({ id: String(Date.now()), role: 'assistant', text: cleanPartial })
            } else {
              last.text = cleanPartial
            }
            return copy
          })
          // Conditional console log for streaming assistant text
          try {
            if (isLogEnabled()) console.log('[maya:log] assistant (stream):', partial, { sessionId: effectiveSessionId || sessionId })
          } catch (_) {}
          tryEarlyTts(partial)
        }

        // Stream done — strip protocol blocks from display, keep raw for orchestrator
        const cleanPartial = stripProtocols(partial)
        if (cleanPartial !== partial) {
          // Update final message with clean text (no [DELEGATE:] blocks visible)
          setMessages(prev => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') last.text = cleanPartial
            return copy
          })
        }
        // Emite o texto bruto (com blocos DELEGATE) para o orchestrator processar
        if (partial) {
          try { window.dispatchEvent(new CustomEvent('maya:assistant-message', { detail: { text: partial } })) } catch (_) {}
        }
        // TTS uses clean text (without protocol blocks)
        if (!ttsStarted && cleanPartial) {
          setStatus('thinking')
          ttsPromise = speakText(stripMarkdownForTTS(cleanPartial), () => setStatus('speaking (stream)'))
        }
        if (ttsPromise) await ttsPromise
        setStatus('done')
        sendingRef.current = false
        return
      }

      // Fallback: parse JSON
      const json = await res.json().catch(() => null)
      if (json && json.text) {
        const assistantText = String(json.text)
        const cleanText = stripProtocols(assistantText)

        // Se o servidor confirmou a limpeza de memória, zerar histórico local também
        if (json.provider === 'system' && /apaguei todo o hist/i.test(assistantText)) {
          try { window.localStorage.removeItem('maya_messages') } catch (_) {}
          try { window.localStorage.removeItem('maya_session_id') } catch (_) {}
          setMessages([{ id: String(Date.now()), role: 'assistant', text: cleanText }])
          try { window.dispatchEvent(new CustomEvent('maya:clear-messages')) } catch (_) {}
        } else {
          setMessages((m) => [...m, { id: String(Date.now()), role: 'assistant', text: cleanText }])
        }

        if (isLogEnabled()) console.log('[maya:log] assistant:', assistantText, { sessionId: effectiveSessionId || sessionId })
        // Emite o texto bruto para o orchestrator detectar blocos DELEGATE
        try { window.dispatchEvent(new CustomEvent('maya:assistant-message', { detail: { text: assistantText } })) } catch (_) {}
        // Stay in 'thinking' until audio actually starts playing
        setStatus('thinking')
        // Avisa a interface quando a chave paga Gemini está sendo usada
        if (json.provider === 'gemini-paid') {
          try { window.dispatchEvent(new CustomEvent('maya:paid-key-used')) } catch (_) {}
        }
        await speakText(stripMarkdownForTTS(cleanText), () => setStatus(`speaking (${json.provider ?? 'ai'})`))
        setStatus('done')
        sendingRef.current = false
        return
      }

      setStatus('done')
      sendingRef.current = false
    } catch (err) {
      sendingRef.current = false
      if ((err as any).name === 'AbortError') {
        setStatus('idle')
        return
      }
      setStatus('error')
      console.error('sendMessage error', err)
    }
  }, [sessionId, isLogEnabled])

  const addUserMessage = useCallback((text: string) => {
    setMessages((m) => {
      const last = m[m.length - 1]
      // ignore duplicate consecutive user messages
      if (last && last.role === 'user' && last.text === text) return m
      return [...m, { id: String(Date.now()), role: 'user', text }]
    })
    try { if (isLogEnabled()) console.log('[maya:log] user:', text, { sessionId }) } catch (_) {}
  }, [sessionId, isLogEnabled])

  const [listenEnabled, setListenEnabled] = useState(true)
  const statusRef = useRef<string>('idle') // always reflects current status without stale closure

  // Keep statusRef in sync with state
  useEffect(() => { statusRef.current = _status }, [_status])

  // Control mic on/off
  const setListen = useCallback((enabled: boolean) => {
    console.log(`[maya:chat] setListen(${enabled}) called`, new Error().stack?.split('\n').slice(1, 4).join(' | '))
    setListenEnabled(enabled)
    window.dispatchEvent(new CustomEvent('maya:listen-control', { detail: { enabled } }))
    setStatus(enabled ? 'idle' : 'mic-off')
  }, [setStatus])

  // Listen for speech events — intercept commands before sending to LLM
  useEffect(() => {
    const STOP_COMMANDS = ['silêncio', 'silencio', 'pare de falar', 'para de falar', 'cala boca', 'cale-se', 'para tudo', 'pare tudo']
    const ENROLL_COMMANDS = ['cadastrar nova voz', 'cadastrar voz', 'nova voz', 'adicionar voz', 'registrar voz', 'adicionar usuário', 'cadastrar usuário']

    const handler = (e: any) => {
      const raw = e?.detail?.text
      if (typeof raw !== 'string' || !raw.trim()) return
      const normalized = raw.trim().toLowerCase()
      const currentStatus = statusRef.current
      console.log(`[maya:speech] received: "${normalized}" | status: ${currentStatus}`)

      // Block if MAYA is currently speaking (covers both HTML audio and browser TTS)
      if ((window as any).__mayaSpeaking || _activeAudio) {
        console.log('[maya:speech] BLOCKED — maya is speaking')
        return
      }

      // Always allow explicit stop commands — even while speaking
      if (STOP_COMMANDS.some(cmd => normalized === cmd || normalized.startsWith(cmd + ' ') || normalized.endsWith(' ' + cmd))) {
        console.log('[maya:speech] STOP command matched — aborting audio')
        stopCurrentAudio()
        abortRef.current?.abort()
        sendingRef.current = false
        setStatus('idle')
        return
      }

      // While MAYA is speaking or thinking, ignore mic input (avoid feedback loop)
      if (currentStatus.startsWith('speaking') || currentStatus === 'thinking' || currentStatus === 'streaming') {
        console.log(`[maya:speech] BLOCKED — status is "${currentStatus}"`)
        return
      }

      // Ignora utterances muito curtas — ruído, sons isolados (mantém palavras únicas válidas)
      const wordCount = raw.trim().split(/\s+/).length
      if (wordCount < 1 || raw.trim().length < 2) {
        console.log(`[maya:speech] IGNORED — too short: "${raw.trim()}"`)
        return
      }

      // ── Enroll intent detection — open VoiceEnrollModal ──────────────────
      if (ENROLL_COMMANDS.some(cmd => normalized.includes(cmd))) {
        console.log('[maya:speech] ENROLL intent detected')
        // Try to extract a name: "cadastrar voz para Juliano"
        const nameMatch = normalized.match(/(?:para|de)\s+([a-záàãâéêíóôõúüç][a-záàãâéêíóôõúüç\s]{1,39})/i)
        const suggestedName = nameMatch ? nameMatch[1].trim() : ''
        window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName } }))
        // Also send to LLM so Maya acknowledges verbally
        addUserMessage(raw.trim())
        void sendMessage({ message: raw.trim() })
        return
      }

      // ── Speaker verification (opt-in, enabled after first enrollment) ─────
      const verifyEnabled = typeof localStorage !== 'undefined' && localStorage.getItem('maya_speaker_verify_enabled') === 'true'
      const audioB64: string | null = e?.detail?.audioB64 ?? null

      if (verifyEnabled && audioB64) {
        // Run verification before sending to LLM (async within event handler)
        stopCurrentAudio()
        abortRef.current?.abort()
        setStatus('thinking')

        const runVerify = async () => {
          let speakerPrefix = ''
          try {
            const rawThreshold = localStorage.getItem('maya_verify_threshold')
            const initialThreshold = rawThreshold ? parseFloat(rawThreshold) : INITIAL_THRESHOLD_DEFAULT

            // ── Session trust: already verified this session ──────────────
            if (_sessionSpeaker) {
              // Still verify, but use the much lower session threshold
              const res = await fetch('/api/speaker-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioB64, threshold: SESSION_THRESHOLD }),
              })
              const result = await res.json()
              console.log(`[maya:speech] session-verify: match=${result.match}, conf=${result.confidence}, trusted=${_sessionSpeaker}`)

              if (result.reason === 'compared' && !result.match) {
                // Different person took over mid-session
                console.log(`[maya:speech] SESSION HIJACK detected (conf=${result.confidence}) — clearing trust`)
                _clearSession()
                setStatus('idle')
                window.dispatchEvent(new CustomEvent('maya:speech-denied', { detail: { confidence: result.confidence } }))
                void speakText('Sessão encerrada. Voz diferente detectada.')
                return
              }
              // Refresh session timer on activity
              _touchSession(_sessionSpeaker)
              speakerPrefix = `[Falante: ${_sessionSpeaker}] `
            } else {
              // ── Initial verification: require full confidence ─────────────
              const res = await fetch('/api/speaker-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioB64, threshold: initialThreshold }),
              })
              const result = await res.json()
              console.log(`[maya:speech] verification: match=${result.match}, speaker=${result.speaker}, conf=${result.confidence}, reason=${result.reason}`)

              if (result.reason === 'compared') {
                if (result.match) {
                  // Verified — start session trust
                  _touchSession(result.speaker ?? 'unknown')
                  speakerPrefix = `[Falante: ${result.speaker}] `
                  console.log(`[maya:speech] session trust started for "${result.speaker}" (conf=${result.confidence})`)
                } else {
                  console.log(`[maya:speech] BLOQUEADO — falante não reconhecido (confiança=${result.confidence}, threshold=${initialThreshold})`)
                  setStatus('idle')
                  window.dispatchEvent(new CustomEvent('maya:speech-denied', {
                    detail: { confidence: result.confidence, threshold: initialThreshold },
                  }))
                  void speakText('Desculpe, não reconheci sua voz. Acesso negado.')
                  return
                }
              }
              // reason === 'no_enrollment': acesso livre | 'no_voice_detected' | 'error': fail-open
            }
          } catch (err) {
            console.warn('[maya:speech] verification failed (fail open):', err)
          }
          const finalMessage = speakerPrefix + raw.trim()
          addUserMessage(raw.trim())
          void sendMessage({ message: finalMessage })
        }
        void runVerify()
        return
      }

      // Normal message (no verification)
      console.log(`[maya:speech] SENDING to LLM: "${raw.trim()}"`)
      stopCurrentAudio()
      abortRef.current?.abort()
      setStatus('thinking')
      addUserMessage(raw.trim())
      void sendMessage({ message: raw.trim() })
    }
    window.addEventListener('maya:speech', handler as EventListener)
    return () => window.removeEventListener('maya:speech', handler as EventListener)
  }, [addUserMessage, sendMessage, setStatus, setListen])

  const clear = useCallback(() => setMessages([]), [])

  const stopAudio = useCallback(() => {
    stopCurrentAudio()
    abortRef.current?.abort()
    sendingRef.current = false
    setStatus('idle')
  }, [setStatus])

  // maya:stop event — fired by CentralOrb click or other UI controls
  useEffect(() => {
    const handler = () => {
      abortRef.current?.abort()
      sendingRef.current = false
    }
    window.addEventListener('maya:stop', handler)
    return () => window.removeEventListener('maya:stop', handler)
  }, [])

  // maya:standby-requested — user said "Maya, pare de escutar" (intercepted before reaching LLM)
  useEffect(() => {
    const handler = async () => {
      // Speak acknowledgement then restore standby orb state
      await speakText('Certo, Sir. Entrando em modo de espera.', () => {
        try { window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'speaking (standby)' } })) } catch (_) {}
      })
      // After TTS finishes, put orb back to standby (not idle)
      try { window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'standby' } })) } catch (_) {}
    }
    window.addEventListener('maya:standby-requested', handler as EventListener)
    return () => window.removeEventListener('maya:standby-requested', handler as EventListener)
  }, [])

  return { messages, status: _status, listenEnabled, setListen, sendMessage, addUserMessage, stopAudio, clear }
}
