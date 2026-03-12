"use client"
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { stopCurrentAudio } from '../../hooks/useMayaChat'

const W = 400
const H = 400
const CX = W / 2
const CY = H / 2
const BASE_R = 60 // core sphere radius

interface OrbOpts {
  color: string   // RGB e.g. '0,212,255'
  label: string
  speed: number   // animation speed multiplier
  amplitude: number // ring pulse amplitude
  glow: number    // 0–1 intensity
  pulse: number   // 0 = none, >0 = sonar pulse intensity
}

/** Internal numeric form used for smooth lerp-based transitions */
interface LerpOpts {
  cr: number; cg: number; cb: number
  label: string
  speed: number
  amplitude: number
  glow: number
  pulse: number
}

function targetOpts(s: string, muted: boolean): LerpOpts {
  if (muted && (s === 'mic-off' || s === 'idle' || s === 'done' || s === 'listening' || s === 'standby'))
    return { cr:255, cg:60,  cb:60,  label:'MUDO',      speed:0.45, amplitude:4,  glow:0.65, pulse:0    }
  if (s === 'mic-off')
    return { cr:110, cg:110, cb:145, label:'MIC OFF',   speed:0.40, amplitude:3,  glow:0.45, pulse:0    }
  if (s === 'standby')
    return { cr:80,  cg:60,  cb:20,  label:'EM ESPERA', speed:0.30, amplitude:2,  glow:0.30, pulse:0    }
  if (s === 'idle' || s === 'done')
    return { cr:0,   cg:212, cb:255, label:'ESCUTANDO', speed:1.20, amplitude:6,  glow:0.80, pulse:0    }
  if (s === 'thinking' || s === 'streaming')
    return { cr:168, cg:139, cb:250, label:'PENSANDO',  speed:2.40, amplitude:10, glow:1.00, pulse:0    }
  if (s === 'listening')
    return { cr:0,   cg:212, cb:255, label:'ESCUTANDO', speed:2.80, amplitude:12, glow:1.00, pulse:0    }
  if (s.startsWith('speaking'))
    return { cr:0,   cg:255, cb:136, label:'MAYA',      speed:3.20, amplitude:14, glow:1.00, pulse:1.00 }
  return   { cr:0,   cg:212, cb:255, label:'ESCUTANDO', speed:0.80, amplitude:4,  glow:0.55, pulse:0    }
}

// Orbit ring definitions — tiltCos controls perspective squash (1=circle, 0=line)
const ORBITS = [
  { tiltCos: 0.88, initAngle: 0,              size: 1.50, spd:  0.65, alpha: 0.75, lw: 1.9 },
  { tiltCos: 0.28, initAngle: Math.PI / 3.5,  size: 1.38, spd: -0.40, alpha: 0.52, lw: 1.3 },
  { tiltCos: 0.58, initAngle: Math.PI / 5,    size: 1.82, spd:  0.26, alpha: 0.28, lw: 0.9 },
]

/** Back halves of orbit rings (drawn before sphere so sphere covers them) */
function drawOrbitsBack(ctx: CanvasRenderingContext2D, t: number, opts: OrbOpts, angles: number[]) {
  const { color, speed, amplitude, glow } = opts
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = BASE_R * breathe
  for (let i = 0; i < ORBITS.length; i++) {
    const o = ORBITS[i]
    const ringR = r * o.size + amplitude * 0.25 * Math.sin(t * speed + o.size * 1.3)
    ctx.save()
    ctx.translate(CX, CY)
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

/** 3D sphere body: atmosphere glow + contact shadow + lit body + specular + rim */
function drawSphere(ctx: CanvasRenderingContext2D, t: number, opts: OrbOpts) {
  const { color, speed, glow } = opts
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = BASE_R * breathe

  // — Contact shadow below sphere
  ctx.save()
  ctx.translate(CX, CY + r * 1.08)
  ctx.scale(1, 0.22)
  const shd = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.15)
  shd.addColorStop(0,   'rgba(0,0,0,0.40)')
  shd.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = shd
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // — Outer atmosphere glow
  const atm = ctx.createRadialGradient(CX, CY, r * 0.4, CX, CY, r * 2.9)
  atm.addColorStop(0,   `rgba(${color},${0.14 * glow})`)
  atm.addColorStop(0.5, `rgba(${color},${0.06 * glow})`)
  atm.addColorStop(1,   `rgba(${color},0)`)
  ctx.fillStyle = atm
  ctx.beginPath()
  ctx.arc(CX, CY, r * 2.9, 0, Math.PI * 2)
  ctx.fill()

  // — Sphere body: lit from top-left
  const lx = CX - r * 0.52
  const ly = CY - r * 0.58
  const body = ctx.createRadialGradient(lx, ly, r * 0.04, CX + r * 0.22, CY + r * 0.28, r * 1.45)
  body.addColorStop(0,    'rgba(255,255,255,0.22)')
  body.addColorStop(0.10, `rgba(${color},0.96)`)
  body.addColorStop(0.55, `rgba(${color},0.58)`)
  body.addColorStop(1,    'rgba(0,0,0,0.72)')
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()
  ctx.restore()

  // — Specular highlight (top-left hot spot, tight focus)
  const sx = CX - r * 0.40
  const sy = CY - r * 0.42
  const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.22)
  spec.addColorStop(0,    'rgba(255,255,255,0.72)')
  spec.addColorStop(0.18, 'rgba(255,255,255,0.28)')
  spec.addColorStop(0.55, 'rgba(255,255,255,0.05)')
  spec.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(sx, sy, r * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // — Rim light (bottom-right edge, secondary bounce light)
  const rim = ctx.createRadialGradient(
    CX + r * 0.52, CY + r * 0.52, r * 0.55,
    CX + r * 0.52, CY + r * 0.52, r * 1.05
  )
  rim.addColorStop(0,   `rgba(${color},0)`)
  rim.addColorStop(0.6, `rgba(${color},${0.20 * glow})`)
  rim.addColorStop(1,   `rgba(${color},0)`)
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = rim
  ctx.fillRect(CX - r, CY - r, r * 2, r * 2)
  ctx.restore()

  // — Outer edge stroke
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${color},${0.38 * glow})`
  ctx.lineWidth = 1.4
  ctx.shadowColor = `rgb(${color})`
  ctx.shadowBlur = 18 * glow
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

/** Front halves of orbit rings (drawn after sphere so they appear in front) */
function drawOrbitsFront(ctx: CanvasRenderingContext2D, t: number, opts: OrbOpts, angles: number[]) {
  const { color, speed, amplitude, glow } = opts
  const breathe = 1 + 0.035 * Math.sin(t * speed * 0.5)
  const r = BASE_R * breathe
  for (let i = 0; i < ORBITS.length; i++) {
    const o = ORBITS[i]
    const ringR = r * o.size + amplitude * 0.25 * Math.sin(t * speed + o.size * 1.3)
    ctx.save()
    ctx.translate(CX, CY)
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

/** Label drawn BELOW the sphere — dark pill background + white text for readability */
function drawLabel(ctx: CanvasRenderingContext2D, label: string, color: string) {
  const y = CY + BASE_R + 22
  ctx.save()
  ctx.font = 'bold 10px Orbitron, "Share Tech Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(label).width
  const pw = tw + 18
  const ph = 18
  // Dark pill background
  ctx.fillStyle = 'rgba(0,0,0,0.68)'
  ctx.beginPath()
  ctx.roundRect(CX - pw / 2, y - ph / 2, pw, ph, 6)
  ctx.fill()
  // Colored border
  ctx.strokeStyle = `rgba(${color},0.55)`
  ctx.lineWidth = 1
  ctx.stroke()
  // White text with colored glow
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = `rgb(${color})`
  ctx.shadowBlur = 10
  ctx.fillText(label, CX, y)
  ctx.shadowBlur = 0
  ctx.restore()
}

/** Small muted badge (top-right) when muted while speaking/thinking */
function drawMuteBadge(ctx: CanvasRenderingContext2D) {
  const bx = CX + 56
  const by = CY - 56
  ctx.save()
  ctx.fillStyle = 'rgba(255,60,60,0.18)'
  ctx.strokeStyle = 'rgba(255,60,60,0.75)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(bx, by, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,60,60,0.90)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bx - 5, by - 5)
  ctx.lineTo(bx + 5, by + 5)
  ctx.stroke()
  ctx.restore()
}

/** Sonar-style expanding pulse rings — emitted from sphere surface outward */
function drawPulseRings(ctx: CanvasRenderingContext2D, t: number, color: string, speed: number, glow: number) {
  const pulseCount = 3
  const period = 4.5 / speed // seconds per full cycle
  const maxExpand = BASE_R * 1.35
  for (let i = 0; i < pulseCount; i++) {
    const phase = ((t / period) + i / pulseCount) % 1
    const radius = BASE_R + phase * maxExpand
    const alpha = Math.pow(1 - phase, 1.6) * 0.75 * glow
    if (alpha < 0.01) continue
    ctx.save()
    ctx.beginPath()
    ctx.arc(CX, CY, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${color},${alpha})`
    ctx.lineWidth = 2.2 * (1 - phase)
    ctx.shadowColor = `rgb(${color})`
    ctx.shadowBlur = 12 * (1 - phase) * glow
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }
}

function drawOrb(ctx: CanvasRenderingContext2D, t: number, opts: OrbOpts, angles: number[]) {
  if (opts.pulse > 0) drawPulseRings(ctx, t, opts.color, opts.speed, opts.glow * opts.pulse)
  drawOrbitsBack(ctx, t, opts, angles)
  drawSphere(ctx, t, opts)
  drawOrbitsFront(ctx, t, opts, angles)
  drawLabel(ctx, opts.label, opts.color)
}

function getInitialOrbState(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('maya_wake_word_enabled') !== 'false')
      return 'standby'
  } catch (_) {}
  return 'idle'
}

export default function CentralOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<string>(getInitialOrbState())
  const animRef = useRef<number | null>(null)
  const mutedRef = useRef<boolean>(false)
  const [isMuted, setIsMuted] = useState(false)
  // Lerped opts (smooth transitions) and accumulated ring angles (no position jumps)
  const _initState = getInitialOrbState()
  const _initOpts = targetOpts(_initState, false)
  const lerpRef = useRef<LerpOpts>({ ..._initOpts })
  const ringAnglesRef = useRef<number[]>(ORBITS.map(o => o.initAngle))

  const toggleMute = useCallback(() => {
    const newMuted = !mutedRef.current
    mutedRef.current = newMuted
    setIsMuted(newMuted)
    if (newMuted) {
      stopCurrentAudio()
      stateRef.current = 'mic-off'
      window.dispatchEvent(new CustomEvent('maya:mute', { detail: { muted: true } }))
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'mic-off' } }))
      window.dispatchEvent(new CustomEvent('maya:stop'))
    } else {
      stateRef.current = 'idle'
      window.dispatchEvent(new CustomEvent('maya:mute', { detail: { muted: false } }))
      window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    document.fonts.load('bold 11px Orbitron').catch(() => {})

    const DT = 0.016
    const K = 0.07 // lerp factor per frame (~0.25s to reach 63% of target)
    let t = 0
    const loop = () => {
      t += DT
      ctx.clearRect(0, 0, W, H)
      const s = stateRef.current
      const muted = mutedRef.current

      // Determine target state
      const tgt = targetOpts(s, muted)
      const lo = lerpRef.current

      // Lerp all visual properties toward target
      lo.cr        += (tgt.cr        - lo.cr)        * K
      lo.cg        += (tgt.cg        - lo.cg)        * K
      lo.cb        += (tgt.cb        - lo.cb)        * K
      lo.speed     += (tgt.speed     - lo.speed)     * K
      lo.amplitude += (tgt.amplitude - lo.amplitude) * K
      lo.glow      += (tgt.glow      - lo.glow)      * K
      lo.pulse     += (tgt.pulse     - lo.pulse)     * K
      lo.label      = tgt.label // label switches immediately

      // Accumulate ring angles with current lerped speed — positions are always continuous
      const angles = ringAnglesRef.current
      for (let i = 0; i < ORBITS.length; i++) {
        angles[i] += DT * lo.speed * ORBITS[i].spd
      }

      const drawOpts: OrbOpts = {
        color: `${Math.round(lo.cr)},${Math.round(lo.cg)},${Math.round(lo.cb)}`,
        label: lo.label,
        speed: lo.speed,
        amplitude: lo.amplitude,
        glow: lo.glow,
        pulse: lo.pulse,
      }

      drawOrb(ctx, t, drawOpts, angles)
      if (muted && (s === 'thinking' || s === 'streaming' || s.startsWith('speaking'))) {
        drawMuteBadge(ctx)
      }

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    const handler = (e: any) => {
      const newStatus = e?.detail?.status ?? 'idle'
      if (mutedRef.current) {
        if (newStatus === 'thinking' || newStatus === 'streaming' || newStatus.startsWith('speaking')) {
          stateRef.current = newStatus
        }
      } else {
        stateRef.current = newStatus
      }
    }
    // Wake word events: switch between standby <-> idle-ready
    const onWakeActivated = () => {
      if (!mutedRef.current) stateRef.current = 'listening'
    }
    const onWakeDeactivated = () => {
      // Return to standby only if wake word mode is still enabled
      try {
        const wakeEnabled = localStorage.getItem('maya_wake_word_enabled') !== 'false'
        if (!mutedRef.current && stateRef.current !== 'thinking' && stateRef.current !== 'streaming' && !stateRef.current.startsWith('speaking')) {
          stateRef.current = wakeEnabled ? 'standby' : 'idle'
        }
      } catch { stateRef.current = 'idle' }
    }
    window.addEventListener('maya:status', handler as EventListener)
    window.addEventListener('maya:wake-activated', onWakeActivated)
    window.addEventListener('maya:wake-deactivated', onWakeDeactivated)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('maya:status', handler as EventListener)
      window.removeEventListener('maya:wake-activated', onWakeActivated)
      window.removeEventListener('maya:wake-deactivated', onWakeDeactivated)
    }
  }, [])

  return (
    <div
      className="central-orb flex items-center justify-center"
      style={{
        zIndex: 0,
        position: 'relative',
        filter: 'drop-shadow(0 12px 40px rgba(0,212,255,0.22)) drop-shadow(0 2px 8px rgba(0,0,0,0.60))',
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: 'block',
          cursor: 'pointer',
          zIndex: 0,
          position: 'relative',
        }}
        title={isMuted ? 'Microfone mudo — clique para ativar' : 'Clique para mutar o microfone'}
        onClick={() => {
          if (!isMuted && (stateRef.current.startsWith('speaking') || stateRef.current === 'thinking' || stateRef.current === 'streaming')) {
            stopCurrentAudio()
            window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
            window.dispatchEvent(new CustomEvent('maya:stop'))
          }
          toggleMute()
        }}
      />
    </div>
  )
}
