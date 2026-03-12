'use client'

/**
 * MayaWidget — root embeddable widget component.
 *
 * Composes MayaOrb (draggable floating button) and MayaSidebar (slide-in panel).
 * Manages open/closed state and wires both components together.
 *
 * Usage:
 *   // Default — cyan orb, bottom-right corner
 *   <MayaWidget />
 *
 *   // Custom theme
 *   <MayaWidget config={{
 *     orb: { type: 'default', theme: { primaryColor: '#7c3aed' } },
 *     position: 'bottom-left',
 *     orbSize: 80,
 *   }} />
 *
 * Roadmap:
 *   Phase 2 (current) — Orb + Sidebar skeleton
 *   Phase 3           — Full chat integration (ChatPanel inside sidebar)
 *   Phase 4           — External enrollment API
 *   Phase 5           — Embed script (script tag + iframe)
 */

import React, { useState, useEffect } from 'react'
import MayaOrb, { type WidgetPosition } from './MayaOrb'
import MayaSidebar, { type SidebarSide } from './MayaSidebar'
import WidgetSettingsModal from './WidgetSettingsModal'
import WidgetEnrollModal from './WidgetEnrollModal'
import type { OrbConfig } from './orbs/types'
import { DEFAULT_ORB_CONFIG } from './orbs/types'

// ─── Public config types ──────────────────────────────────────────────────────

export interface MayaWidgetConfig {
  /** Orb type and visual options */
  orb?: Partial<OrbConfig>
  /** Corner where the orb starts. Default: 'bottom-right' */
  position?: WidgetPosition
  /** Orb button diameter in pixels. Default: 72 */
  orbSize?: number
}

interface MayaWidgetProps {
  config?: MayaWidgetConfig
  /** Called whenever the sidebar open/close state changes (used by the embed iframe). */
  onOpenChange?: (isOpen: boolean) => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: Required<MayaWidgetConfig> = {
  orb:      DEFAULT_ORB_CONFIG,
  position: 'bottom-right',
  orbSize:  72,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sideFromPosition(pos: WidgetPosition): SidebarSide {
  return pos.includes('right') ? 'right' : 'left'
}

function resolveOrbConfig(partial?: Partial<OrbConfig>): OrbConfig {
  return { ...DEFAULT_ORB_CONFIG, ...partial }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MayaWidget({ config, onOpenChange }: MayaWidgetProps) {
  const [isOpen, setIsOpen]               = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sideOverride, setSideOverride]     = useState<SidebarSide | null>(null)

  // Notify embed parent whenever open state changes
  useEffect(() => { onOpenChange?.(isOpen) }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 4 — external enrollment events
  const [isEnrollOpen, setIsEnrollOpen]   = useState(false)
  const [enrollName, setEnrollName]       = useState('')
  const [enrollUserId, setEnrollUserId]   = useState<string | undefined>(undefined)

  // Pick up persisted position on first mount (client-only)
  useEffect(() => {
    const stored = localStorage.getItem('maya_widget_position')
    if (stored === 'left' || stored === 'right') setSideOverride(stored)
  }, [])

  // Listen to enrollment events: internal (enroll-intent) and external host API (enroll-voice)
  useEffect(() => {
    function onEnrollIntent(e: Event) {
      const detail = (e as CustomEvent<{ suggestedName?: string }>).detail
      setEnrollName(detail?.suggestedName ?? '')
      setEnrollUserId(undefined)
      setIsOpen(true)
      setIsEnrollOpen(true)
    }
    function onEnrollVoice(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; userId?: string }>).detail
      setEnrollName(detail?.name ?? '')
      setEnrollUserId(detail?.userId)
      setIsOpen(true)
      setIsEnrollOpen(true)
    }
    window.addEventListener('maya:enroll-intent', onEnrollIntent)
    window.addEventListener('maya:enroll-voice',  onEnrollVoice)
    return () => {
      window.removeEventListener('maya:enroll-intent', onEnrollIntent)
      window.removeEventListener('maya:enroll-voice',  onEnrollVoice)
    }
  }, [])

  const position = config?.position ?? DEFAULTS.position
  const orbSize  = config?.orbSize  ?? DEFAULTS.orbSize
  const orbConfig = resolveOrbConfig(config?.orb)

  const accentColor  = orbConfig.theme?.primaryColor ?? '#00d4ff'
  const effectiveSide: SidebarSide = sideOverride ?? sideFromPosition(position)

  return (
    <>
      <MayaOrb
        orbConfig={orbConfig}
        position={position}
        isOpen={isOpen}
        onToggle={() => setIsOpen(prev => !prev)}
        orbSize={orbSize}
      />
      <MayaSidebar
        isOpen={isOpen}
        side={effectiveSide}
        onClose={() => setIsOpen(false)}
        accentColor={accentColor}
        onSettingsOpen={() => setIsSettingsOpen(true)}
      />
      <WidgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        accentColor={accentColor}
        onPositionChange={s => setSideOverride(s)}
      />
      <WidgetEnrollModal
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        suggestedName={enrollName}
        userId={enrollUserId}
        accentColor={accentColor}
        onEnrolled={() => setIsEnrollOpen(false)}
      />
    </>
  )
}
