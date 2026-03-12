/**
 * Phase 2 Tests — OrbRenderer + MayaWidget
 *
 * Component-level tests using @testing-library/react.
 * Canvas / rAF / document.fonts stubs are in src/__tests__/setup.ts
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrbRenderer from '../orbs/OrbRenderer'
import MayaWidget from '../MayaWidget'
import { DEFAULT_ORB_CONFIG } from '../orbs/types'

// useMayaChat is needed by WidgetChatPanel (rendered inside MayaSidebar)
vi.mock('../../../hooks/useMayaChat', () => ({
  useMayaChat: vi.fn(() => ({
    messages: [],
    status: 'idle',
    listenEnabled: false,
    setListen: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    addUserMessage: vi.fn(),
    stopAudio: vi.fn(),
    clear: vi.fn(),
  })),
}))

// ─── OrbRenderer ─────────────────────────────────────────────────────────────

describe('OrbRenderer', () => {
  it('renders a canvas element for type=default', () => {
    const { container } = render(<OrbRenderer config={DEFAULT_ORB_CONFIG} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('renders canvas with correct size attribute', () => {
    const { container } = render(
      <OrbRenderer config={{ ...DEFAULT_ORB_CONFIG, size: 100 }} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas?.getAttribute('width')).toBe('100')
    expect(canvas?.getAttribute('height')).toBe('100')
  })

  it('falls back to DefaultOrb for unknown type', () => {
    // OrbRenderer's default case renders DefaultOrb
    const { container } = render(
      // @ts-expect-error — testing unknown type forward-compat
      <OrbRenderer config={{ type: 'unknown-future-type', size: 72 }} />,
    )
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})

// ─── MayaWidget ──────────────────────────────────────────────────────────────

describe('MayaWidget', () => {
  it('renders the orb button', () => {
    render(<MayaWidget />)
    const button = screen.getByRole('button', { name: /abrir maya/i })
    expect(button).toBeInTheDocument()
  })

  it('sidebar is closed by default (aria-hidden)', () => {
    render(<MayaWidget />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-hidden', 'true')
  })

  it('opens sidebar when orb is clicked', () => {
    render(<MayaWidget />)
    const button = screen.getByRole('button', { name: /abrir maya/i })
    fireEvent.click(button)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-hidden', 'false')
  })

  it('closes sidebar when close button is clicked', () => {
    render(<MayaWidget />)
    // Open
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    // Close
    fireEvent.click(screen.getByRole('button', { name: /fechar sidebar/i }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-hidden', 'true')
  })

  it('aria-expanded reflects open state on orb button', () => {
    render(<MayaWidget />)
    const button = screen.getByRole('button', { name: /abrir maya/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('orb button label changes when open', () => {
    render(<MayaWidget />)
    expect(screen.getByRole('button', { name: /abrir maya/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    expect(screen.getByRole('button', { name: /fechar maya/i })).toBeInTheDocument()
  })

  it('sidebar shows "MAYA" header text', () => {
    render(<MayaWidget />)
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    expect(screen.getByText('MAYA')).toBeInTheDocument()
  })

  it('accepts custom orb config without crashing', () => {
    expect(() =>
      render(
        <MayaWidget
          config={{
            orb: { type: 'default', theme: { primaryColor: '#7c3aed' }, size: 80 },
            position: 'bottom-left',
            orbSize: 80,
          }}
        />,
      ),
    ).not.toThrow()
  })
})
