/**
 * Orb type system — extensible visual variants for the Maya widget orb.
 *
 * Adding a new orb type:
 *  1. Add the literal to `OrbType`
 *  2. Create `src/components/widget/orbs/<Name>Orb.tsx`
 *  3. Add a case to `OrbRenderer.tsx`
 */

// ─── Supported orb type identifiers ──────────────────────────────────────────
export type OrbType =
  | 'default'       // Sphere + orbit rings + glow (canvas 2D) — implemented
// Future variants (not yet implemented):
// | 'hologram'     // Wireframe + scan-line projection
// | 'plasma'       // Fluid simulation noise shader (WebGL)
// | 'minimal'      // Flat circle + border pulse, no canvas
// | 'geometric'    // Rotating polyhedron — CSS 3D transform

// ─── Theme overrides per orb instance ────────────────────────────────────────
export interface OrbTheme {
  /** Primary accent color — hex, e.g. '#00d4ff'. Used for idle/listening states. */
  primaryColor: string
  /**
   * Secondary accent color — hex, e.g. '#00ff88'. Used for speaking state.
   * Defaults to the speaking-green '#00ff88' if not provided.
   */
  secondaryColor?: string
}

// ─── Config object passed to every orb component ─────────────────────────────
export interface OrbConfig {
  /** Which visual variant to render */
  type: OrbType
  /** Visual theme overrides — leave undefined for defaults */
  theme?: OrbTheme
  /** Canvas diameter in pixels. Default: 72 */
  size?: number
  /** Show the status label below the orb. Default: false */
  showLabel?: boolean
}

// ─── Props contract every orb component must satisfy ─────────────────────────
export interface OrbComponentProps {
  config: OrbConfig
}

// ─── Well-known defaults ──────────────────────────────────────────────────────
export const DEFAULT_ORB_CONFIG: OrbConfig = {
  type: 'default',
  size: 72,
  showLabel: false,
}
