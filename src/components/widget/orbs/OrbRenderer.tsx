'use client'

/**
 * OrbRenderer — dispatches to the correct orb component based on `config.type`.
 *
 * To add a new orb type:
 *  1. Add the type literal to `OrbType` in `./types.ts`
 *  2. Implement the component in `./<Name>Orb.tsx` (must accept `OrbComponentProps`)
 *  3. Add a `case` here
 */

import React from 'react'
import type { OrbComponentProps } from './types'
import DefaultOrb from './DefaultOrb'
// Future imports (uncomment as implemented):
// import HologramOrb from './HologramOrb'
// import PlasmaOrb from './PlasmaOrb'
// import MinimalOrb from './MinimalOrb'
// import GeometricOrb from './GeometricOrb'

export default function OrbRenderer({ config }: OrbComponentProps) {
  switch (config.type) {
    case 'default':
      return <DefaultOrb config={config} />

    // Future cases:
    // case 'hologram':
    //   return <HologramOrb config={config} />
    // case 'plasma':
    //   return <PlasmaOrb config={config} />

    default:
      // Fallback to default for unknown types — safe for forward compatibility
      return <DefaultOrb config={{ ...config, type: 'default' }} />
  }
}
