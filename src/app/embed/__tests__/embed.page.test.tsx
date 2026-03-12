/**
 * Phase 5 Tests — Embed Page (postMessage bridging)
 *
 * Covers:
 *   - EmbedPage renders MayaWidget without crashing
 *   - postMessage from parent → dispatches maya:enroll-voice CustomEvent inside iframe
 *   - maya:enroll-complete CustomEvent → postMessage to window.parent
 *   - MayaWidget onOpenChange → postMessage widget:open-change to parent
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import EmbedPage from '../../../app/embed/page'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// useSearchParams returns no query params by default
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// useMayaChat — needed by WidgetChatPanel (via MayaSidebar → WidgetChatPanel)
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

// useSpeakerVerify — needed by WidgetEnrollModal
vi.mock('../../../hooks/useSpeakerVerify', () => ({
  useSpeakerVerify: vi.fn(() => ({
    verify:       vi.fn().mockResolvedValue({ match: false, score: 0 }),
    enrollByName: vi.fn().mockResolvedValue({ ok: true }),
  })),
}))

// ─── window.parent mock ───────────────────────────────────────────────────────

let parentMessages: unknown[] = []

beforeEach(() => {
  parentMessages = []
  Object.defineProperty(window, 'parent', {
    value: {
      postMessage: vi.fn((msg: unknown) => { parentMessages.push(msg) }),
    },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmbedPage', () => {
  it('renders without crashing', async () => {
    await act(async () => { render(<EmbedPage />) })
    // MayaOrb button is the primary rendered element
    expect(screen.getByRole('button', { name: /abrir maya/i })).toBeInTheDocument()
  })

  it('renders the orb button inside a transparent container', async () => {
    const { container } = render(<EmbedPage />)
    await act(async () => {})
    // The embed root div should have pointerEvents: none
    const root = container.querySelector('div')
    expect(root?.style.pointerEvents).toBe('none')
    expect(root?.style.background).toBe('transparent')
  })
})

describe('EmbedPage — postMessage bridge (parent → widget)', () => {
  it('dispatches maya:enroll-voice CustomEvent when parent posts maya:enroll-voice', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    const received: CustomEvent[] = []
    window.addEventListener('maya:enroll-voice', e => received.push(e as CustomEvent))

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'maya:enroll-voice', name: 'Carla', userId: 'usr_99' },
      }))
    })

    expect(received.length).toBe(1)
    expect(received[0].detail).toMatchObject({ name: 'Carla', userId: 'usr_99' })

    window.removeEventListener('maya:enroll-voice', e => received.push(e as CustomEvent))
  })

  it('dispatches maya:open CustomEvent when parent posts maya:open', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    const received: Event[] = []
    window.addEventListener('maya:open', e => received.push(e))

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'maya:open' },
      }))
    })

    expect(received.length).toBe(1)

    window.removeEventListener('maya:open', e => received.push(e))
  })

  it('ignores unknown message types without throwing', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    expect(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'some:unknown:event', payload: 'x' },
      }))
    }).not.toThrow()
  })

  it('ignores messages without a type field', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    expect(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { foo: 'bar' } }))
    }).not.toThrow()
  })
})

describe('EmbedPage — postMessage bridge (widget → parent)', () => {
  it('posts maya:enroll-complete to parent when CustomEvent fires', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    await act(async () => {
      window.dispatchEvent(new CustomEvent('maya:enroll-complete', {
        detail: { name: 'Carla', userId: 'usr_99', success: true },
      }))
    })

    const msg = parentMessages.find((m: unknown) =>
      (m as Record<string, unknown>).type === 'maya:enroll-complete',
    ) as Record<string, unknown> | undefined

    expect(msg).toBeDefined()
    expect(msg?.name).toBe('Carla')
    expect(msg?.success).toBe(true)
  })
})

describe('EmbedPage — onOpenChange → parent resize', () => {
  it('posts widget:open-change when MayaWidget open state changes', async () => {
    render(<EmbedPage />)
    await act(async () => {})

    // Open the widget by clicking the orb
    const orbBtn = screen.getByRole('button', { name: /abrir maya/i })
    await act(async () => { orbBtn.click() })

    const msg = parentMessages.find((m: unknown) =>
      (m as Record<string, unknown>).type === 'widget:open-change' &&
      (m as Record<string, unknown>).isOpen === true,
    ) as Record<string, unknown> | undefined

    expect(msg).toBeDefined()
    expect(msg?.isOpen).toBe(true)
  })
})
