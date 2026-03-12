/**
 * Phase 2 Tests — DefaultOrb pure helpers
 *
 * Tests the exported pure functions from DefaultOrb.tsx.
 * No canvas, no DOM, no React — pure logic only.
 */

import { describe, it, expect } from 'vitest'
import { hexToRgb, resolveTarget } from '../../orbs/DefaultOrb'

// ─── hexToRgb ─────────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('parses Maya cyan correctly', () => {
    expect(hexToRgb('#00d4ff')).toEqual([0, 212, 255])
  })

  it('parses speaking-green correctly', () => {
    expect(hexToRgb('#00ff88')).toEqual([0, 255, 136])
  })

  it('parses purple correctly', () => {
    expect(hexToRgb('#a855f7')).toEqual([168, 85, 247])
  })

  it('accepts hex without # prefix', () => {
    expect(hexToRgb('00d4ff')).toEqual([0, 212, 255])
  })

  it('falls back to [0, 212, 255] for invalid input', () => {
    expect(hexToRgb('invalid')).toEqual([0, 212, 255])
    expect(hexToRgb('')).toEqual([0, 212, 255])
  })
})

// ─── resolveTarget (state machine) ────────────────────────────────────────────

const IDLE_RGB: [number, number, number] = [0, 212, 255]

describe('resolveTarget', () => {
  it('returns idle state for "idle"', () => {
    const result = resolveTarget('idle', IDLE_RGB)
    expect(result.label).toBe('ESCUTANDO')
    expect(result.pulse).toBe(0)
    expect(result.cr).toBe(0)
    expect(result.cg).toBe(212)
    expect(result.cb).toBe(255)
  })

  it('returns idle state for "done"', () => {
    const result = resolveTarget('done', IDLE_RGB)
    expect(result.label).toBe('ESCUTANDO')
    expect(result.pulse).toBe(0)
  })

  it('returns thinking state for "thinking"', () => {
    const result = resolveTarget('thinking', IDLE_RGB)
    expect(result.label).toBe('PENSANDO')
    expect(result.pulse).toBe(0)
    // Should use purple color
    expect(result.cr).toBe(168)
    expect(result.cg).toBe(139)
    expect(result.cb).toBe(250)
  })

  it('returns thinking state for "streaming"', () => {
    const result = resolveTarget('streaming', IDLE_RGB)
    expect(result.label).toBe('PENSANDO')
  })

  it('returns listening state for "listening"', () => {
    const result = resolveTarget('listening', IDLE_RGB)
    expect(result.label).toBe('ESCUTANDO')
    expect(result.pulse).toBe(0)
    // Should use idle/primary color
    expect(result.cr).toBe(0)
    expect(result.cg).toBe(212)
    expect(result.cb).toBe(255)
  })

  it('returns speaking state for "speaking" prefix, with pulse', () => {
    const result = resolveTarget('speaking', IDLE_RGB)
    expect(result.label).toBe('MAYA')
    expect(result.pulse).toBe(1)
  })

  it('returns speaking state for "speaking:stream"', () => {
    const result = resolveTarget('speaking:stream', IDLE_RGB)
    expect(result.label).toBe('MAYA')
    expect(result.pulse).toBe(1)
  })

  it('returns mic-off state for "mic-off"', () => {
    const result = resolveTarget('mic-off', IDLE_RGB)
    expect(result.label).toBe('MIC OFF')
    expect(result.pulse).toBe(0)
    // Muted grey color
    expect(result.cr).toBe(110)
  })

  it('returns idle as default for unknown status', () => {
    const result = resolveTarget('unknown-status', IDLE_RGB)
    expect(result.label).toBe('ESCUTANDO')
    expect(result.pulse).toBe(0)
  })

  it('respects custom idle RGB', () => {
    const customRgb: [number, number, number] = [120, 60, 200]
    const result = resolveTarget('idle', customRgb)
    expect(result.cr).toBe(120)
    expect(result.cg).toBe(60)
    expect(result.cb).toBe(200)
  })

  it('speaking state uses idle RGB (primary color) for the orb tone', () => {
    const customRgb: [number, number, number] = [100, 50, 200]
    const result = resolveTarget('speaking', customRgb)
    // speaking uses the idle rgb color (primary accent)
    expect(result.cr).toBe(100)
    expect(result.cg).toBe(50)
    expect(result.cb).toBe(200)
  })

  it('thinking state has higher speed than idle', () => {
    const idle = resolveTarget('idle', IDLE_RGB)
    const thinking = resolveTarget('thinking', IDLE_RGB)
    expect(thinking.speed).toBeGreaterThan(idle.speed)
  })

  it('speaking state has the highest speed', () => {
    const thinking = resolveTarget('thinking', IDLE_RGB)
    const speaking = resolveTarget('speaking', IDLE_RGB)
    expect(speaking.speed).toBeGreaterThan(thinking.speed)
  })

  it('thinking state has higher amplitude than idle', () => {
    const idle = resolveTarget('idle', IDLE_RGB)
    const thinking = resolveTarget('thinking', IDLE_RGB)
    expect(thinking.amplitude).toBeGreaterThan(idle.amplitude)
  })
})
