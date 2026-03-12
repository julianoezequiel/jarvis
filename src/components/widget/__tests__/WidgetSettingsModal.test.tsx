/**
 * Phase 3 Tests — WidgetSettingsModal
 *
 * Tests for the 4-tab settings modal: rendering, tab navigation,
 * gear button integration in MayaSidebar/MayaWidget, and Escape-to-close.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WidgetSettingsModal from '../WidgetSettingsModal'
import MayaWidget from '../MayaWidget'

// ─── Shared mocks ─────────────────────────────────────────────────────────────

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

// Stub global fetch for knowledge and speaker-enroll endpoints
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
    const u = String(url)
    if (u.includes('/api/knowledge') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })
    }
    if (u.includes('/api/speaker-enroll') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profiles: [] }),
      })
    }
    if (u.includes('/api/maya-memory')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }))
})

// ─── WidgetSettingsModal ──────────────────────────────────────────────────────

describe('WidgetSettingsModal', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <WidgetSettingsModal isOpen={false} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when isOpen=true', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByTestId('widget-settings-modal')).toBeInTheDocument()
  })

  it('shows "Configurações Maya" heading', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByText(/Configura.*Maya/i)).toBeInTheDocument()
  })

  it('close button calls onClose', () => {
    const onClose = vi.fn()
    render(<WidgetSettingsModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fechar configura/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    render(<WidgetSettingsModal isOpen onClose={onClose} />)
    const overlay = screen.getByTestId('widget-settings-modal')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn()
    render(<WidgetSettingsModal isOpen onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders 4 tab buttons', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^Geral$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Agentes$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Conhecimento$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Vozes$/i })).toBeInTheDocument()
  })

  // ── Tab: Geral ──────────────────────────────────────────────────────────

  it('shows Geral tab content by default', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByText(/Posição do Widget/i)).toBeInTheDocument()
  })

  it('Geral tab has position buttons Direita and Esquerda', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Direita/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Esquerda/i })).toBeInTheDocument()
  })

  it('position toggle calls onPositionChange', () => {
    const onPositionChange = vi.fn()
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} onPositionChange={onPositionChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Esquerda/i }))
    expect(onPositionChange).toHaveBeenCalledWith('left')
  })

  it('Geral tab has "Limpar histórico e memória" button', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Limpar histórico/i })).toBeInTheDocument()
  })

  // ── Tab: Agentes ────────────────────────────────────────────────────────

  it('Agentes tab renders agent toggles', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Agentes$/i }))
    expect(screen.getByRole('switch', { name: /@analyst/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /@developer/i })).toBeInTheDocument()
  })

  it('Agentes tab shows 21 toggle switches', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Agentes$/i }))
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(21)
  })

  it('all agent toggles are on by default', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Agentes$/i }))
    const switches = screen.getAllByRole('switch')
    switches.forEach(sw => expect(sw).toHaveAttribute('aria-checked', 'true'))
  })

  it('clicking a toggle flips its aria-checked', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Agentes$/i }))
    // Label is "Desativar @analyst" when enabled
    const analystOn = screen.getByRole('switch', { name: /Desativar @analyst/i })
    expect(analystOn).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(analystOn)
    // Re-query after re-render: label becomes "Ativar @analyst"
    const analystOff = screen.getByRole('switch', { name: /Ativar @analyst/i })
    expect(analystOff).toHaveAttribute('aria-checked', 'false')
  })

  // ── Tab: Conhecimento ───────────────────────────────────────────────────

  it('Conhecimento tab renders drop zone', () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Conhecimento$/i }))
    expect(screen.getByTestId('knowledge-drop-zone')).toBeInTheDocument()
  })

  it('Conhecimento tab shows empty state message', async () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Conhecimento$/i }))
    await waitFor(() =>
      expect(screen.getByText(/Nenhum arquivo importado/i)).toBeInTheDocument(),
    )
  })

  // ── Tab: Vozes ──────────────────────────────────────────────────────────

  it('Vozes tab renders "Cadastrar" button', async () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Vozes$/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Cadastrar/i })).toBeInTheDocument(),
    )
  })

  it('Vozes tab shows empty profiles message', async () => {
    render(<WidgetSettingsModal isOpen onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Vozes$/i }))
    await waitFor(() =>
      expect(screen.getByText(/Nenhum perfil cadastrado/i)).toBeInTheDocument(),
    )
  })
})

// ─── Gear button integration ──────────────────────────────────────────────────

describe('MayaWidget — gear button opens settings modal', () => {
  it('gear button is visible inside open sidebar', () => {
    render(<MayaWidget />)
    // Open the sidebar
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeInTheDocument()
  })

  it('clicking gear button renders settings modal', async () => {
    render(<MayaWidget />)
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    fireEvent.click(screen.getByRole('button', { name: /Configurações/i }))
    await waitFor(() =>
      expect(screen.getByTestId('widget-settings-modal')).toBeInTheDocument(),
    )
  })

  it('settings modal closes via Escape without closing sidebar', async () => {
    render(<MayaWidget />)
    fireEvent.click(screen.getByRole('button', { name: /abrir maya/i }))
    fireEvent.click(screen.getByRole('button', { name: /Configurações/i }))
    await waitFor(() => expect(screen.getByTestId('widget-settings-modal')).toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() =>
      expect(screen.queryByTestId('widget-settings-modal')).not.toBeInTheDocument(),
    )
    // Sidebar should still be open
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false')
  })
})
