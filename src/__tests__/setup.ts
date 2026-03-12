import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement document.fonts (FontFaceSet API)
if (!document.fonts) {
  Object.defineProperty(document, 'fonts', {
    value: { load: () => Promise.resolve([]) },
    writable: true,
  })
}

// Canvas 2D stub — jsdom does not implement canvas drawing APIs
HTMLCanvasElement.prototype.getContext = vi.fn(() => {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    clip: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    shadowColor: '',
    shadowBlur: 0,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

// requestAnimationFrame: no-op (returns handle, never fires callback)
// This prevents the canvas animation loop from running during tests.
globalThis.requestAnimationFrame = vi.fn(() => 1) as unknown as typeof requestAnimationFrame
globalThis.cancelAnimationFrame = vi.fn()

