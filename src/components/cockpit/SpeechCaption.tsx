"use client"
import React, { useEffect, useRef, useState } from 'react'

// Max chars shown at once — older words slide off to the left
const MAX_CHARS = 80

export default function SpeechCaption() {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [isFinal, setIsFinal] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    }

    const onPartial = (ev: Event) => {
      const t = (ev as CustomEvent)?.detail?.text as string
      if (!t?.trim()) return
      clearHide()
      setText(t.trim())
      setVisible(true)
      setIsFinal(false)
    }

    const onFinal = (ev: Event) => {
      const t = (ev as CustomEvent)?.detail?.text as string
      clearHide()
      if (t?.trim()) {
        setText(t.trim())
        setVisible(true)
        setIsFinal(true)
      }
      // Hide 2.5s after last final event
      hideTimer.current = setTimeout(() => {
        setVisible(false)
        setText('')
        setIsFinal(false)
      }, 2500)
    }

    window.addEventListener('maya:speech-partial', onPartial)
    window.addEventListener('maya:speech', onFinal)
    return () => {
      window.removeEventListener('maya:speech-partial', onPartial)
      window.removeEventListener('maya:speech', onFinal)
      clearHide()
    }
  }, [])

  if (!visible || !text) return null

  // Always show the LATEST portion — chop from the start if text is too long
  const display = text.length > MAX_CHARS ? text.slice(text.length - MAX_CHARS) : text

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: '20px',
      paddingLeft: '24px',
      paddingRight: '24px',
      pointerEvents: 'none',
      animation: 'fadeInCaption 0.2s ease',
    }}>
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
            background: isFinal ? '#00ff88' : '#00d4ff',
            boxShadow: isFinal ? '0 0 6px #00ff88' : '0 0 6px #00d4ff',
            animation: isFinal ? 'none' : 'pulse 0.8s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,212,255,0.5)', textTransform: 'uppercase' }}>
            {isFinal ? 'recebido' : 'escutando'}
          </span>
        </div>

        {/* Text — always shows latest words */}
        <p style={{
          fontSize: '15px',
          fontWeight: 500,
          lineHeight: 1.5,
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          color: isFinal ? '#00ff88' : 'rgba(255,255,255,0.90)',
          textShadow: isFinal ? '0 0 10px rgba(0,255,136,0.4)' : 'none',
          transition: 'color 0.3s ease, text-shadow 0.3s ease',
        }}>
          {display}
        </p>

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
