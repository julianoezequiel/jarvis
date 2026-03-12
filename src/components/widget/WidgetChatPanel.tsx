'use client'

/**
 * WidgetChatPanel — Phase 3 chat implementation for MayaWidget.
 *
 * Fully self-contained: wraps useMayaChat and handles the
 * message list + input bar with full CSS isolation (inline styles only).
 *
 * Designed to be embedded as the body+footer of MayaSidebar.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useMayaChat } from '../../hooks/useMayaChat'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetChatPanelProps {
  /** Accent hex — should match the orb/sidebar theme. */
  accentColor?: string
  /** Called each time the chat status changes (idle/thinking/speaking/…) */
  onStatusChange?: (status: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif'
const MONO = `Orbitron, "Share Tech Mono", ui-monospace, monospace`
const EMPTY_HINT = 'Como posso ajudar?'

// ─── Dot indicator ────────────────────────────────────────────────────────────

function ThinkingDots({ color }: { color: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-start',
      paddingLeft: 2,
    }}>
      <div style={{
        padding: '9px 14px',
        borderRadius: '12px 12px 12px 2px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        gap: 5,
        alignItems: 'center',
      }}>
        {([0, 200, 400] as const).map((delay) => (
          <span
            key={delay}
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
              animation: `mayaWidgetPulse 1.4s ${delay}ms ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WidgetChatPanel({
  accentColor = '#00d4ff',
  onStatusChange,
}: WidgetChatPanelProps) {
  const { messages, status, sendMessage, addUserMessage, stopAudio } = useMayaChat()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Derived colour tokens
  const a10 = `${accentColor}1a`   // 10 % opacity
  const a25 = `${accentColor}40`   // 25 %
  const a55 = `${accentColor}8c`   // 55 %
  const a80 = `${accentColor}cc`   // 80 %

  const isThinking = status === 'thinking'
  const isSpeaking = status.startsWith('speaking')

  // Propagate status changes to parent (e.g. MayaOrb for visual feedback)
  useEffect(() => { onStatusChange?.(status) }, [status, onStatusChange])

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Auto-resize textarea (up to 5 lines)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const onSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    addUserMessage(trimmed)
    await sendMessage({ message: trimmed })
  }, [text, sendMessage, addUserMessage])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
  }, [onSubmit])

  const canSend = text.trim().length > 0 && !isThinking

  return (
    <>
      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <div
        data-testid="widget-message-list"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          scrollbarWidth: 'thin',
          scrollbarColor: `${a25} transparent`,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && !isThinking && (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: a55,
            fontSize: 12,
            letterSpacing: 1.5,
            fontFamily: MONO,
            padding: '32px 16px',
          }}>
            {EMPTY_HINT}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '86%',
              padding: '9px 13px',
              borderRadius: m.role === 'user'
                ? '14px 14px 3px 14px'
                : '14px 14px 14px 3px',
              background: m.role === 'user'
                ? `linear-gradient(135deg, ${accentColor}20, ${accentColor}12)`
                : m.role === 'system'
                ? 'rgba(109,40,217,0.13)'
                : 'rgba(255,255,255,0.055)',
              border: `1px solid ${
                m.role === 'user'
                  ? a25
                  : m.role === 'system'
                  ? 'rgba(167,139,250,0.22)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              color: m.role === 'user'
                ? '#dff7ff'
                : m.role === 'system'
                ? 'rgba(167,139,250,0.9)'
                : 'rgba(255,255,255,0.87)',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: SANS,
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Thinking dots */}
        {isThinking && <ThinkingDots color={accentColor} />}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 14px 14px',
        borderTop: `1px solid ${a25}`,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}>
        {/* Status strip */}
        {(isThinking || isSpeaking) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 10,
              color: a55,
              letterSpacing: 1.2,
              fontFamily: MONO,
            }}>
              {isThinking ? 'PENSANDO…' : 'FALANDO…'}
            </span>
            {isSpeaking && (
              <button
                onClick={stopAudio}
                aria-label="Parar fala"
                style={{
                  background: 'none',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 4,
                  color: '#f87171',
                  fontSize: 10,
                  letterSpacing: 0.5,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontFamily: MONO,
                }}
              >
                ⏸ parar
              </button>
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            ref={textareaRef}
            data-testid="widget-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mensagem…"
            rows={1}
            disabled={isThinking}
            aria-label="Mensagem para MAYA"
            style={{
              flex: 1,
              background: a10,
              border: `1px solid ${a25}`,
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.9)',
              fontFamily: SANS,
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              minHeight: 38,
              maxHeight: 120,
              overflowY: 'hidden',
              opacity: isThinking ? 0.45 : 1,
              transition: 'border-color 0.2s, opacity 0.2s',
            }}
          />

          <button
            onClick={() => void onSubmit()}
            disabled={!canSend}
            aria-label="Enviar mensagem"
            data-testid="widget-send-btn"
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              background: canSend ? `${accentColor}22` : a10,
              border: `1px solid ${canSend ? a80 : a25}`,
              borderRadius: 8,
              color: canSend ? accentColor : a55,
              fontSize: 15,
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              fontFamily: MONO,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
