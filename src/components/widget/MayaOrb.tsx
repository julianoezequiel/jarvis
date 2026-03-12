'use client'

/**
 * MayaOrb — draggable floating orb button.
 *
 * Features:
 *  - Fixed-position on screen, draggable via mouse (touch: Phase 5)
 *  - Click vs drag differentiation (4px threshold)
 *  - ARIA: role="button", aria-expanded, keyboard (Enter/Space)
 *  - Dispatches maya:status events are handled by the orb renderer internally
 *  - Position clamped to viewport bounds during drag
 *  - Initial position derived from the `position` prop (corner + margin)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import OrbRenderer from './orbs/OrbRenderer'
import type { OrbConfig } from './orbs/types'

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface MayaOrbProps {
  orbConfig: OrbConfig
  position: WidgetPosition
  isOpen: boolean
  onToggle: () => void
  orbSize?: number  // default canvas diameter in px
}

const EDGE_MARGIN = 20

function initialCoords(position: WidgetPosition, size: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  const m = EDGE_MARGIN
  const w = window.innerWidth
  const h = window.innerHeight
  switch (position) {
    case 'bottom-right': return { x: w - size - m, y: h - size - m }
    case 'bottom-left':  return { x: m,             y: h - size - m }
    case 'top-right':    return { x: w - size - m, y: m             }
    case 'top-left':     return { x: m,             y: m             }
  }
}

export default function MayaOrb({
  orbConfig,
  position,
  isOpen,
  onToggle,
  orbSize = 72,
}: MayaOrbProps) {
  const [coords, setCoords] = useState(() => initialCoords(position, orbSize))

  const isDragging     = useRef(false)
  const hasDragged     = useRef(false)
  const dragOrigin     = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const isHovered      = useRef(false)
  const [hovered, setHovered] = useState(false)

  // ── Mouse event handlers ──────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    hasDragged.current = false
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ox: coords.x, oy: coords.y }
    e.preventDefault()
  }, [coords])

  const onGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragOrigin.current.mx
    const dy = e.clientY - dragOrigin.current.my
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true
    const nx = Math.max(0, Math.min(window.innerWidth  - orbSize, dragOrigin.current.ox + dx))
    const ny = Math.max(0, Math.min(window.innerHeight - orbSize, dragOrigin.current.oy + dy))
    setCoords({ x: nx, y: ny })
  }, [orbSize])

  const onGlobalMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onGlobalMouseMove)
    window.addEventListener('mouseup',   onGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove)
      window.removeEventListener('mouseup',   onGlobalMouseUp)
    }
  }, [onGlobalMouseMove, onGlobalMouseUp])

  // Re-initialize position when window resizes (keep orb in bounds)
  useEffect(() => {
    const onResize = () => {
      setCoords(prev => ({
        x: Math.min(prev.x, window.innerWidth  - orbSize),
        y: Math.min(prev.y, window.innerHeight - orbSize),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [orbSize])

  const handleClick = useCallback(() => {
    if (!hasDragged.current) onToggle()
  }, [onToggle])

  // ── Resolved orb config (inject dynamic size) ─────────────────────────────
  const resolvedConfig: OrbConfig = { ...orbConfig, size: orbSize }

  // ── Active glow color from theme (defaults to Maya cyan) ──────────────────
  const glowColor = orbConfig.theme?.primaryColor ?? '#00d4ff'

  return (
    <div
      role="button"
      aria-label={isOpen ? 'Fechar Maya' : 'Abrir Maya'}
      aria-expanded={isOpen}
      tabIndex={0}
      onMouseDown={onMouseDown}
      onClick={handleClick}
      onMouseEnter={() => { isHovered.current = true; setHovered(true) }}
      onMouseLeave={() => { isHovered.current = false; setHovered(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
      }}
      style={{
        position: 'fixed',
        left: coords.x,
        top: coords.y,
        width: orbSize,
        height: orbSize,
        zIndex: 10000,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        userSelect: 'none',
        outline: 'none',
        filter: isOpen || hovered
          ? `drop-shadow(0 0 18px ${glowColor}88) drop-shadow(0 4px 16px rgba(0,0,0,0.6))`
          : 'drop-shadow(0 4px 20px rgba(0,0,0,0.55))',
        transition: isDragging.current ? 'none' : 'filter 0.25s ease',
        borderRadius: '50%',
      }}
    >
      <OrbRenderer config={resolvedConfig} />
    </div>
  )
}
