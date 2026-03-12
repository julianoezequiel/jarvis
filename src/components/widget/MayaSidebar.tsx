'use client'

/**
 * MayaSidebar — Phase 2 skeleton.
 *
 * Slide-in panel (380px) that will host the full chat experience in Phase 3.
 * Current state: header + placeholder body + input footer.
 *
 * CSS approach: all layout via inline styles to guarantee CSS isolation.
 * Tailwind classes intentionally avoided here so this component can safely
 * be embedded into any host application without class collisions.
 */

import React from 'react'
import WidgetChatPanel from './WidgetChatPanel'

export type SidebarSide = 'right' | 'left'

interface MayaSidebarProps {
  isOpen: boolean
  side: SidebarSide
  onClose: () => void
  /** Optional accent color (hex) — matches the orb theme */
  accentColor?: string
  /** Propagates chat status changes up to MayaWidget (for orb animation) */
  onStatusChange?: (status: string) => void
  /** Opens the settings modal */
  onSettingsOpen?: () => void
}

const SIDEBAR_WIDTH = 380
const BASE_FONT = `Orbitron, "Share Tech Mono", ui-monospace, monospace`

export default function MayaSidebar({
  isOpen,
  side,
  onClose,
  accentColor = '#00d4ff',
  onStatusChange,
  onSettingsOpen,
}: MayaSidebarProps) {
  const translate = side === 'right'
    ? (isOpen ? 'translateX(0)' : 'translateX(100%)')
    : (isOpen ? 'translateX(0)' : 'translateX(-100%)')

  const accent10 = `${accentColor}1a`   // 10% opacity
  const accent30 = `${accentColor}4d`   // 30%
  const accent60 = `${accentColor}99`   // 60%

  return (
    <div
      className="maya-widget-sidebar"
      role="dialog"
      aria-modal="true"
      aria-label="Maya — Assistente IA"
      aria-hidden={!isOpen}
      style={{
        position: 'fixed',
        top: 0,
        [side]: 0,
        width: SIDEBAR_WIDTH,
        height: '100dvh',   // dynamic vh for mobile
        zIndex: 9999,
        transform: translate,
        transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(2,6,9,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft:  side === 'right' ? `1px solid ${accent30}` : 'none',
        borderRight: side === 'left'  ? `1px solid ${accent30}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: BASE_FONT,
        pointerEvents: isOpen ? 'auto' : 'none',
        boxShadow: side === 'right'
          ? `-8px 0 48px rgba(0,0,0,0.7), inset 1px 0 0 ${accent10}`
          : ` 8px 0 48px rgba(0,0,0,0.7), inset -1px 0 0 ${accent10}`,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${accent30}`,
        flexShrink: 0,
        background: `linear-gradient(to bottom, ${accent10}, transparent)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Pulsing indicator */}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
            animation: 'mayaWidgetPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            color: accentColor,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 3,
          }}>
            MAYA
          </span>
          <span style={{
            background: accent10,
            border: `1px solid ${accent30}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 9,
            color: accent60,
            letterSpacing: 1.5,
          }}>
            AI ASSISTANT
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={onSettingsOpen}
          aria-label="Configurações"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            fontSize: 15,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 4,
            fontFamily: BASE_FONT,
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.color = accentColor
            el.style.background = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.color = 'rgba(255,255,255,0.35)'
            el.style.background = 'none'
          }}
        >
          ⚙
        </button>
        <button
          onClick={onClose}
          aria-label="Fechar sidebar"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 4,
            fontFamily: BASE_FONT,
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.color = '#ffffff'
            el.style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.color = 'rgba(255,255,255,0.4)'
            el.style.background = 'none'
          }}
        >
          ✕
        </button>
        </div>
      </div>

      {/* ── Body + Footer — Phase 3 chat ──────────────────────────────────── */}
      <WidgetChatPanel
        accentColor={accentColor}
        onStatusChange={onStatusChange}
      />

      {/* Animation keyframes + textarea placeholder colour */}
      <style>{`
        @keyframes mayaWidgetPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        .maya-widget-sidebar textarea::placeholder {
          color: ${accentColor}55;
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
