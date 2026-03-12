"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useSpeakerVerify } from '../../hooks/useSpeakerVerify'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'name' | 'recording' | 'processing' | 'done' | 'error'

interface Props {
  /** Suggested name pre-filled (e.g. from "Cadastrar voz para Juliano"). */
  suggestedName?: string
  onClose: () => void
  onEnrolled?: (name: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECORD_SECS = 5

/** Texto de amostra para o usuário ler em voz alta durante a gravação.
 *  ~5 segundos em ritmo normal de fala. Não contém a wake word (Maya/Maia). */
const SAMPLE_TEXT =
  'Acesso autorizado. Este sistema registra minha voz para identificação biométrica segura. Confirmando identidade do operador agora.'

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceEnrollModal({ suggestedName = '', onClose, onEnrolled }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState(suggestedName)
  const [countdown, setCountdown] = useState(RECORD_SECS)
  const [message, setMessage] = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { enrollByName } = useSpeakerVerify()

  // Focus input when modal opens
  useEffect(() => { inputRef.current?.focus() }, [])

  // Silence Maya while the enrollment modal is open so she doesn't respond
  // to the sample phrase being read aloud.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('maya:enroll-start'))
    return () => { window.dispatchEvent(new CustomEvent('maya:enroll-end')) }
  }, [])

  function clearCountdown() {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }

  // Cleanup on unmount
  useEffect(() => () => clearCountdown(), [])

  // ── Start recording phase ─────────────────────────────────────────────────

  function startRecording() {
    if (!name.trim()) return
    setStep('recording')
    setCountdown(RECORD_SECS)

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearCountdown()
          void finishRecording()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Grab audio from rolling buffer and enroll ─────────────────────────────

  async function finishRecording() {
    setStep('processing')

    // The rolling PCM16 buffer in MicPermissionOverlay captures audio continuously.
    // We grab the last RECORD_SECS seconds.
    const getAudio = (window as any).__mayaGetLastAudioB64 as ((sec: number) => string | null) | undefined
    const audioB64 = getAudio?.(RECORD_SECS) ?? null

    if (!audioB64) {
      setStep('error')
      setMessage('Áudio não capturado. Certifique-se de que o microfone está ativo e fale novamente.')
      return
    }

    const result = await enrollByName(name.trim(), audioB64)
    if (result.ok) {
      setStep('done')
      setMessage(`Voz de "${name.trim()}" cadastrada com sucesso!`)
      onEnrolled?.(name.trim())
      // Auto-close after 2s
      setTimeout(() => onClose(), 2000)
    } else {
      setStep('error')
      setMessage(result.error ?? 'Erro ao salvar o perfil de voz.')
    }
  }

  // ── Key handler for name input ────────────────────────────────────────────

  function onNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && name.trim()) startRecording()
    if (e.key === 'Escape') onClose()
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.80)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  }

  const card: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(2,6,9,0.97) 0%, rgba(0,20,35,0.97) 100%)',
    border: '1px solid rgba(0,212,255,0.30)',
    borderRadius: 16,
    padding: '32px 36px',
    width: 360,
    maxWidth: '92vw',
    boxShadow: '0 0 60px rgba(0,212,255,0.12)',
    fontFamily: 'Orbitron, sans-serif',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  }

  const title: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, letterSpacing: 3, color: '#00d4ff', textTransform: 'uppercase',
  }

  const subtitle: React.CSSProperties = {
    fontSize: 11, color: '#94a3b8', letterSpacing: 1, marginTop: -12,
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,212,255,0.06)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 15,
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const btn = (accent: string, disabled?: boolean): React.CSSProperties => ({
    background: disabled ? 'rgba(0,212,255,0.04)' : `rgba(${accent},0.12)`,
    border: `1px solid rgba(${accent},${disabled ? '0.15' : '0.5'})`,
    color: disabled ? '#475569' : `rgba(${accent},1)`,
    borderRadius: 8,
    padding: '10px 0',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase' as const,
    flex: 1,
  })

  // ── Ring progress ─────────────────────────────────────────────────────────

  const progress = step === 'recording' ? ((RECORD_SECS - countdown) / RECORD_SECS) * 100 : 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={card}>

        {/* Header */}
        <div>
          <div style={title}>⬡ CADASTRAR VOZ</div>
          <div style={subtitle}>Identificação biométrica de voz</div>
        </div>

        {/* Step: enter name */}
        {step === 'name' && (
          <>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              Informe o nome da pessoa e clique em <strong style={{ color: '#00d4ff' }}>GRAVAR</strong>.
              Fale por <strong style={{ color: '#00ff88' }}>{RECORD_SECS} segundos</strong> — leia o texto abaixo em voz alta.
            </div>
            {/* Sample text preview */}
            <div style={{
              background: 'rgba(0,255,136,0.05)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: 'rgba(0,255,136,0.75)',
              fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.7,
              letterSpacing: 0.3,
            }}>
              <span style={{ fontSize: 9, color: 'rgba(0,255,136,0.45)', display: 'block', marginBottom: 4, letterSpacing: 2 }}>TEXTO DE AMOSTRA</span>
              &ldquo;{SAMPLE_TEXT}&rdquo;
            </div>
            <input
              ref={inputRef}
              style={inputStyle}
              placeholder="Ex: Juliano"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={onNameKeyDown}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btn('148,163,184', true) as React.CSSProperties} onClick={onClose}>Cancelar</button>
              <button
                style={btn('0,212,255', !name.trim())}
                onClick={() => { if (name.trim()) startRecording() }}
                disabled={!name.trim()}
              >
                ▶ Gravar
              </button>
            </div>
          </>
        )}

        {/* Step: recording */}
        {step === 'recording' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#00d4ff', lineHeight: 1, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
                {countdown}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', letterSpacing: 1 }}>SEGUNDOS RESTANTES</div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(0,212,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#00d4ff', transition: 'width 1s linear', borderRadius: 4 }} />
            </div>

            <div style={{ fontSize: 12, color: '#00ff88', textAlign: 'center', letterSpacing: 1 }}>
              🎙 GRAVANDO — leia o texto abaixo em voz alta
            </div>
            {/* Sample text to read — highlighted during recording */}
            <div style={{
              background: 'rgba(0,212,255,0.07)',
              border: '1px solid rgba(0,212,255,0.35)',
              borderRadius: 8, padding: '12px 16px',
              fontSize: 13, color: '#e2e8f0',
              fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.8,
              textAlign: 'center', letterSpacing: 0.3,
              boxShadow: '0 0 16px rgba(0,212,255,0.08)',
            }}>
              &ldquo;{SAMPLE_TEXT}&rdquo;
            </div>
          </>
        )}

        {/* Step: processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 13, color: '#00d4ff', letterSpacing: 2 }}>PROCESSANDO...</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Extração do perfil biométrico</div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 13, color: '#00ff88', letterSpacing: 1 }}>{message}</div>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <>
            <div style={{ fontSize: 12, color: '#f87171', lineHeight: 1.6 }}>{message}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btn('148,163,184')} onClick={onClose}>Fechar</button>
              <button style={btn('0,212,255')} onClick={() => { setStep('name'); setMessage('') }}>Tentar novamente</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
