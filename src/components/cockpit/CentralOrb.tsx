"use client"
import React, { useEffect, useRef } from 'react'
import { stopCurrentAudio } from '../../hooks/useMayaChat'

const W = 280
const H = 280
const CX = W / 2
const CY = H / 2

// Draw N concentric rings with breathing animation
function drawRings(
  ctx: CanvasRenderingContext2D,
  t: number,
  opts: {
    color: string       // e.g. '0,212,255'
    label?: string
    rings?: number      // default 3
    baseRadius?: number // default 70
    spread?: number     // default 14 (gap between rings)
    speed?: number      // default 2.5
    amplitude?: number  // default 12
    maxAlpha?: number   // default 0.85
    lineWidth?: number  // default 2
    glow?: number       // default 12
  }
) {
  const {
    color, label,
    rings = 3, baseRadius = 70, spread = 14,
    speed = 2.5, amplitude = 12,
    maxAlpha = 0.85, lineWidth = 2, glow = 12,
  } = opts

  for (let i = 0; i < rings; i++) {
    const phase = t * speed + i * 1.1
    const radius = baseRadius + amplitude * Math.sin(phase) - i * spread
    const alpha = maxAlpha - i * 0.22
    ctx.strokeStyle = `rgba(${color},${alpha})`
    ctx.lineWidth = lineWidth - i * 0.3
    ctx.shadowColor = `rgb(${color})`
    ctx.shadowBlur = i === 0 ? glow : 0
    ctx.beginPath()
    ctx.arc(CX, CY, Math.max(4, radius), 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  if (label) {
    ctx.fillStyle = `rgb(${color})`
    ctx.font = 'bold 11px Orbitron, "Share Tech Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, CX, CY)
  }
}

export default function CentralOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<string>('idle')
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let t = 0

    const loop = () => {
      t += 0.016 // ~60fps
      ctx.clearRect(0, 0, W, H)

      const s = stateRef.current

      if (s === 'mic-off') {
        // Mic disabled — very dim single ring, no label
        drawRings(ctx, t, {
          color: '120,120,140',
          rings: 1,
          baseRadius: 55,
          spread: 0,
          speed: 0.4,
          amplitude: 3,
          maxAlpha: 0.18,
          lineWidth: 1,
          glow: 0,
          label: 'mic off',
        })

      } else if (s === 'idle' || s === 'done') {
        // Standby — 3 cyan rings, slow & soft, always showing it's listening
        drawRings(ctx, t, {
          color: '0,212,255',
          rings: 3,
          baseRadius: 68,
          spread: 14,
          speed: 1.2,
          amplitude: 7,
          maxAlpha: 0.45,
          lineWidth: 1.4,
          glow: 6,
          label: 'escutando',
        })

      } else if (s === 'thinking' || s === 'streaming') {
        // Thinking — 3 rings, medium speed, cyan
        drawRings(ctx, t, {
          color: '0,212,255',
          rings: 3,
          baseRadius: 72,
          spread: 15,
          speed: 2.2,
          amplitude: 10,
          maxAlpha: 0.75,
          lineWidth: 1.8,
          glow: 10,
          label: 'pensando',
        })

      } else if (s === 'listening') {
        // Listening — 3 rings, faster, bright cyan
        drawRings(ctx, t, {
          color: '0,212,255',
          rings: 3,
          baseRadius: 70,
          spread: 14,
          speed: 2.8,
          amplitude: 13,
          maxAlpha: 0.9,
          lineWidth: 2,
          glow: 14,
          label: 'escutando',
        })

      } else if (s.startsWith('speaking')) {
        // Speaking — 3 rings, fast, green
        drawRings(ctx, t, {
          color: '0,255,136',
          rings: 3,
          baseRadius: 70,
          spread: 14,
          speed: 3.2,
          amplitude: 14,
          maxAlpha: 0.95,
          lineWidth: 2.2,
          glow: 16,
          label: 'MAYA',
        })

      } else {
        // Fallback — same as idle
        drawRings(ctx, t, {
          color: '0,212,255',
          rings: 1,
          baseRadius: 60,
          spread: 0,
          speed: 0.6,
          amplitude: 5,
          maxAlpha: 0.25,
          lineWidth: 1.2,
          glow: 4,
        })
      }

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    const handler = (e: any) => {
      stateRef.current = e?.detail?.status ?? 'idle'
    }
    window.addEventListener('maya:status', handler as EventListener)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('maya:status', handler as EventListener)
    }
  }, [])

  return (
    <div className="central-orb flex items-center justify-center" style={{ zIndex: 0, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: 'block',
          cursor: stateRef.current.startsWith('speaking') ? 'pointer' : 'default',
          zIndex: 0,
          position: 'relative',
        }}
        title="Clique para parar"
        onClick={() => {
          if (stateRef.current.startsWith('speaking') || stateRef.current === 'thinking' || stateRef.current === 'streaming') {
            stopCurrentAudio()
            window.dispatchEvent(new CustomEvent('maya:status', { detail: { status: 'idle' } }))
            window.dispatchEvent(new CustomEvent('maya:stop'))
          }
        }}
      />
    </div>
  )
}
