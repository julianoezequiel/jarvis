"use client"
import React, { useState } from 'react'

// ─── Rolling PCM16 audio buffer (for speaker verification) ───────────────────
// Captures raw 16kHz mono PCM alongside SpeechRecognition.
// Exposed as window.__mayaGetLastAudioB64(durationSec) → base64 WAV string.
let _audioCtx: AudioContext | null = null
const RING_RATE = 16000
const RING_SECS = 8
const _ring = new Float32Array(RING_RATE * RING_SECS)
let _ringHead = 0

function _buildWAV(pcm: Int16Array, sampleRate: number): ArrayBuffer {
  const bl = 44 + pcm.length * 2
  const buf = new ArrayBuffer(bl)
  const dv = new DataView(buf)
  const w4 = (o: number, s: string) => { for (let i = 0; i < 4; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  w4(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true)
  w4(8, 'WAVE'); w4(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true)
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
  w4(36, 'data'); dv.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) dv.setInt16(44 + i * 2, pcm[i], true)
  return buf
}

function _initRollingAudio(stream: MediaStream) {
  if (_audioCtx) return
  try {
    _audioCtx = new AudioContext({ sampleRate: RING_RATE })
    const source = _audioCtx.createMediaStreamSource(stream)
    // ScriptProcessorNode is deprecated but universally supported; AudioWorklet needs extra setup
    const proc = _audioCtx.createScriptProcessor(2048, 1, 1)
    const ringSize = _ring.length
    proc.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        _ring[_ringHead % ringSize] = data[i]
        _ringHead++
      }
    }
    source.connect(proc)
    proc.connect(_audioCtx.destination)
    console.log('[maya:mic] rolling PCM16 buffer initialized (8s @ 16kHz)')
  } catch (e) {
    console.warn('[maya:mic] rolling audio init failed:', e)
  }
}

function _getLastAudioB64(durationSec = 5): string | null {
  if (_ringHead < RING_RATE * 0.5) return null
  const n = Math.min(durationSec * RING_RATE, _ringHead)
  const ringSize = _ring.length
  const start = Math.max(0, _ringHead - n)
  const pcm = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    const s = _ring[(start + i) % ringSize]
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)))
  }
  const wavBuf = _buildWAV(pcm, RING_RATE)
  const bytes = new Uint8Array(wavBuf)
  let b = ''
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i])
  return btoa(b)
}

// Exposed on window so external hooks can capture audio on demand
if (typeof window !== 'undefined') {
  ;(window as any).__mayaGetLastAudioB64 = _getLastAudioB64
}

// ─── Persistent recognition manager (module-level, survives component unmount) ───
// Lives outside React so it never gets killed by component lifecycle.
let _rec: any = null
let _recStopped = false
let _watchdogTimer: ReturnType<typeof setInterval> | null = null
// Timestamp of last actual speech (interim/final). 0 = never.
// Used to decide restart delay: fast if user was just talking, slow if idle.
// Debounce pending final transcript to avoid cutting user speech
let _finalTimer: ReturnType<typeof setTimeout> | null = null
let _pendingFinalText = ''
let _lastInterimTs = 0
let _lastInterimText = '' // last interim seen — used to rescue speech if Chrome never emits final
let _commitTimer: ReturnType<typeof setTimeout> | null = null // bridges text across session restarts
let _micStream: MediaStream | null = null // physical mic stream — muted at hardware level during TTS
let _muteResumeTimer: ReturnType<typeof setTimeout> | null = null // pending echo-guard resume
let _userMuted = false // mute state set by user (CentralOrb click) — persists until toggled

// ─── Wake word gate ─────────────────────────────────────────────────────────
// Default ON. OFF = ouve tudo (modo widget embutido).
// Toggle via localStorage 'maya_wake_word_enabled' = 'true'|'false'
let _wakeActive = false    // true: aguardando comando na janela de conversa
let _wakeTimer: ReturnType<typeof setTimeout> | null = null
const WAKE_INITIAL_MS = 12000  // janela inicial (só ouviu "maya", sem comando ainda)

function isWakeWordEnabled(): boolean {
  try { return localStorage.getItem('maya_wake_word_enabled') !== 'false' } catch { return true }
}

// Tempo de conversa após o primeiro comando: configuravel em segundos (default 60s)
function getConversationTimeoutMs(): number {
  try {
    const v = localStorage.getItem('maya_conversation_timeout_sec')
    return v ? Math.max(5, parseFloat(v)) * 1000 : 60000
  } catch { return 60000 }
}

function activateWakeWord(timeoutMs = WAKE_INITIAL_MS) {
  if (_wakeTimer) clearTimeout(_wakeTimer)
  _wakeActive = true
  window.dispatchEvent(new CustomEvent('maya:wake-activated', { detail: { timeoutMs } }))
  console.log(`[maya:mic] WAKE ativo — janela de ${timeoutMs / 1000}s`)
  _wakeTimer = setTimeout(() => {
    _wakeActive = false
    _wakeTimer = null
    window.dispatchEvent(new CustomEvent('maya:wake-deactivated'))
    console.log('[maya:mic] wake timeout — voltando ao standby')
  }, timeoutMs)
}

function deactivateWakeWord() {
  if (_wakeTimer) { clearTimeout(_wakeTimer); _wakeTimer = null }
  _wakeActive = false
  window.dispatchEvent(new CustomEvent('maya:wake-deactivated'))
}

// Detecta variações fonéticas do nome "Maya" (pt-BR transcreve como "Maia")
const WAKE_REGEX = /\b(maya|maia|maias|mayas)\b/i
const WAKE_STRIP_REGEX = /^.*?\b(?:maya|maia|maias|mayas)[,!.?]?\s*/i

// Ponto central de despacho — aplica o gate de wake word
function dispatchSpeech(text: string) {
  if (!isWakeWordEnabled()) {
    // Modo sempre ativo (widget embutido, wake word desligado)
    window.dispatchEvent(new CustomEvent('maya:speech', { detail: { text, audioB64: _getLastAudioB64(5) } }))
    return
  }
  if (_wakeActive) {
    // Wake word já detectada — este é o comando
    window.dispatchEvent(new CustomEvent('maya:speech', { detail: { text, audioB64: _getLastAudioB64(5) } }))
    // Reativa com o timeout de conversa — usuário pode falar de novo sem dizer "Maya"
    activateWakeWord(getConversationTimeoutMs())
    return
  }
  // Modo standby: só processa se contiver "maya" / "maia" e variações
  if (WAKE_REGEX.test(text)) {
    const command = text.replace(WAKE_STRIP_REGEX, '').trim()
    if (command.length > 2) {
      // "maya, qual o tempo?" — wake word + comando na mesma frase
      activateWakeWord(getConversationTimeoutMs())
      window.dispatchEvent(new CustomEvent('maya:speech', { detail: { text: command, audioB64: _getLastAudioB64(5) } }))
      // Mantém wake ativo com timeout de conversa (usuário já enviou um comando)
      activateWakeWord(getConversationTimeoutMs())
      console.log(`[maya:mic] wake+comando na mesma frase: "${command}"`)
    } else {
      // Só "maya" — ativa e aguarda a próxima frase
      activateWakeWord()
    }
  }
  // else: sem wake word → descarta silenciosamente
}

function setMicTrackEnabled(enabled: boolean) {
  if (!_micStream) return
  _micStream.getAudioTracks().forEach(t => { t.enabled = enabled })
  console.log(`[maya:mic] hardware track ${enabled ? 'UN-MUTED' : 'MUTED'}`)
}

function flushPendingFinal() {
  try {
    if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null }
    if (_finalTimer) { clearTimeout(_finalTimer); _finalTimer = null }
    const text = _pendingFinalText || _lastInterimText
    _pendingFinalText = ''
    _lastInterimText = ''
    if (text) {
      dispatchSpeech(text)
      console.log('[maya:mic] flushed pending:', text)
    }
  } catch (e) { console.warn('[maya:mic] flushPendingFinal error', e) }
}

// Schedules a commit after 2s of silence.
// Cancelled if new speech arrives — prevents splitting sentences across session restarts.
function scheduleCommit() {
  if (_commitTimer) clearTimeout(_commitTimer)
  _commitTimer = setTimeout(() => {
    _commitTimer = null
    if (_finalTimer) { clearTimeout(_finalTimer); _finalTimer = null }
    const text = (_pendingFinalText + ' ' + _lastInterimText).trim()
    _pendingFinalText = ''
    _lastInterimText = ''
    if (text) {
      dispatchSpeech(text)
      console.log('[maya:mic] commit (silence 2s):', text)
    }
  }, 2000)
}

function startRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return

  if (_rec) {
    try { _rec.stop() } catch (_) {}
    // flush any pending final text before replacing the instance
    try { flushPendingFinal() } catch (_) {}
    _rec = null
  }

  const rec = new SpeechRecognition()
  rec.lang = 'pt-BR'
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 3
  _rec = rec

  rec.onresult = (ev: any) => {
    try {
      // Block any speech result when user has deliberately muted
      if (_userMuted) return
      let finalText = ''
      let interimText = ''
      // Pick the alternative with highest confidence when available
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) {
          // Escolhe a alternativa com maior confiança
          let best = r[0]
          for (let a = 1; a < r.length; a++) {
            if (r[a].confidence > best.confidence) best = r[a]
          }
          finalText += best.transcript
        } else {
          interimText += r[0].transcript
        }
      }

      // Emite parcial para exibição na caption
      if (interimText && interimText.trim()) {
        if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null } // user still speaking
        _lastInterimTs = Date.now()
        _lastInterimText = interimText.trim()
        if (isWakeWordEnabled()) {
          if (_wakeActive) {
            // Wake ativa: mostra o que o usuário está dizendo
            window.dispatchEvent(new CustomEvent('maya:speech-partial', { detail: { text: interimText.trim() } }))
          } else if (WAKE_REGEX.test(interimText)) {
            // Standby: usuário está dizendo a wake word — sinaliza que detectou
            window.dispatchEvent(new CustomEvent('maya:speech-partial', { detail: { text: interimText.trim(), wakeDetecting: true } }))
          }
          // else: standby sem wake word → sem legenda (silencioso)
        } else {
          // Wake word desativado: mostra tudo
          window.dispatchEvent(new CustomEvent('maya:speech-partial', { detail: { text: interimText.trim() } }))
        }
        console.log('[maya:mic] speech interim:', interimText.trim())
      }

      // Processa texto final de forma INDEPENDENTE do interim (bug fix: não descartar final)
      if (finalText && finalText.trim()) {
        if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null } // real final — no need for commit
        _lastInterimText = '' // real final received — no need to rescue
        // Acumula frases finais consecutivas (ex: frase longa com pausas)
        _pendingFinalText = (_pendingFinalText ? _pendingFinalText + ' ' + finalText.trim() : finalText.trim())
        if (_finalTimer) clearTimeout(_finalTimer)
        // Debounce adaptativo: increase slightly to avoid truncated finals
        const hasRecentInterim = interimText.trim().length > 0
        const debounceMs = hasRecentInterim ? 1400 : 900
        _finalTimer = setTimeout(() => {
          if (_pendingFinalText) {
            dispatchSpeech(_pendingFinalText)
            console.log('[maya:mic] speech final (debounced):', _pendingFinalText)
          }
          _pendingFinalText = ''
          _finalTimer = null
        }, debounceMs)
      }
    } catch (e) { console.warn('[maya:mic] onresult error', e) }
  }

  rec.onstart = () => {
    console.log('[maya:mic] onstart')
    // Do NOT update _lastInterimTs here — only real speech (onresult) should set it
    window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'listening' } }))
  }

  rec.onend = () => {
    if (_recStopped) {
      console.log('[maya:mic] NOT restarting — deliberately stopped')
      return
    }

    const now = Date.now()
    const interimAge = _lastInterimTs > 0 ? now - _lastInterimTs : Infinity

    if (_lastInterimText && interimAge < 3000) {
      // User was speaking recently: carry interim into pending buffer.
      // scheduleCommit() will dispatch after 2s of silence.
      // If the user keeps speaking, new onresult will cancel it (no split sentences).
      if (!_pendingFinalText) {
        _pendingFinalText = _lastInterimText
        console.log('[maya:mic] onend: bridging interim to next session:', _pendingFinalText)
      }
      _lastInterimText = ''
      scheduleCommit()
    } else {
      flushPendingFinal()
    }

    const delay = (interimAge < 3000) ? 300 : 3000
    console.log(`[maya:mic] onend — restarting in ${delay}ms`)
    setTimeout(() => {
      if (!_recStopped) startRecognition()
    }, delay)
  }

  rec.onerror = (err: any) => {
    const errType = err?.error

    // Erros normais/esperados — não fazer nada, onend vai reiniciar automaticamente
    if (errType === 'aborted' || errType === 'no-speech') {
      console.log(`[maya:mic] onerror ignorado (${errType}) — onend vai reiniciar`)
      return
    }

    // Erro de rede — logar e aguardar onend reiniciar
    if (errType === 'network') {
      console.warn('[maya:mic] erro de rede — aguardando onend para reiniciar')
      return
    }

    // Permissão revogada — parar definitivamente
    if (errType === 'not-allowed' || errType === 'service-not-allowed') {
      console.error('[maya:mic] permissão negada — reconhecimento desativado')
      _recStopped = true
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
      return
    }

    // Qualquer outro erro inesperado
    console.warn('[maya:mic] onerror inesperado:', errType, err)
    window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
  }

  rec.onspeechstart = () => {
    console.log('[maya:mic] onspeechstart')
    window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'listening' } }))
  }

  rec.onspeechend = () => {
    console.log('[maya:mic] onspeechend')
    window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
  }

  try {
    rec.start()
    console.log('[maya:mic] recognition started')
  } catch (e) {
    console.error('[maya:mic] failed to start', e)
    // Retry after delay
    setTimeout(() => { if (!_recStopped) startRecognition() }, 1000)
  }

  // Expose for debugging
  ;(window as any).__maya_rec = rec
}

function setupUserMute() {
  window.addEventListener('maya:mute', (ev: any) => {
    const muted = (ev as CustomEvent<{ muted: boolean }>).detail?.muted ?? false
    _userMuted = muted
    console.log(`[maya:mic] user mute → ${muted}`)
    if (muted) {
      // Descarta qualquer texto pendente
      _pendingFinalText = ''
      _lastInterimText = ''
      if (_finalTimer) { clearTimeout(_finalTimer); _finalTimer = null }
      if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null }
      // Para o hardware e o reconhecimento
      setMicTrackEnabled(false)
      _recStopped = true
      try { _rec?.stop() } catch (_) {}
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'muted' } }))
    } else {
      // Reativa hardware e reconhecimento imediatamente
      setMicTrackEnabled(true)
      _recStopped = false
      startRecognition()
      const reactivateStatus = isWakeWordEnabled() ? 'standby' : 'idle'
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: reactivateStatus } }))
    }
  })
}

function setupListenControl() {
  window.addEventListener('maya:listen-control', (ev: any) => {
    const enabled = ev?.detail?.enabled
    console.log(`[maya:mic] maya:listen-control — enabled=${enabled}`)
    if (enabled === false) {
      // Cancel any pending resume timer
      if (_muteResumeTimer) { clearTimeout(_muteResumeTimer); _muteResumeTimer = null }
      // Descarta texto interim pendente durante fala da Maya (evita capturar eco)
      _pendingFinalText = ''
      _lastInterimText = ''
      if (_finalTimer) { clearTimeout(_finalTimer); _finalTimer = null }
      if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null }
      // Mute hardware track first — stops audio flowing to recognition
      setMicTrackEnabled(false)
      _recStopped = true
      try { _rec?.stop() } catch (_) {}
      console.log('[maya:mic] MUTED (hardware + recognition)')
    } else if (enabled === true) {
      // Cancel any previous resume timer to avoid duplicates
      if (_muteResumeTimer) { clearTimeout(_muteResumeTimer); _muteResumeTimer = null }
      _muteResumeTimer = setTimeout(() => {
        _muteResumeTimer = null
        if (_recStopped) {
          // Was not cancelled by another disable — safe to unmute
          setMicTrackEnabled(true)
          _recStopped = false
          startRecognition()
          console.log('[maya:mic] UN-MUTED — recognition restarted')
        }
      }, 1500) // 1.5s: enough for speaker echo to die
      console.log('[maya:mic] scheduled UN-MUTE in 1500ms')
    }
  })
}

// Auto-inicializar microfone quando o boot terminar (sem overlay de permissão)
if (typeof window !== 'undefined') {
  let _micInitialized = false
  window.addEventListener('maya:init-mic', () => {
    if (_micInitialized) return
    _micInitialized = true
    console.log('[maya:mic] auto-init via maya:init-mic')
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then((stream) => {
        _micStream = stream
        _initRollingAudio(stream)
        setupListenControl()
        setupUserMute()
        startRecognition()
        startWatchdog()
        if (isWakeWordEnabled()) {
          window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'standby' } }))
        }
        console.log('[maya:mic] auto-init: recognition started')
      })
      .catch((e) => {
        console.warn('[maya:mic] getUserMedia failed — starting recognition anyway (may be already granted)', e)
        setupListenControl()
        setupUserMute()
        startRecognition()
        startWatchdog()
        if (isWakeWordEnabled()) {
          window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'standby' } }))
        }
      })
  })
}

function startWatchdog() {
  if (_watchdogTimer) return
  // Every 8s, check if recognition is in a dead state and revive it
  _watchdogTimer = setInterval(() => {
    if (_recStopped) return
    const state = _rec?.readyState ?? _rec?.state
    // readyState: 0=inactive, 1=active. If rec disappeared or inactive, restart.
    if (!_rec || (state !== undefined && state === 0)) {
      console.warn('[maya:mic] watchdog: recognition dead — restarting')
      startRecognition()
      // reset last interim timestamp so we don't immediately retrigger
      _lastInterimTs = Date.now()
      return
    }

    // If we haven't received any interim transcript for a long time, assume recognition stalled
    const now = Date.now()
    const STALLED_MS = 30_000 // 30s without interim -> consider stalled
    if (_lastInterimTs && now - _lastInterimTs > STALLED_MS) {
      console.warn('[maya:mic] watchdog: no interim results for', now - _lastInterimTs, 'ms — restarting recognition')
      try {
        startRecognition()
        // reset marker to avoid repeated restarts
        _lastInterimTs = Date.now()
      } catch (e) {
        console.warn('[maya:mic] watchdog restart failed', e)
      }
    }
  }, 8000)
}

export default function MicPermissionOverlay({ onGranted, onDenied }: { onGranted: () => void; onDenied?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestMic() {
    setLoading(true)
    setError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setLoading(false)
      // Start persistent recognition manager (survives this component unmounting)
      try {
        setupListenControl()
        startRecognition()
        startWatchdog()
        if (isWakeWordEnabled()) {
          window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'standby' } }))
        }
      } catch (err) {
        console.error('[maya:mic] recognition init failed', err)
      }
      onGranted()
    } catch (e: any) {
      setLoading(false)
      setError(e?.message || 'Permission denied')
      onDenied && onDenied()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#071017] p-6 rounded shadow-lg w-96 text-center">
        <h3 className="text-mayaCyan mb-2">Permitir microfone</h3>
        <p className="text-xs text-gray-300 mb-4">A Maya precisa acessar o microfone para iniciar a sessão de voz.</p>
        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        <div className="flex justify-center gap-2">
          <button onClick={requestMic} className="px-4 py-2 bg-mayaCyan rounded text-black" disabled={loading}>
            {loading ? 'Aguardando...' : 'Permitir Microfone'}
          </button>
        </div>
      </div>
    </div>
  )
}

