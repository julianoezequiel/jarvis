"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMayaChat } from '../../hooks/useMayaChat'

const VISIBLE_COUNT = 8

async function saveFactFromMessage(text: string): Promise<boolean> {
  try {
    const res = await fetch('/api/maya-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'remember_fact', payload: { fact: text, category: 'pinned', importance: 3, source: 'user-pin' } }),
    })
    const j = await res.json().catch(() => null)
    return j?.ok === true
  } catch {
    return false
  }
}

export default function ChatPanel({ alwaysOpen = false }: { alwaysOpen?: boolean }) {
  const { messages, status, listenEnabled, setListen, sendMessage, addUserMessage, stopAudio } = useMayaChat()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(alwaysOpen)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/png')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [paidKeyActive, setPaidKeyActive] = useState(false)
  // Lazy init — reads localStorage on first render to avoid async state race
  const [noTts, setNoTts] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('maya_text_only_mode') === 'true' : false
  )
  const [noMic, setNoMic] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('maya_no_mic_mode') === 'true' : false
  )

  // Escuta o evento de chave paga ativa
  useEffect(() => {
    const handler = () => setPaidKeyActive(true)
    window.addEventListener('maya:paid-key-used', handler)
    return () => window.removeEventListener('maya:paid-key-used', handler)
  }, [])

  // Text-only mode — hide voice indicators
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onTtsChange = () => setNoTts(localStorage.getItem('maya_text_only_mode') === 'true')
    const onMicChange = () => setNoMic(localStorage.getItem('maya_no_mic_mode') === 'true')
    window.addEventListener('maya:text-only-changed', onTtsChange)
    window.addEventListener('maya:no-mic-changed', onMicChange)
    return () => {
      window.removeEventListener('maya:text-only-changed', onTtsChange)
      window.removeEventListener('maya:no-mic-changed', onMicChange)
    }
  }, [])
  const bottomRef = useRef<HTMLDivElement>(null)

  const attachImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      // result = "data:image/png;base64,XXXX" — extract only the base64 part
      const b64 = result.split(',')[1]
      if (b64) { setImageBase64(b64); setImageMime(file.type) }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) attachImage(file)
    e.target.value = ''
  }, [attachImage])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) { e.preventDefault(); attachImage(file) }
        break
      }
    }
  }, [attachImage])

  const handlePin = useCallback(async (id: string, msgText: string) => {
    if (pinnedIds.has(id) || pinningId === id) return
    setPinningId(id)
    const ok = await saveFactFromMessage(msgText)
    if (ok) setPinnedIds(prev => new Set(prev).add(id))
    setPinningId(null)
  }, [pinnedIds, pinningId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stopAudio() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stopAudio])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const ENABLE_LISTEN_CMDS  = ['ativar escuta', 'ative a escuta', 'ligar microfone', 'ativar microfone']
  const DISABLE_LISTEN_CMDS = ['desativar escuta', 'desative a escuta', 'desligar microfone', 'desativar microfone']
  const ENROLL_CMDS = ['cadastrar nova voz', 'cadastrar voz', 'nova voz', 'adicionar voz', 'registrar voz', 'adicionar usuário', 'cadastrar usuário']

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageBase64) return
    setText('')
    const capturedImage = imageBase64
    const capturedMime = imageMime
    setImageBase64(null)
    if (!capturedImage) {
      const lower = trimmed.toLowerCase()
      if (ENABLE_LISTEN_CMDS.some(cmd => lower.includes(cmd)))  { setListen(true);  return }
      if (DISABLE_LISTEN_CMDS.some(cmd => lower.includes(cmd))) { setListen(false); return }

      // Enroll intent — dispatch event for MayaCockpit to handle
      if (ENROLL_CMDS.some(cmd => lower.includes(cmd))) {
        const nameMatch = lower.match(/(?:para|de)\s+([a-záàãâéêíóôõúüç][a-záàãâéêíóôõúüç\s]{1,39})/i)
        const suggestedName = nameMatch ? nameMatch[1].trim() : ''
        window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName } }))
        // Fall through — also send to LLM so Maya acknowledges
      }
    }
    addUserMessage(trimmed || '📎 [imagem]')
    await sendMessage({ message: trimmed || 'Analise esta imagem.', imageBase64: capturedImage || undefined, imageMime: capturedMime })
  }

  const visible = messages.slice(-VISIBLE_COUNT)
  const isThinking = status === 'thinking' || status === 'streaming'
  const isSpeaking  = status.startsWith('speaking')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* Triangle toggle: ▶ closed, ▼ open */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Fechar chat' : 'Abrir chat'}
        style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: open ? '10px 8px 0 8px' : '9px 0 9px 16px',
          borderColor: open
            ? 'rgba(0,212,255,0.8) transparent transparent transparent'
            : 'transparent transparent transparent rgba(0,212,255,0.8)',
          background: 'none',
          cursor: 'pointer',
          filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.55))',
          transition: 'all 0.15s ease',
          marginLeft: open ? '0' : '2px',
          marginBottom: open ? '8px' : '0',
        }}
      />

      {open && (
        <div style={{
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(2,6,9,0.80)',
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: '8px',
          padding: '10px 12px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 20px rgba(0,212,255,0.07)',
          animation: 'chatExpand 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,212,255,0.6)', textTransform: 'uppercase' }}>
              Terminal
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
                border: isThinking ? '1px solid rgba(250,204,21,0.5)' : (!noTts && isSpeaking) ? '1px solid rgba(74,222,128,0.5)' : (!noMic && !listenEnabled) ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(0,212,255,0.2)',
                color: isThinking ? '#facc15' : (!noTts && isSpeaking) ? '#4ade80' : (!noMic && !listenEnabled) ? 'rgba(248,113,113,0.6)' : 'rgba(0,212,255,0.4)',
              }}>
                {isThinking ? 'pensando...'
                  : (!noTts && isSpeaking) ? 'falando'
                  : (!noMic && !listenEnabled) ? 'mic off'
                  : status}
              </span>
              {!noTts && isSpeaking && (
                <button onClick={stopAudio} style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '999px', border: '1px solid rgba(239,68,68,0.6)', color: '#f87171', background: 'none', cursor: 'pointer' }}>
                  ⏸ parar
                </button>
              )}
            </div>
          </div>

          {/* ⚠️ Banner: chave paga ativa */}
          {paidKeyActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.5)',
              borderRadius: 6, padding: '5px 10px',
              fontSize: 10, color: '#f87171',
              fontFamily: 'Share Tech Mono, monospace',
              letterSpacing: 0.5,
            }}>
              ⚠ ATENÇÃO: créditos gratuitos Gemini esgotados — usando chave PAGA
            </div>
          )}

          {/* Messages */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', minHeight: 0, paddingRight: '4px' }}>
            {messages.length === 0 && (
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>Aguardando comando...</div>
            )}
            {visible.map((m) => (
              <div
                key={m.id}
                onMouseEnter={() => m.role === 'assistant' ? setHoveredId(m.id) : undefined}
                onMouseLeave={() => setHoveredId(null)}
                style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                {m.role === 'system' ? (
                  /* Resultado de agente — estilo compacto roxo */
                  <div style={{
                    borderRadius: '6px', padding: '5px 10px', fontSize: '12px', lineHeight: '1.4',
                    background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(167,139,250,0.25)',
                    color: 'rgba(167,139,250,0.9)', maxWidth: '100%', wordBreak: 'break-word',
                  }}>
                    {m.text}
                  </div>
                ) : (
                <>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: m.role === 'user' ? 'rgba(74,222,128,0.6)' : 'rgba(0,212,255,0.55)' }}>
                  {m.role === 'user' ? 'você' : 'maya'}
                </span>
                <div style={{ position: 'relative', maxWidth: '90%' }}>
                  <div style={{
                    borderRadius: '8px', padding: '6px 12px', fontSize: '14px', lineHeight: '1.5',
                    background: m.role === 'user' ? 'rgba(22,101,52,0.35)' : 'rgba(30,58,138,0.25)',
                    border: m.role === 'user' ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(0,212,255,0.2)',
                    color: m.role === 'user' ? '#dcfce7' : 'rgba(0,212,255,0.9)',
                    paddingRight: m.role === 'assistant' ? '26px' : '12px',
                  }}>
                    {m.text.replace(/\s*\[CLEAR_CONFIRM_PENDING\]/g, '')}
                  </div>
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => handlePin(m.id, m.text)}
                      title={pinnedIds.has(m.id) ? 'Memorizado' : 'Memorizar'}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '6px',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        lineHeight: 1,
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: pinnedIds.has(m.id) ? 'default' : 'pointer',
                        opacity: pinnedIds.has(m.id) ? 1 : hoveredId === m.id ? 0.75 : 0,
                        color: pinnedIds.has(m.id) ? '#4ade80' : 'rgba(0,212,255,0.8)',
                        transition: 'opacity 0.15s ease',
                        pointerEvents: pinnedIds.has(m.id) ? 'none' : 'auto',
                      }}
                      disabled={pinnedIds.has(m.id) || pinningId === m.id}
                    >
                      {pinnedIds.has(m.id) ? '✓' : pinningId === m.id ? '…' : '📌'}
                    </button>
                  )}
                </div>
                </>
                )}
              </div>
            ))}
            {isThinking && (
              <div style={{ display: 'flex' }}>
                <div style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: 'rgba(0,212,255,0.45)', background: 'rgba(30,58,138,0.2)', border: '1px solid rgba(0,212,255,0.15)' }}>
                  ...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Image preview */}
          {imageBase64 && (
            <div style={{ position: 'relative', display: 'inline-block', marginTop: '2px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${imageMime};base64,${imageBase64}`}
                alt="preview"
                style={{ maxHeight: '80px', maxWidth: '100%', borderRadius: '6px', border: '1px solid rgba(0,212,255,0.3)', display: 'block' }}
              />
              <button
                onClick={() => setImageBase64(null)}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', color: '#fff', cursor: 'pointer', lineHeight: '16px', padding: 0, textAlign: 'center' }}
              >✕</button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar imagem (ou cole com Ctrl+V)"
              style={{ flexShrink: 0, padding: '5px 7px', borderRadius: '6px', background: imageBase64 ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(0,212,255,0.7)', fontSize: '13px', cursor: 'pointer', lineHeight: 1 }}
            >
              📎
            </button>
            <input
              style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#fff', outline: 'none' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite um comando..."
              autoComplete="off"
              suppressHydrationWarning
            />
            <button type="submit" disabled={isThinking}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '6px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '13px', cursor: isThinking ? 'not-allowed' : 'pointer', opacity: isThinking ? 0.4 : 1 }}>
              ▶
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
