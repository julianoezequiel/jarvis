"use client"
import React, { useEffect, useState, useCallback } from 'react'

type Settings = {
  ttsVoice: string
  ttsProvider: string
  debug: boolean
  keepAudioInBackground?: boolean
  welcomeMessage?: string
  _providerExplicit?: boolean
}

const DEFAULTS: Settings = {
  ttsVoice: 'pt-BR-FranciscaNeural',
  ttsProvider: 'edge',
  debug: false,
  keepAudioInBackground: false,
  welcomeMessage: '',
}

async function clearAllMemory(): Promise<boolean> {
  try {
    const res = await fetch('/api/maya-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'clear_memory', payload: { scope: 'all' } }),
    })
    const j = await res.json().catch(() => null)
    // Limpar localStorage de mensagens e session
    try {
      localStorage.removeItem('maya_messages')
      localStorage.removeItem('maya_session_id')
    } catch (_) {}
    // Sinalizar para o ChatPanel limpar o estado de mensagens
    try { window.dispatchEvent(new CustomEvent('maya:clear-messages')) } catch (_) {}
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

  // ── Voice Profiles state ────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<{ id: string; name: string; enrolledAt: string }[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [verifyEnabled, setVerifyEnabled] = useState(false)
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true)
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null)
  const [verifyThreshold, setVerifyThreshold] = useState(0.85)

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      const res = await fetch('/api/speaker-enroll')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles ?? [])
      }
    } catch (_) {}
    setProfilesLoading(false)
  }, [])

  const handleDeleteProfile = async (name: string) => {
    if (!window.confirm(`Remover voz de "${name}"?`)) return
    setDeletingProfile(name)
    try {
      await fetch('/api/speaker-enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      await loadProfiles()
    } catch (_) {}
    setDeletingProfile(null)
  }

  const handleToggleVerify = (enabled: boolean) => {
    setVerifyEnabled(enabled)
    localStorage.setItem('maya_speaker_verify_enabled', enabled ? 'true' : 'false')
  }

  const handleToggleWakeWord = (enabled: boolean) => {
    setWakeWordEnabled(enabled)
    localStorage.setItem('maya_wake_word_enabled', enabled ? 'true' : 'false')
  }

  const handleThresholdChange = (value: number) => {
    setVerifyThreshold(value)
    localStorage.setItem('maya_verify_threshold', String(value))
  }

  const handleOpenEnrollModal = () => {
    window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName: '' } }))
    window.dispatchEvent(new CustomEvent('closeSettingsModal'))
  }

  const handleUpdateProfile = (name: string) => {
    window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName: name } }))
    window.dispatchEvent(new CustomEvent('closeSettingsModal'))
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('maya_settings')
      if (raw) {
        const saved = JSON.parse(raw)
        // Migra: 'azure' era o antigo default — substitui por 'edge' se não foi escolha explícita do usuário
        if (saved.ttsProvider === 'azure' && !saved._providerExplicit) {
          saved.ttsProvider = 'edge'
          saved.ttsVoice = 'pt-BR-FranciscaNeural'
        }
        // Mescla com DEFAULTS para que novas chaves sempre tenham valor inicial
        setSettings({ ...DEFAULTS, ...saved })
      }
    } catch (e) {
      // ignore
    }
    // Load voice verify flag + threshold + profiles
    setVerifyEnabled(localStorage.getItem('maya_speaker_verify_enabled') === 'true')
    setWakeWordEnabled(localStorage.getItem('maya_wake_word_enabled') !== 'false')
    const storedThreshold = localStorage.getItem('maya_verify_threshold')
    if (storedThreshold) setVerifyThreshold(parseFloat(storedThreshold))
    void loadProfiles()
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    setSaved(false)
  }

  function handleSave() {
    try {
      // Marca que o usuário escolheu explicitamente o provedor (impede migração automática futura)
      const toSave = { ...settings, _providerExplicit: true }
      localStorage.setItem('maya_settings', JSON.stringify(toSave))
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
        top: 0, left: 0,
        width: '100vw', height: '100vh',
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
          width: 'min(92vw, 960px)',
          background: 'rgba(2,6,9,0.95)',
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: '12px',
          padding: '28px 32px 24px',
          boxShadow: '0 0 48px rgba(0,212,255,0.12)',
          fontFamily: 'Share Tech Mono, monospace',
          color: '#00d4ff',
          animation: 'chatExpand 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(0,212,255,0.7)', textTransform: 'uppercase' }}>
            ⚙ Configurações
          </span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('closeSettingsModal'))}
            style={{
              fontSize: '12px', color: '#fff',
              background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.18)',
              borderRadius: '6px', padding: '4px 14px', cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
            }}
          >
            Fechar
          </button>
        </div>

        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

          {/* ── Coluna 1: Voz ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.45)', borderBottom: '1px solid rgba(0,212,255,0.1)', paddingBottom: '6px' }}>
              Voz
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600 }}>Provedor TTS</label>
              <select
                value={settings.ttsProvider}
                onChange={(e) => {
                  const provider = e.target.value
                  const voiceDefaults: Record<string, string> = {
                    edge: 'pt-BR-FranciscaNeural',
                    azure: 'pt-BR-FranciscaNeural',
                    gemini: 'Kore',
                    openai: 'nova',
                    browser: '',
                  }
                  // Atualiza ttsProvider + ttsVoice em um único setState para evitar race condition
                  setSettings(prev => ({ ...prev, ttsProvider: provider, ttsVoice: voiceDefaults[provider] ?? '' }))
                  setSaved(false)
                }}
                style={selectStyle}
              >
                <option value="edge">EdgeTTS (grátis, padrão)</option>
                <option value="azure">Azure Speech</option>
                <option value="gemini">Gemini TTS</option>
                <option value="openai">OpenAI TTS</option>
                <option value="browser">Browser SpeechSynthesis</option>
              </select>
            </div>

            {settings.ttsProvider !== 'browser' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600 }}>Voz TTS</label>
              {(settings.ttsProvider === 'edge' || settings.ttsProvider === 'azure' || !settings.ttsProvider) && (
                <select value={settings.ttsVoice} onChange={(e) => update('ttsVoice', e.target.value)} style={selectStyle}>
                  <option value="pt-BR-FranciscaNeural">pt-BR Francisca Neural</option>
                </select>
              )}
              {settings.ttsProvider === 'gemini' && (
                <select value={settings.ttsVoice} onChange={(e) => update('ttsVoice', e.target.value)} style={selectStyle}>
                  <option value="Kore">Kore (feminino)</option>
                  <option value="Aoede">Aoede (feminino)</option>
                  <option value="Fenrir">Fenrir (masculino)</option>
                  <option value="Charon">Charon (masculino)</option>
                  <option value="Puck">Puck (masculino)</option>
                  <option value="Zephyr">Zephyr (feminino)</option>
                  <option value="Orbit">Orbit (neutro)</option>
                </select>
              )}
              {settings.ttsProvider === 'openai' && (
                <select value={settings.ttsVoice} onChange={(e) => update('ttsVoice', e.target.value)} style={selectStyle}>
                  <option value="nova">Nova (feminino)</option>
                  <option value="alloy">Alloy (neutro)</option>
                  <option value="echo">Echo (masculino)</option>
                  <option value="fable">Fable (masculino)</option>
                  <option value="onyx">Onyx (masculino)</option>
                  <option value="shimmer">Shimmer (feminino)</option>
                </select>
              )}
              {settings.ttsProvider === 'gemini' && (
                <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>Requer GEMINI_API_KEY — 10 RPM no plano gratuito</span>
              )}
              {settings.ttsProvider === 'openai' && (
                <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>Requer OPENAI_API_KEY — cobrado por caractere</span>
              )}
              {settings.ttsProvider === 'azure' && (
                <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>Requer AZURE_TTS_KEY — 500k chars/mês grátis</span>
              )}
              {(settings.ttsProvider === 'edge' || !settings.ttsProvider) && (
                <span style={{ fontSize: '10px', color: 'rgba(0,255,136,0.6)' }}>✓ Gratuito, sem API key necessária</span>
              )}
            </div>
            )}
          </div>

          {/* ── Coluna 2: Interface ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.45)', borderBottom: '1px solid rgba(0,212,255,0.1)', paddingBottom: '6px' }}>
              Interface
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600 }}>Mensagem de inicialização</label>
              <input
                type="text"
                placeholder="Oi! Tudo pronto por aqui."
                value={settings.welcomeMessage ?? ''}
                onChange={(e) => update('welcomeMessage', e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>Deixe em branco para usar a padrão</span>
            </div>

            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={settings.debug} onChange={(e) => update('debug', e.target.checked)} style={checkStyle} />
              <span style={{ fontSize: '12px' }}>Ativar logs de debug</span>
            </label>

            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={!!settings.keepAudioInBackground} onChange={(e) => update('keepAudioInBackground', e.target.checked)} style={checkStyle} />
              <span style={{ fontSize: '12px' }}>Continuar áudio em segundo plano</span>
            </label>
          </div>

          {/* ── Coluna 3: Dados ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.45)', borderBottom: '1px solid rgba(0,212,255,0.1)', paddingBottom: '6px' }}>
              Dados & Memória
            </span>

            <button
              onClick={handleClearMemory}
              disabled={clearing}
              style={{
                padding: '10px 0', borderRadius: '6px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                color: cleared ? '#4ade80' : '#f87171',
                fontSize: '12px', cursor: clearing ? 'not-allowed' : 'pointer',
                fontFamily: 'Share Tech Mono, monospace', opacity: clearing ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {cleared ? '✓ Memória limpa' : clearing ? 'Limpando...' : '🗑 Limpar histórico e memória'}
            </button>

            <div style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)', lineHeight: 1.6, marginTop: 'auto' }}>
              <strong style={{ color: 'rgba(0,212,255,0.55)' }}>Nota:</strong> Chaves de API devem ser configuradas em{' '}
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3, color: '#fff' }}>.env.local</code>.
              Este painel define apenas preferências locais.
            </div>
          </div>
        </div>

        {/* ── Voice Profiles section ─────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.45)' }}>
              🎙 Identificação de Voz
            </span>
            <button
              onClick={handleOpenEnrollModal}
              style={{
                fontSize: '11px', fontFamily: 'Share Tech Mono, monospace',
                background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)',
                color: '#00d4ff', borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              }}
            >
              + Cadastrar nova voz
            </button>
          </div>

          {/* Threshold slider */}
          {verifyEnabled && profiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(0,212,255,0.6)' }}>Sensibilidade do reconhecimento</span>
                <span style={{ fontSize: '11px', fontFamily: 'Share Tech Mono, monospace', color: '#00d4ff' }}>
                  {verifyThreshold === 0.95 ? 'Muito alto' :
                   verifyThreshold >= 0.85 ? 'Alto' :
                   verifyThreshold >= 0.75 ? 'Médio' : 'Baixo'}
                  {' '}({verifyThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min={0.60} max={0.95} step={0.05}
                value={verifyThreshold}
                onChange={e => handleThresholdChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00d4ff', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', color: 'rgba(0,212,255,0.35)' }}>← Mais permissivo</span>
                <span style={{ fontSize: '9px', color: 'rgba(0,212,255,0.35)' }}>Mais restrito →</span>
              </div>
            </div>
          )}

          {/* Toggle verification */}
          <label style={{ ...checkboxRowStyle, alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              checked={verifyEnabled}
              onChange={e => handleToggleVerify(e.target.checked)}
              style={{ ...checkStyle, marginTop: 2 }}
              disabled={profiles.length === 0}
            />
            <span>
              <span style={{ fontSize: '12px', color: profiles.length === 0 ? 'rgba(0,212,255,0.35)' : '#00d4ff' }}>
                Ativar verificação de voz antes de responder
              </span>
              <br />
              <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>
                {profiles.length === 0
                  ? 'Cadastre ao menos uma voz para ativar esta opção'
                  : 'Maya identificará o falante em cada mensagem de voz'}
              </span>
            </span>
          </label>

          {/* Toggle wake word */}
          <label style={{ ...checkboxRowStyle, alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              checked={wakeWordEnabled}
              onChange={e => handleToggleWakeWord(e.target.checked)}
              style={{ ...checkStyle, marginTop: 2 }}
            />
            <span>
              <span style={{ fontSize: '12px', color: '#00d4ff' }}>
                Ativar por wake word (&quot;Maya, ...&quot;)
              </span>
              <br />
              <span style={{ fontSize: '10px', color: 'rgba(0,212,255,0.38)' }}>
                {wakeWordEnabled
                  ? 'Fale &quot;Maya&quot; primeiro — o microfone fica em standby silencioso'
                  : 'Microfone sempre ativo — toda fala é processada'}
              </span>
            </span>
          </label>

          {/* Profile list */}
          {profilesLoading ? (
            <span style={{ fontSize: '11px', color: 'rgba(0,212,255,0.45)' }}>Carregando perfis...</span>
          ) : profiles.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'rgba(0,212,255,0.38)' }}>Nenhum perfil de voz cadastrado.</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profiles.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(0,212,255,0.4)' }}>
                    {new Date(p.enrolledAt).toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    onClick={() => handleUpdateProfile(p.name)}
                    title={`Regravar voz de "${p.name}"`}
                    style={{
                      background: 'none', border: 'none', color: 'rgba(0,212,255,0.6)',
                      cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px',
                    }}
                  >
                    ↺
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(p.name)}
                    disabled={deletingProfile === p.name}
                    title={`Remover ${p.name}`}
                    style={{
                      background: 'none', border: 'none', color: deletingProfile === p.name ? '#475569' : '#f87171',
                      cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '18px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '11px 40px', borderRadius: '6px',
              background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff', fontSize: '13px', cursor: 'pointer',
              fontWeight: 700, fontFamily: 'Share Tech Mono, monospace',
              boxShadow: '0 0 8px rgba(0,212,255,0.12)', transition: 'all 0.2s',
            }}
          >
            Salvar
          </button>
          {saved && <span style={{ fontSize: '12px', color: '#00ff88', fontWeight: 700 }}>✓ Salvo!</span>}
        </div>
      </div>
    </div>
  )
}

/* ── Shared micro-styles ── */
const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '6px', padding: '9px 10px', fontSize: '13px',
  color: '#fff', outline: 'none', fontFamily: 'Share Tech Mono, monospace',
  cursor: 'pointer', width: '100%',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '6px', padding: '9px 10px', fontSize: '13px',
  color: '#fff', outline: 'none', fontFamily: 'Share Tech Mono, monospace', width: '100%',
  boxSizing: 'border-box',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#00d4ff',
}

const checkStyle: React.CSSProperties = {
  accentColor: '#00ff88', transform: 'scale(1.2)', cursor: 'pointer',
}
