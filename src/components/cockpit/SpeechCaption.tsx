"use client"
import React, { useEffect, useRef, useState } from 'react'

// Max chars shown at once — older words slide off to the left
const MAX_CHARS = 80

export default function SpeechCaption() {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [isFinal, setIsFinal] = useState(false)
  const [isDenied, setIsDenied] = useState(false)
  const [isWakeListening, setIsWakeListening] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    }

    const onPartial = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail
      const t = detail?.text as string
      if (!t?.trim()) return
      clearHide()
      // Se está detectando a wake word em standby, mostra sinalizador sutil
      if (detail?.wakeDetecting) {
        setVisible(false) // não mostra o texto ainda
        setIsWakeListening(false)
        return
      }
      setText(t.trim())
      setVisible(true)
      setIsFinal(false)
      setIsDenied(false)
      setIsWakeListening(false) // comando começou a chegar
    }

    const onFinal = (ev: Event) => {
      const t = (ev as CustomEvent)?.detail?.text as string
      clearHide()
      if (t?.trim()) {
        setText(t.trim())
        setVisible(true)
        setIsFinal(true)
        setIsDenied(false)
        setIsWakeListening(false)
      }
      // Hide 2.5s after last final event
      hideTimer.current = setTimeout(() => {
        setVisible(false)
        setText('')
        setIsFinal(false)
        setIsDenied(false)
        setIsWakeListening(false)
      }, 2500)
    }

    const onDenied = () => {
      clearHide()
      setText('Voz não reconhecida — acesso negado')
      setVisible(true)
      setIsFinal(true)
      setIsDenied(true)
      setIsWakeListening(false)
      // Hide after 3.5s
      hideTimer.current = setTimeout(() => {
        setVisible(false)
        setText('')
        setIsFinal(false)
        setIsDenied(false)
        setIsWakeListening(false)
      }, 3500)
    }

    const onWakeActivated = () => {
      clearHide()
      setText('')
      setVisible(false)
      setIsFinal(false)
      setIsDenied(false)
      setIsWakeListening(true)
    }

    const onWakeDeactivated = () => {
      setIsWakeListening(false)
      // Se não há texto exibido, esconde tudo
      hideTimer.current = setTimeout(() => {
        setVisible(false)
        setText('')
      }, 800)
    }

    window.addEventListener('maya:speech-partial', onPartial)
    window.addEventListener('maya:speech', onFinal)
    window.addEventListener('maya:speech-denied', onDenied)
    window.addEventListener('maya:wake-activated', onWakeActivated)
    window.addEventListener('maya:wake-deactivated', onWakeDeactivated)
    return () => {
      window.removeEventListener('maya:speech-partial', onPartial)
      window.removeEventListener('maya:speech', onFinal)
      window.removeEventListener('maya:speech-denied', onDenied)
      window.removeEventListener('maya:wake-activated', onWakeActivated)
      window.removeEventListener('maya:wake-deactivated', onWakeDeactivated)
      clearHide()
    }
  }, [])

  if (!visible && !isWakeListening) return null
  if (!text && !isWakeListening) return null

  // Always show the LATEST portion — chop from the start if text is too long
  const display = text.length > MAX_CHARS ? text.slice(text.length - MAX_CHARS) : text

  return (
    <div className="speech-caption">
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'rgba(2,6,9,0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0,212,255,0.07)',
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: isDenied ? '#ff4444' : isWakeListening ? '#00d4ff' : isFinal ? '#00ff88' : '#00d4ff',
            boxShadow: isDenied ? '0 0 6px #ff4444' : isWakeListening ? '0 0 8px #00d4ff' : isFinal ? '0 0 6px #00ff88' : '0 0 6px #00d4ff',
            animation: (isWakeListening || !isFinal) ? 'pulse 0.6s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: isDenied ? 'rgba(255,68,68,0.9)' : isWakeListening ? 'rgba(0,212,255,1)' : isFinal ? 'rgba(0,255,136,0.7)' : 'rgba(0,212,255,0.7)', textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>
            {isDenied ? 'ACESSO NEGADO' : isWakeListening ? 'MAYA — OUVINDO...' : isFinal ? 'RECEBIDO' : 'ESCUTANDO'}
          </span>
        </div>

        {/* Text — hidden during wake standby; shows command text once user speaks */}
        {(display || (isWakeListening && !display)) && (
          <p style={{
            fontSize: isWakeListening && !display ? '13px' : '15px',
            fontWeight: 500,
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            color: isDenied ? '#ff6666' : isWakeListening && !display ? 'rgba(0,212,255,0.4)' : isFinal ? '#00ff88' : 'rgba(255,255,255,0.90)',
            textShadow: isDenied ? '0 0 10px rgba(255,68,68,0.5)' : isFinal ? '0 0 10px rgba(0,255,136,0.4)' : 'none',
            fontStyle: isWakeListening && !display ? 'italic' : 'normal',
            transition: 'color 0.3s ease, text-shadow 0.3s ease',
          }}>
            {display || (isWakeListening ? 'pode falar o comando...' : '')}
          </p>
        )}

        {/* Scan bar — only while listening */}
        {!isFinal && (
          <div style={{ height: '1px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: '30%',
              background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
              animation: 'captionScan 1.4s linear infinite',
            }} />
          </div>
        )}
      </div>
    </div>
  )
}
