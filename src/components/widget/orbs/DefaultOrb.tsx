'use client'

/**
 * DefaultOrb — canvas 2D orb with:
 *   - Lit 3D sphere body (radial gradient + specular + rim)
 *   - Three perspective-tilted orbit rings
 *   - Atmosphere glow + contact shadow
 *   - Sonar pulse rings during speaking
 *   - Smooth lerp-based state transitions (idle → thinking → speaking)
 *   - Optional status label
 *
 * All dimensions are derived from `config.size` so the same component
 * renders correctly at any scale (72px widget button → 400px cockpit orb).
 *
 * State is driven by the custom DOM event `maya:status` with detail `{ status: string }`.
 * Config changes after mount require a full remount (size/theme are baked into the
 * animation closure at creation time — intentional, see comment in useEffect).
 */

import React, { useEffect, useRef } from 'react'
import type { OrbComponentProps } from './types'

// ─── Internal types ───────────────────────────────────────────────────────────

interface DrawOpts {
  color: string      // 'R,G,B'
  speakColor: string // 'R,G,B' — secondary accent for speaking state
  label: string
  speed: number
  amplitude: number
  glow: number
  pulse: number
}

interface LerpState {
  cr: number; cg: number; cb: number
  label: string
  speed: number
  amplitude: number
  glow: number
  pulse: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [0, 212, 255]
}

// ─── State machine ────────────────────────────────────────────────────────────

function resolveTarget(
  status: string,
  idleRgb: [number, number, number],
): LerpState {
  const [ir, ig, ib] = idleRgb
  switch (true) {
    case status === 'mic-off':
      return { cr: 110, cg: 110, cb: 145, label: 'MIC OFF',   speed: 0.40, amplitude: 3,  glow: 0.45, pulse: 0 }
    case status === 'thinking' || status === 'streaming':
      return { cr: 168, cg: 139, cb: 250, label: 'PENSANDO',  speed: 2.40, amplitude: 10, glow: 1.00, pulse: 0 }
    case status === 'listening':
      return { cr: ir,  cg: ig,  cb: ib,  label: 'ESCUTANDO', speed: 2.80, amplitude: 12, glow: 1.00, pulse: 0 }
    case status.startsWith('speaking'):
      return { cr: ir,  cg: ig,  cb: ib,  label: 'MAYA',      speed: 3.20, amplitude: 14, glow: 1.00, pulse: 1 }
    default: // idle, done
      return { cr: ir,  cg: ig,  cb: ib,  label: 'ESCUTANDO', speed: 1.20, amplitude: 6,  glow: 0.80, pulse: 0 }
  }
}

// ─── Orbit ring definitions ───────────────────────────────────────────────────
// tiltCos controls perspective squash: 1 = circle, 0 = flat line

const ORBIT_DEFS = [
  { tiltCos: 0.88, initAngle: 0,              sizeM: 1.50, spd:  0.65, alpha: 0.75, lw: 1.9 },
  { tiltCos: 0.28, initAngle: Math.PI / 3.5,  sizeM: 1.38, spd: -0.40, alpha: 0.52, lw: 1.3 },
  { tiltCos: 0.58, initAngle: Math.PI / 5,    sizeM: 1.82, spd:  0.26, alpha: 0.28, lw: 0.9 },
]

// ─── Drawing primitives ───────────────────────────────────────────────────────

function drawPulseRings(
  ctx: CanvasRenderingContext2D,
  t: number,
  cx: number, cy: number, baseR: number,
  color: string, speed: number, glow: number, intensity: number,
) {
  const period = 4.5 / speed
  const maxExpand = baseR * 1.35
  for (let i = 0; i < 3; i++) {
    const phase = ((t / period) + i / 3) % 1
    const radius = baseR + phase * maxExpand
    const alpha = Math.pow(1 - phase, 1.6) * 0.75 * glow * intensity
    if (alpha < 0.01) continue
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${color},${alpha})`
    ctx.lineWidth = 2.2 * (1 - phase)
    ctx.shadowColor = `rgb(${color})`
    ctx.shadowBlur = 12 * (1 - phase) * glow
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }
}

function drawOrbitsBack(
  ctx: CanvasRenderingContext2D,
  t: number, cx: number, cy: number, baseR: number,
  color: string, speed: number, amplitude: number, glow: number,
  angles: number[],
) {
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = baseR * breathe
  for (let i = 0; i < ORBIT_DEFS.length; i++) {
    const o = ORBIT_DEFS[i]
    const ringR = r * o.sizeM + amplitude * 0.25 * Math.sin(t * speed + o.sizeM * 1.3)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angles[i])
    ctx.scale(1, o.tiltCos)
    ctx.beginPath()
    ctx.arc(0, 0, ringR, Math.PI, Math.PI * 2)
    ctx.strokeStyle = `rgba(${color},${o.alpha * 0.38 * glow})`
    ctx.lineWidth = o.lw * 0.65
    ctx.stroke()
    ctx.restore()
  }
}

function drawSphere(
  ctx: CanvasRenderingContext2D,
  t: number, cx: number, cy: number, baseR: number,
  color: string, speed: number, glow: number,
) {
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = baseR * breathe

  // Contact shadow
  ctx.save()
  ctx.translate(cx, cy + r * 1.08)
  ctx.scale(1, 0.22)
  const shd = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.15)
  shd.addColorStop(0, 'rgba(0,0,0,0.40)')
  shd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shd
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Atmosphere glow
  const atm = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.9)
  atm.addColorStop(0,   `rgba(${color},${0.14 * glow})`)
  atm.addColorStop(0.5, `rgba(${color},${0.06 * glow})`)
  atm.addColorStop(1,   `rgba(${color},0)`)
  ctx.fillStyle = atm
  ctx.beginPath()
  ctx.arc(cx, cy, r * 2.9, 0, Math.PI * 2)
  ctx.fill()

  // Sphere body — lit from top-left
  const lx = cx - r * 0.52
  const ly = cy - r * 0.58
  const body = ctx.createRadialGradient(lx, ly, r * 0.04, cx + r * 0.22, cy + r * 0.28, r * 1.45)
  body.addColorStop(0,    'rgba(255,255,255,0.22)')
  body.addColorStop(0.10, `rgba(${color},0.96)`)
  body.addColorStop(0.55, `rgba(${color},0.58)`)
  body.addColorStop(1,    'rgba(0,0,0,0.72)')
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()
  ctx.restore()

  // Specular highlight
  const sx = cx - r * 0.40
  const sy = cy - r * 0.42
  const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.22)
  spec.addColorStop(0,    'rgba(255,255,255,0.72)')
  spec.addColorStop(0.18, 'rgba(255,255,255,0.28)')
  spec.addColorStop(0.55, 'rgba(255,255,255,0.05)')
  spec.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(sx, sy, r * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Rim light (bottom-right bounce)
  const rim = ctx.createRadialGradient(
    cx + r * 0.52, cy + r * 0.52, r * 0.55,
    cx + r * 0.52, cy + r * 0.52, r * 1.05,
  )
  rim.addColorStop(0,   `rgba(${color},0)`)
  rim.addColorStop(0.6, `rgba(${color},${0.20 * glow})`)
  rim.addColorStop(1,   `rgba(${color},0)`)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = rim
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  // Outer edge stroke
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${color},${0.38 * glow})`
  ctx.lineWidth = 1.4
  ctx.shadowColor = `rgb(${color})`
  ctx.shadowBlur = 18 * glow
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawOrbitsFront(
  ctx: CanvasRenderingContext2D,
  t: number, cx: number, cy: number, baseR: number,
  color: string, speed: number, amplitude: number, glow: number,
  angles: number[],
) {
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = baseR * breathe
  for (let i = 0; i < ORBIT_DEFS.length; i++) {
    const o = ORBIT_DEFS[i]
    const ringR = r * o.sizeM + amplitude * 0.25 * Math.sin(t * speed + o.sizeM * 1.3)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angles[i])
    ctx.scale(1, o.tiltCos)
    ctx.beginPath()
    ctx.arc(0, 0, ringR, 0, Math.PI)
    ctx.strokeStyle = `rgba(${color},${o.alpha * glow})`
    ctx.lineWidth = o.lw
    ctx.shadowColor = `rgb(${color})`
    ctx.shadowBlur = 9 * glow
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }
}

function drawStatusLabel(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, baseR: number, canvasSize: number,
  label: string, color: string,
) {
  const y = cy + baseR + canvasSize * 0.055
  const fontSize = Math.max(8, canvasSize * 0.025)
  ctx.save()
  ctx.font = `bold ${fontSize}px Orbitron, "Share Tech Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(label).width
  const pw = tw + 18
  const ph = fontSize * 1.8
  ctx.fillStyle = 'rgba(0,0,0,0.68)'
  ctx.beginPath()
  ctx.roundRect(cx - pw / 2, y - ph / 2, pw, ph, 6)
  ctx.fill()
  ctx.strokeStyle = `rgba(${color},0.55)`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = `rgb(${color})`
  ctx.shadowBlur = 10
  ctx.fillText(label, cx, y)
  ctx.shadowBlur = 0
  ctx.restore()
}

// ─── Main frame renderer ──────────────────────────────────────────────────────

function renderFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  opts: DrawOpts,
  angles: number[],
  cx: number, cy: number, baseR: number,
  showLabel: boolean, canvasSize: number,
) {
  const { color, speed, amplitude, glow, pulse } = opts

  if (pulse > 0) {
    drawPulseRings(ctx, t, cx, cy, baseR, opts.speakColor, speed, glow, pulse)
  }
  drawOrbitsBack(ctx, t, cx, cy, baseR, color, speed, amplitude, glow, angles)
  drawSphere(ctx, t, cx, cy, baseR, color, speed, glow)
  drawOrbitsFront(ctx, t, cx, cy, baseR, color, speed, amplitude, glow, angles)
  if (showLabel) {
    drawStatusLabel(ctx, cx, cy, baseR, canvasSize, opts.label, color)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DefaultOrb({ config }: OrbComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const statusRef = useRef<string>('idle')
  const animRef = useRef<number | null>(null)

  // Config values baked at mount time — changes require remount.
  // This is intentional: the animation closure captures size/color at creation
  // for performance (no per-frame config reads).
  const size = config.size ?? 72
  const showLabel = config.showLabel ?? false
  const idleRgb: [number, number, number] = config.theme?.primaryColor
    ? hexToRgb(config.theme.primaryColor)
    : [0, 212, 255]
  const speakRgb: [number, number, number] = config.theme?.secondaryColor
    ? hexToRgb(config.theme.secondaryColor)
    : [0, 255, 136]
  const speakColor = speakRgb.join(',')
  const cx = size / 2
  const cy = size / 2
  const baseR = size * 0.15   // Same ratio as CentralOrb (60/400 = 0.15)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    document.fonts.load(`bold 11px Orbitron`).catch(() => {})

    const DT = 0.016
    const K = 0.07  // lerp factor ~0.25 s to 63% of target
    let t = 0

    const lerpState: LerpState = resolveTarget('idle', idleRgb)
    const angles = ORBIT_DEFS.map(o => o.initAngle)

    const loop = () => {
      t += DT
      ctx.clearRect(0, 0, size, size)

      const tgt = resolveTarget(statusRef.current, idleRgb)
      lerpState.cr        += (tgt.cr        - lerpState.cr)        * K
      lerpState.cg        += (tgt.cg        - lerpState.cg)        * K
      lerpState.cb        += (tgt.cb        - lerpState.cb)        * K
      lerpState.speed     += (tgt.speed     - lerpState.speed)     * K
      lerpState.amplitude += (tgt.amplitude - lerpState.amplitude) * K
      lerpState.glow      += (tgt.glow      - lerpState.glow)      * K
      lerpState.pulse     += (tgt.pulse     - lerpState.pulse)     * K
      lerpState.label      = tgt.label  // switches immediately

      for (let i = 0; i < ORBIT_DEFS.length; i++) {
        angles[i] += DT * lerpState.speed * ORBIT_DEFS[i].spd
      }

      renderFrame(
        ctx, t,
        {
          color: `${Math.round(lerpState.cr)},${Math.round(lerpState.cg)},${Math.round(lerpState.cb)}`,
          speakColor,
          label: lerpState.label,
          speed: lerpState.speed,
          amplitude: lerpState.amplitude,
          glow: lerpState.glow,
          pulse: lerpState.pulse,
        },
        angles, cx, cy, baseR, showLabel, size,
      )

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    const onStatus = (e: Event) => {
      statusRef.current = (e as CustomEvent<{ status: string }>).detail?.status ?? 'idle'
    }
    window.addEventListener('maya:status', onStatus)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('maya:status', onStatus)
    }
  }, [])  // intentionally run once at mount

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size }}
    />
  )
}
