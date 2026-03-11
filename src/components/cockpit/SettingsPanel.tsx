"use client"
import React, { useEffect, useState } from 'react'

type Settings = {
  ttsVoice: string
  ttsProvider: string
  debug: boolean
  keepAudioInBackground?: boolean
}

const DEFAULTS: Settings = {
  ttsVoice: 'pt-BR-FranciscaNeural',
  ttsProvider: 'azure',
  debug: false,
  keepAudioInBackground: false,
}

async function clearAllMemory(): Promise<boolean> {
  try {
    const res = await fetch('/api/jarvis-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'clear_memory', payload: { scope: 'all' } }),
    })
    const j = await res.json().catch(() => null)
    // Limpar localStorage de mensagens e session
    try {
      localStorage.removeItem('jarvis_messages')
      localStorage.removeItem('jarvis_session_id')
    } catch (_) {}
    // Sinalizar para o ChatPanel limpar o estado de mensagens
    try { window.dispatchEvent(new CustomEvent('jarvis:clear-messages')) } catch (_) {}
    return j?.ok === true
  } catch {
    return false
  }
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('maya_settings')
      if (raw) setSettings(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    setSaved(false)
  }

  function handleSave() {
    try {
      localStorage.setItem('maya_settings', JSON.stringify(settings))
      setSaved(true)
      // Notify runtime that settings changed so listeners can apply immediately
      try {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('settings:updated', { detail: settings }))
      } catch (_) {}
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('Failed to save settings', e)
    }
  }

  async function handleClearMemory() {
    if (!window.confirm('Apagar todo o histórico de conversas e fatos memorizados?\n\nEssa ação não pode ser desfeita.')) return
    setClearing(true)
    await clearAllMemory()
    setClearing(false)
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
  }

  // Modal overlay
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleClose(e: React.MouseEvent | React.KeyboardEvent) {
    if (e.type === 'click' && e.target === e.currentTarget) {
      // Fechar ao clicar fora
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('closeSettingsModal'));
    }
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Escape') {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('closeSettingsModal'));
    }
  }

  useEffect(() => {
    const escListener = (e: KeyboardEvent) => { if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('closeSettingsModal')); };
    window.addEventListener('keydown', escListener);
    return () => window.removeEventListener('keydown', escListener);
  }, []);

  return (
    <div
      onClick={handleClose}
      onKeyDown={handleClose}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: 'rgba(2,6,9,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          width: '320px',
          background: 'rgba(2,6,9,0.92)',
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: '10px',
          padding: '22px 18px',
          boxShadow: '0 0 32px rgba(0,212,255,0.13)',
          fontFamily: 'Share Tech Mono, monospace',
          color: '#00d4ff',
          animation: 'chatExpand 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,212,255,0.7)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Configurações
        </div>

        {/* Voz TTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 600 }}>Voz TTS</label>
          <select
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '15px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer',
              minHeight: '44px',
              width: '100%',
              zIndex: 2,
              pointerEvents: 'auto',
            }}
            value={settings.ttsVoice}
            onChange={(e) => update('ttsVoice', e.target.value)}
          >
            <option value="pt-BR-FranciscaNeural">pt-BR Francisca (Azure)</option>
            <option value="nova">Nova (client)</option>
            <option value="onyx">Onyx (OpenAI)</option>
          </select>
        </div>

        {/* Provedor TTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 600 }}>Provedor TTS</label>
          <select
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '15px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer',
              minHeight: '44px',
              width: '100%',
              zIndex: 2,
              pointerEvents: 'auto',
            }}
            value={settings.ttsProvider}
            onChange={(e) => update('ttsProvider', e.target.value)}
          >
            <option value="azure">Azure Speech</option>
            <option value="gemini">Gemini TTS</option>
            <option value="openai">OpenAI TTS</option>
            <option value="browser">Browser SpeechSynthesis</option>
          </select>
        </div>

        {/* Debug logs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.debug}
            onChange={(e) => update('debug', e.target.checked)}
            style={{ accentColor: '#00ff88', marginRight: '6px', transform: 'scale(1.2)' }}
          />
          <span style={{ fontSize: '12px', color: '#00d4ff' }}>Ativar logs de debug</span>
        </div>

        {/* Keep audio playing when tab hidden */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={!!settings.keepAudioInBackground}
            onChange={(e) => update('keepAudioInBackground', e.target.checked)}
            style={{ accentColor: '#00ff88', marginRight: '6px', transform: 'scale(1.2)' }}
          />
          <span style={{ fontSize: '12px', color: '#00d4ff' }}>Continuar áudio em segundo plano</span>
        </div>

        {/* Limpar memória */}
        <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(0,212,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Memória</span>
          <button
            onClick={handleClearMemory}
            disabled={clearing}
            style={{
              padding: '10px 0',
              borderRadius: '6px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: cleared ? '#4ade80' : '#f87171',
              fontSize: '13px',
              cursor: clearing ? 'not-allowed' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              opacity: clearing ? 0.5 : 1,
              transition: 'all 0.2s',
              width: '100%',
            }}
          >
            {cleared ? '✓ Memória limpa' : clearing ? 'Limpando...' : '🗑 Limpar histórico e memória'}
          </button>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', zIndex: 1 }}>
          <button
            style={{
              padding: '14px 0',
              borderRadius: '6px',
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 700,
              fontFamily: 'Share Tech Mono, monospace',
              boxShadow: '0 0 8px rgba(0,212,255,0.15)',
              transition: 'all 0.2s',
              width: '100%',
              minHeight: '44px',
              zIndex: 3,
              pointerEvents: 'auto',
            }}
            onClick={handleSave}
          >
            Salvar
          </button>
          {saved && (
            <span style={{ fontSize: '12px', color: '#00ff88', fontWeight: 700, animation: 'pulse 1s infinite' }}>Salvo!</span>
          )}
        </div>

        {/* Nota */}
        <div style={{ fontSize: '11px', color: 'rgba(0,212,255,0.45)', marginTop: '8px', lineHeight: 1.5 }}>
          <strong>Nota:</strong> As chaves dos provedores devem ser configuradas em <span style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 4px', borderRadius: '4px', color: '#fff' }}>.env.local</span> para provedores server-side.<br />
          Este painel define apenas preferências locais da interface.
        </div>
        {/* Botão fechar */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('closeSettingsModal'))}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '14px',
            fontSize: '12px',
            color: '#fff',
            background: 'rgba(0,212,255,0.13)',
            border: '1px solid rgba(0,212,255,0.18)',
            borderRadius: '6px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace',
            boxShadow: '0 0 6px rgba(0,212,255,0.13)',
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
