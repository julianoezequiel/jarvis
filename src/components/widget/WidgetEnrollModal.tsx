'use client'

/**
 * WidgetEnrollModal — Phase 4
 *
 * Widget-native voice enrollment modal. Functionally equivalent to the cockpit
 * VoiceEnrollModal but:
 *   - Accepts `accentColor` prop for theme consistency with the host widget
 *   - Dispatches `maya:enroll-complete` when enrollment finishes (success or failure)
 *   - z-index 10001 (above WidgetSettingsModal at 10000)
 *   - 100% inline styles — no Tailwind, no class leakage
 *
 * Event contract:
 *   Trigger : `maya:enroll-intent`  → { suggestedName?: string }          (internal, from WidgetSettingsModal)
 *   Trigger : `maya:enroll-voice`   → { name?: string; userId?: string }   (external host API)
 *   Complete: `maya:enroll-complete`→ { name: string; userId?: string; success: boolean; error?: string }
 */

import React, { useState, useEffect, useRef } from 'react'
import { useSpeakerVerify } from '../../hooks/useSpeakerVerify'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'name' | 'recording' | 'processing' | 'done' | 'error'

export interface WidgetEnrollModalProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-filled name (from enroll-intent detail or external event) */
  suggestedName?: string
  /** userId from the external host (passed through to enroll-complete) */
  userId?: string
  accentColor?: string
  onEnrolled?: (name: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECORD_SECS = 5
const MONO = `Orbitron, "Share Tech Mono", ui-monospace, monospace`

// ─── Component ────────────────────────────────────────────────────────────────

export default function WidgetEnrollModal({
  isOpen,
  onClose,
  suggestedName = '',
  userId,
  accentColor = '#00d4ff',
  onEnrolled,
}: WidgetEnrollModalProps) {
  const [step, setStep]           = useState<Step>('name')
  const [name, setName]           = useState(suggestedName)
  const [countdown, setCountdown] = useState(RECORD_SECS)
  const [message, setMessage]     = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const { enrollByName } = useSpeakerVerify()

  // Reset state every time the modal opens with (possibly) a new suggestedName
  useEffect(() => {
    if (isOpen) {
      setStep('name')
      setName(suggestedName)
      setMessage('')
      setCountdown(RECORD_SECS)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen, suggestedName])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup countdown on unmount
  useEffect(() => () => clearCountdown(), [])

  function clearCountdown() {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }

  function handleClose() {
    clearCountdown()
    onClose()
  }

  // ── Start recording ───────────────────────────────────────────────────────

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

  // ── Grab rolling PCM16 buffer and enroll ──────────────────────────────────

  async function finishRecording() {
    setStep('processing')

    const getAudio = (window as { __mayaGetLastAudioB64?: (sec: number) => string | null })
      .__mayaGetLastAudioB64
    const audioB64 = getAudio?.(RECORD_SECS) ?? null

    if (!audioB64) {
      const errMsg = 'Áudio não capturado. Certifique-se de que o microfone está ativo e fale novamente.'
      setStep('error')
      setMessage(errMsg)
      dispatchComplete(name.trim(), false, errMsg)
      return
    }

    const result = await enrollByName(name.trim(), audioB64)
    if (result.ok) {
      setStep('done')
      setMessage(`Voz de "${name.trim()}" cadastrada com sucesso!`)
      dispatchComplete(name.trim(), true)
      onEnrolled?.(name.trim())
      setTimeout(() => handleClose(), 2000)
    } else {
      const errMsg = result.error ?? 'Erro ao salvar o perfil de voz.'
      setStep('error')
      setMessage(errMsg)
      dispatchComplete(name.trim(), false, errMsg)
    }
  }

  function dispatchComplete(enrolledName: string, success: boolean, error?: string) {
    try {
      window.dispatchEvent(new CustomEvent('maya:enroll-complete', {
        detail: { name: enrolledName, userId, success, ...(error ? { error } : {}) },
      }))
    } catch (_) {}
  }

  function onNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && name.trim()) startRecording()
    if (e.key === 'Escape') handleClose()
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const a20 = `${accentColor}33`
  const a30 = `${accentColor}4d`

  const progress = step === 'recording' ? ((RECORD_SECS - countdown) / RECORD_SECS) * 100 : 0

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputSt: React.CSSProperties = {
    background: `${accentColor}0f`,
    border: `1px solid ${a30}`,
    borderRadius: 8,
    color: '#e2e8f0',
    fontFamily: MONO,
    fontSize: 15,
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  function btnSt(active: boolean, danger = false): React.CSSProperties {
    const col = danger ? '239,68,68' : accentColor.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') ?? '0,212,255'
    return {
      flex: 1,
      background: active ? `rgba(${col},0.10)` : 'rgba(100,116,139,0.08)',
      border: `1px solid rgba(${col},${active ? 0.5 : 0.15})`,
      color: active ? (danger ? '#f87171' : accentColor) : '#475569',
      borderRadius: 8,
      padding: '10px 0',
      fontFamily: MONO,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 2,
      cursor: active ? 'pointer' : 'not-allowed',
      textTransform: 'uppercase' as const,
      transition: 'all 0.2s',
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div
      data-testid="widget-enroll-modal"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(2,6,9,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'rgba(2,6,9,0.98)',
        border: `1px solid ${a30}`,
        borderRadius: 14,
        padding: '28px 28px',
        width: 'min(360px, 100%)',
        boxShadow: `0 0 60px rgba(0,0,0,0.9), 0 0 24px ${a20}`,
        fontFamily: MONO,
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: accentColor, textTransform: 'uppercase' }}>
              ⬡ CADASTRAR VOZ
            </div>
            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', letterSpacing: 1, marginTop: 3 }}>
              Identificação biométrica de voz
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar enrollment"
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 16,
              cursor: 'pointer', padding: '2px 6px', fontFamily: MONO,
            }}
          >✕</button>
        </div>

        {/* Step: enter name */}
        {step === 'name' && (
          <>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
              Informe o nome da pessoa e clique em{' '}
              <strong style={{ color: accentColor }}>GRAVAR</strong>.
              Fale por <strong style={{ color: '#00ff88' }}>{RECORD_SECS} seg</strong> para criar o perfil.
            </div>
            <input
              ref={inputRef}
              style={inputSt}
              placeholder="Ex: Juliano"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={onNameKeyDown}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnSt(true, true)} onClick={handleClose}>Cancelar</button>
              <button
                style={btnSt(!!name.trim())}
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
              <div style={{
                fontSize: 52, fontWeight: 900, color: accentColor,
                lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums',
              }}>
                {countdown}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 2 }}>SEGUNDOS RESTANTES</div>
            </div>
            {/* Progress bar */}
            <div style={{ background: `${accentColor}18`, borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: accentColor, transition: 'width 1s linear', borderRadius: 4,
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#00ff88', textAlign: 'center', letterSpacing: 1 }}>
              🎙 GRAVANDO — fale agora com naturalidade
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
              Diga seu nome e qualquer frase em voz normal
            </div>
          </>
        )}

        {/* Step: processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: accentColor, letterSpacing: 2 }}>PROCESSANDO…</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Extração do perfil biométrico</div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 12, color: '#4ade80', letterSpacing: 1 }}>{message}</div>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <>
            <div style={{ fontSize: 12, color: '#f87171', lineHeight: 1.6 }}>{message}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnSt(true, true)} onClick={handleClose}>Fechar</button>
              <button style={btnSt(true)} onClick={() => { setStep('name'); setMessage('') }}>
                Tentar novamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
