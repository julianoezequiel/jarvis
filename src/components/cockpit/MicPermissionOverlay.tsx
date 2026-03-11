"use client"
import React, { useState } from 'react'

// ─── Persistent recognition manager (module-level, survives component unmount) ───
// Lives outside React so it never gets killed by component lifecycle.
let _rec: any = null
let _recStopped = false
let _watchdogTimer: ReturnType<typeof setInterval> | null = null
// Restart/backoff control to avoid tight onend->start loops
let _lastRestartTs = 0
let _restartDelay = 300 // initial delay ms
const RESTART_INITIAL_DELAY = 300
const RESTART_MAX_DELAY = 30000
// Debounce pending final transcript to avoid cutting user speech
let _finalTimer: ReturnType<typeof setTimeout> | null = null
let _pendingFinalText = ''
let _lastInterimTs = 0

function startRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return

  if (_rec) {
    try { _rec.stop() } catch (_) {}
    _rec = null
  }

  const rec = new SpeechRecognition()
  rec.lang = 'pt-BR'
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1
  _rec = rec

  rec.onresult = (ev: any) => {
    try {
      let finalText = ''
      let interimText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }

      // If there's interim text, emit partial immediately and cancel any pending final
      if (interimText && interimText.trim()) {
        _lastInterimTs = Date.now()
        if (_finalTimer) { clearTimeout(_finalTimer); _finalTimer = null; _pendingFinalText = '' }
        window.dispatchEvent(new CustomEvent('maya:speech-partial', { detail: { text: interimText.trim() } }))
        console.log('[maya:mic] speech interim:', interimText.trim())
        return
      }

      // If final text arrives, debounce sending it to allow more speech to arrive
      if (finalText && finalText.trim()) {
        _pendingFinalText = finalText.trim()
        if (_finalTimer) clearTimeout(_finalTimer)
        // base debounce; increase if we received a recent interim (user still speaking)
        const now = Date.now()
        const sinceInterim = now - _lastInterimTs
        // Reduce debounce to be more responsive: base 1200ms, increase to 2000ms if recent interim detected
        let debounceMs = 1200
        if (sinceInterim >= 0 && sinceInterim < 1200) debounceMs = 2000
        _finalTimer = setTimeout(() => {
          if (_pendingFinalText) {
            window.dispatchEvent(new CustomEvent('maya:speech', { detail: { text: _pendingFinalText } }))
            console.log('[maya:mic] speech final (debounced):', _pendingFinalText)
          }
          _pendingFinalText = ''
          _finalTimer = null
        }, debounceMs)
      }
      return
    } catch (e) { console.warn('[maya:mic] onresult error', e) }
  }

  rec.onend = () => {
    console.log(`[maya:mic] onend — _recStopped=${_recStopped}`)
    // Restart after adaptive delay unless deliberately stopped
    const now = Date.now()
    const sinceLast = now - _lastRestartTs
    if (sinceLast < 1000) {
      // frequent restarts -> increase delay exponentially
      _restartDelay = Math.min(_restartDelay * 2, RESTART_MAX_DELAY)
    } else {
      // recovered interval -> reset to initial
      _restartDelay = RESTART_INITIAL_DELAY
    }
    _lastRestartTs = now

    setTimeout(() => {
      if (!_recStopped) {
        console.log('[maya:mic] auto-restarting after onend — delay=', _restartDelay)
        startRecognition()
      } else {
        console.log('[maya:mic] NOT restarting — deliberately stopped')
      }
    }, _restartDelay)
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

function setupListenControl() {
  window.addEventListener('maya:listen-control', (ev: any) => {
    const enabled = ev?.detail?.enabled
    console.log(`[maya:mic] maya:listen-control — enabled=${enabled}`)
    if (enabled === false) {
      _recStopped = true
      try { _rec?.stop() } catch (_) {}
      console.log('[maya:mic] recognition PAUSED')
    } else if (enabled === true) {
      _recStopped = false
      console.log('[maya:mic] recognition RESUMING')
      startRecognition()
    }
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

