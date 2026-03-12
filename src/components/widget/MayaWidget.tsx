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

import React, { useState } from 'react'
import MayaOrb, { type WidgetPosition } from './MayaOrb'
import MayaSidebar, { type SidebarSide } from './MayaSidebar'
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

export default function MayaWidget({ config }: MayaWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)

  const position = config?.position ?? DEFAULTS.position
  const orbSize  = config?.orbSize  ?? DEFAULTS.orbSize
  const orbConfig = resolveOrbConfig(config?.orb)

  const accentColor = orbConfig.theme?.primaryColor ?? '#00d4ff'

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
        side={sideFromPosition(position)}
        onClose={() => setIsOpen(false)}
        accentColor={accentColor}
      />
    </>
  )
}
