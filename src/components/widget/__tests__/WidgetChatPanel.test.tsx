/**
 * WidgetChatPanel.test.tsx — Phase 3 tests
 *
 * Covers: rendering, user interaction (type/send/key), status states,
 * empty state, thinking indicator, and stop button.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WidgetChatPanel from '../WidgetChatPanel'

// ─── Mock useMayaChat ──────────────────────────────────────────────────────────

const mockSendMessage = vi.fn()
const mockAddUserMessage = vi.fn()
const mockStopAudio = vi.fn()

const defaultHookReturn = {
  messages: [] as ChatMessage[],
  status: 'idle' as string,
  listenEnabled: false,
  setListen: vi.fn(),
  sendMessage: mockSendMessage,
  addUserMessage: mockAddUserMessage,
  stopAudio: mockStopAudio,
  clear: vi.fn(),
}

vi.mock('../../../hooks/useMayaChat', () => ({
  useMayaChat: vi.fn(),
}))

// Import the module so we can override it in each test
import { useMayaChat, ChatMessage } from '../../../hooks/useMayaChat'
const mockUseMayaChat = vi.mocked(useMayaChat)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupHook(overrides: Partial<typeof defaultHookReturn> = {}) {
  mockUseMayaChat.mockReturnValue({ ...defaultHookReturn, ...overrides })
}

// Reset mocks before each test
beforeEach(() => {
  mockSendMessage.mockReset().mockResolvedValue(undefined)
  mockAddUserMessage.mockReset()
  mockStopAudio.mockReset()
  setupHook()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WidgetChatPanel', () => {
  // ── Empty state ──────────────────────────────────────────────────────────────

  it('shows empty hint when no messages and not thinking', () => {
    render(<WidgetChatPanel />)
    expect(screen.getByText('Como posso ajudar?')).toBeInTheDocument()
  })

  it('hides empty hint when thinking (even if no messages)', () => {
    setupHook({ messages: [], status: 'thinking' })
    render(<WidgetChatPanel />)
    expect(screen.queryByText('Como posso ajudar?')).not.toBeInTheDocument()
  })

  it('hides empty hint when messages exist', () => {
    setupHook({
      messages: [{ id: '1', role: 'assistant', text: 'Olá!' }],
    })
    render(<WidgetChatPanel />)
    expect(screen.queryByText('Como posso ajudar?')).not.toBeInTheDocument()
  })

  // Helper: simulate typing into a textarea via fireEvent

  // ── Message rendering ────────────────────────────────────────────────────────

  it('renders user message', () => {
    setupHook({
      messages: [{ id: '1', role: 'user', text: 'Oi, tudo bem?' }],
    })
    render(<WidgetChatPanel />)
    expect(screen.getByText('Oi, tudo bem?')).toBeInTheDocument()
  })

  it('renders assistant message', () => {
    setupHook({
      messages: [{ id: '2', role: 'assistant', text: 'Tudo ótimo, Sir!' }],
    })
    render(<WidgetChatPanel />)
    expect(screen.getByText('Tudo ótimo, Sir!')).toBeInTheDocument()
  })

  it('renders system message', () => {
    setupHook({
      messages: [{ id: '3', role: 'system', text: '[Agente ativo]' }],
    })
    render(<WidgetChatPanel />)
    expect(screen.getByText('[Agente ativo]')).toBeInTheDocument()
  })

  it('renders multiple messages in order', () => {
    setupHook({
      messages: [
        { id: '1', role: 'user', text: 'Pergunta' },
        { id: '2', role: 'assistant', text: 'Resposta' },
      ],
    })
    render(<WidgetChatPanel />)

    const list = screen.getByTestId('widget-message-list')
    expect(list).toBeInTheDocument()
    expect(screen.getByText('Pergunta')).toBeInTheDocument()
    expect(screen.getByText('Resposta')).toBeInTheDocument()
  })

  // ── Thinking indicator ───────────────────────────────────────────────────────

  it('shows PENSANDO… label when status is thinking', () => {
    setupHook({ status: 'thinking' })
    render(<WidgetChatPanel />)
    expect(screen.getByText(/PENSANDO/)).toBeInTheDocument()
  })

  it('does not show PENSANDO… when status is idle', () => {
    setupHook({ status: 'idle' })
    render(<WidgetChatPanel />)
    expect(screen.queryByText(/PENSANDO/)).not.toBeInTheDocument()
  })

  // ── Speaking state ───────────────────────────────────────────────────────────

  it('shows FALANDO… label when status starts with speaking', () => {
    setupHook({ status: 'speaking' })
    render(<WidgetChatPanel />)
    expect(screen.getByText(/FALANDO/)).toBeInTheDocument()
  })

  it('shows stop button when speaking', () => {
    setupHook({ status: 'speaking' })
    render(<WidgetChatPanel />)
    expect(screen.getByRole('button', { name: /parar fala/i })).toBeInTheDocument()
  })

  it('calls stopAudio when stop button is clicked', () => {
    setupHook({ status: 'speaking' })
    render(<WidgetChatPanel />)
    const stopBtn = screen.getByRole('button', { name: /parar fala/i })
    fireEvent.click(stopBtn)
    expect(mockStopAudio).toHaveBeenCalledTimes(1)
  })

  it('does not show stop button when status is idle', () => {
    setupHook({ status: 'idle' })
    render(<WidgetChatPanel />)
    expect(screen.queryByRole('button', { name: /parar fala/i })).not.toBeInTheDocument()
  })

  // ── Input field ───────────────────────────────────────────────────────────────

  it('renders the textarea input', () => {
    render(<WidgetChatPanel />)
    expect(screen.getByTestId('widget-input')).toBeInTheDocument()
  })

  it('updates textarea value on typing', () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Olá' } })
    expect(input.value).toBe('Olá')
  })

  // ── Send button ───────────────────────────────────────────────────────────────

  it('renders the send button', () => {
    render(<WidgetChatPanel />)
    expect(screen.getByTestId('widget-send-btn')).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<WidgetChatPanel />)
    const btn = screen.getByTestId('widget-send-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('send button is disabled when input is only whitespace', () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: '   ' } })
    const btn = screen.getByTestId('widget-send-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('send button is enabled when input has text and status is idle', () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: 'Oi!' } })
    const btn = screen.getByTestId('widget-send-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('send button is disabled when thinking (even with input)', () => {
    setupHook({ status: 'thinking' })
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: 'Mensagem' } })
    const btn = screen.getByTestId('widget-send-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  // ── Send actions ──────────────────────────────────────────────────────────────

  it('clicking send button calls addUserMessage and sendMessage', async () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: 'Pergunta teste' } })
    fireEvent.click(screen.getByTestId('widget-send-btn'))

    await waitFor(() => expect(mockAddUserMessage).toHaveBeenCalledWith('Pergunta teste'))
    expect(mockSendMessage).toHaveBeenCalledWith({ message: 'Pergunta teste' })
  })

  it('clears the input after sending', async () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Texto qualquer' } })
    fireEvent.click(screen.getByTestId('widget-send-btn'))

    await waitFor(() => expect(input.value).toBe(''))
  })

  it('pressing Enter calls addUserMessage and sendMessage', async () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: 'Olá' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(mockAddUserMessage).toHaveBeenCalledWith('Olá'))
    expect(mockSendMessage).toHaveBeenCalledWith({ message: 'Olá' })
  })

  it('pressing Shift+Enter does NOT submit', () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Linha 1' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(mockSendMessage).not.toHaveBeenCalled()
    expect(input.value).toContain('Linha 1')
  })

  it('pressing Enter with empty input does NOT call sendMessage', () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('trims whitespace before sending', async () => {
    render(<WidgetChatPanel />)
    const input = screen.getByTestId('widget-input')
    fireEvent.change(input, { target: { value: '  mensagem  ' } })
    fireEvent.click(screen.getByTestId('widget-send-btn'))

    await waitFor(() => expect(mockAddUserMessage).toHaveBeenCalledWith('mensagem'))
    expect(mockSendMessage).toHaveBeenCalledWith({ message: 'mensagem' })
  })

  // ── onStatusChange callback ───────────────────────────────────────────────────

  it('calls onStatusChange when status changes', () => {
    const onStatusChange = vi.fn()
    setupHook({ status: 'thinking' })
    render(<WidgetChatPanel onStatusChange={onStatusChange} />)
    expect(onStatusChange).toHaveBeenCalledWith('thinking')
  })

  // ── Message list container ────────────────────────────────────────────────────

  it('renders the message list container', () => {
    render(<WidgetChatPanel />)
    expect(screen.getByTestId('widget-message-list')).toBeInTheDocument()
  })
})
