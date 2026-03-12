'use client'

/**
 * WidgetSettingsModal — Phase 3 (doc phase "Fase 3")
 *
 * 4-tab settings modal rendered as a fixed overlay above MayaSidebar.
 * Tabs: Geral | Agentes | Conhecimento | Vozes
 *
 * CSS isolation: 100% inline styles — no Tailwind, no class name leakage.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentId } from '../../types/agents'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'geral' | 'agentes' | 'conhecimento' | 'vozes'

export interface WidgetSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  accentColor?: string
  /** Called immediately when user flips the position toggle */
  onPositionChange?: (side: 'right' | 'left') => void
}

interface KnowledgeFileMeta {
  id: string
  name: string
  type: string
  chunkCount: number
  uploadedAt: string
}

interface AgentMeta {
  id: AgentId
  name: string
  desc: string
  group: 'AIOS Core' | 'Fábrica Rentável'
}

interface SettingsData {
  ttsVoice: string
  ttsProvider: string
  keepAudioInBackground: boolean
  welcomeMessage: string
  _providerExplicit?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONO = `Orbitron, "Share Tech Mono", ui-monospace, monospace`
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif'

const SETTINGS_DEFAULTS: SettingsData = {
  ttsVoice: 'pt-BR-FranciscaNeural',
  ttsProvider: 'edge',
  keepAudioInBackground: false,
  welcomeMessage: '',
}

const AGENTS: AgentMeta[] = [
  { id: '@analyst',           name: 'Analista Estratégico', desc: 'Mercado, ROI, decisões estratégicas',  group: 'AIOS Core' },
  { id: '@developer',         name: 'Dev Full-Stack Sênior', desc: 'TypeScript, Node.js, Python, React', group: 'AIOS Core' },
  { id: '@researcher',        name: 'Pesquisador Profundo',  desc: 'Pesquisa, benchmarking, sínteses',   group: 'AIOS Core' },
  { id: '@writer',            name: 'Copywriter',            desc: 'Copy persuasivo, conteúdo digital',   group: 'AIOS Core' },
  { id: '@ux-design-expert',  name: 'Expert UX/UI',          desc: 'Wireframes, fluxos, acessibilidade', group: 'AIOS Core' },
  { id: '@manager',           name: 'Gerente de Projetos',   desc: 'OKRs, roadmaps, sprints',            group: 'AIOS Core' },
  { id: '@ideias-nichos',     name: 'Descoberta de Nichos',  desc: 'Oportunidades de mercado',           group: 'Fábrica Rentável' },
  { id: '@criador-conteudo',  name: 'Criador de Conteúdo',   desc: 'Redes sociais',                      group: 'Fábrica Rentável' },
  { id: '@produtor-cursos',   name: 'Produtor de Cursos',    desc: 'Cursos online',                      group: 'Fábrica Rentável' },
  { id: '@designer',          name: 'Designer',              desc: 'Design visual, identidade',          group: 'Fábrica Rentável' },
  { id: '@empacotador',       name: 'Empacotador',           desc: 'Produtos digitais',                  group: 'Fábrica Rentável' },
  { id: '@cortes-virais',     name: 'Cortes Virais',         desc: 'Vídeos e roteiros virais',           group: 'Fábrica Rentável' },
  { id: '@gestor-contas',     name: 'Gestor de Contas',      desc: 'Plataformas digitais',               group: 'Fábrica Rentável' },
  { id: '@trafego-organico',  name: 'Tráfego Orgânico',      desc: 'SEO, crescimento orgânico',          group: 'Fábrica Rentável' },
  { id: '@vendas',            name: 'Vendas',                desc: 'Estratégias e conversão',            group: 'Fábrica Rentável' },
  { id: '@relacionamento',    name: 'Relacionamento',        desc: 'CRM, clientes',                      group: 'Fábrica Rentável' },
  { id: '@auditor',           name: 'Auditor',               desc: 'Processos e conformidade',           group: 'Fábrica Rentável' },
  { id: '@analista-metricas', name: 'Analista de Métricas',  desc: 'KPIs e dados',                       group: 'Fábrica Rentável' },
  { id: '@automacao-tecnica', name: 'Automação Técnica',     desc: 'Processos automáticos',              group: 'Fábrica Rentável' },
  { id: '@financeiro-pix',    name: 'Financeiro',            desc: 'Fluxo de caixa, DRE',                group: 'Fábrica Rentável' },
  { id: '@melhoria-continua', name: 'Melhoria Contínua',     desc: 'Kaizen, retrospectivas',             group: 'Fábrica Rentável' },
]

const TABS: { id: Tab; label: string }[] = [
  { id: 'geral',        label: 'Geral' },
  { id: 'agentes',      label: 'Agentes' },
  { id: 'conhecimento', label: 'Conhecimento' },
  { id: 'vozes',        label: 'Vozes' },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

async function clearAllMemory(): Promise<void> {
  try {
    await fetch('/api/maya-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'clear_memory', payload: { scope: 'all' } }),
    })
    try { localStorage.removeItem('maya_messages'); localStorage.removeItem('maya_session_id') } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('maya:clear-messages')) } catch (_) {}
  } catch (_) {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WidgetSettingsModal({
  isOpen,
  onClose,
  accentColor = '#00d4ff',
  onPositionChange,
}: WidgetSettingsModalProps) {
  const [tab, setTab] = useState<Tab>('geral')

  // ── Geral
  const [position, setPosition]   = useState<'right' | 'left'>('right')
  const [settings, setSettings]   = useState<SettingsData>(SETTINGS_DEFAULTS)
  const [saved, setSaved]         = useState(false)
  const [clearing, setClearing]   = useState(false)
  const [cleared, setCleared]     = useState(false)

  // ── Agentes
  const [agentsEnabled, setAgentsEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENTS.map(a => [a.id, true])),
  )

  // ── Conhecimento
  const [knFiles, setKnFiles]     = useState<KnowledgeFileMeta[]>([])
  const [knLoading, setKnLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  // ── Vozes
  const [profiles, setProfiles]             = useState<{ id: string; name: string; enrolledAt: string }[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [verifyEnabled, setVerifyEnabled]   = useState(false)
  const [threshold, setThreshold]           = useState(0.85)
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null)

  // ── Load state when modal opens
  useEffect(() => {
    if (!isOpen) return

    // Position
    const pos = localStorage.getItem('maya_widget_position')
    setPosition(pos === 'left' ? 'left' : 'right')

    // TTS settings
    try {
      const raw = localStorage.getItem('maya_settings')
      if (raw) {
        const s = JSON.parse(raw) as Partial<SettingsData>
        if ((s as {ttsProvider?: string}).ttsProvider === 'azure' && !(s._providerExplicit)) {
          s.ttsProvider = 'edge'
          s.ttsVoice    = 'pt-BR-FranciscaNeural'
        }
        setSettings({ ...SETTINGS_DEFAULTS, ...s })
      } else {
        setSettings(SETTINGS_DEFAULTS)
      }
    } catch (_) { setSettings(SETTINGS_DEFAULTS) }

    // Agents config
    try {
      const raw = localStorage.getItem('maya_agents_config')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>
        setAgentsEnabled(prev => ({ ...prev, ...parsed }))
      }
    } catch (_) {}

    // Vozes
    setVerifyEnabled(localStorage.getItem('maya_speaker_verify_enabled') === 'true')
    const storedT = localStorage.getItem('maya_verify_threshold')
    if (storedT) setThreshold(parseFloat(storedT))

    void loadProfiles()
    void loadKnowledgeFiles()

    setSaved(false)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ─── Handlers: Geral ──────────────────────────────────────────────────────

  function handlePositionChange(side: 'right' | 'left') {
    setPosition(side)
    localStorage.setItem('maya_widget_position', side)
    onPositionChange?.(side)
  }

  function handleSettingChange<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSaveSettings() {
    try {
      localStorage.setItem('maya_settings', JSON.stringify({ ...settings, _providerExplicit: true }))
      setSaved(true)
      try { window.dispatchEvent(new CustomEvent('settings:updated', { detail: settings })) } catch (_) {}
      setTimeout(() => setSaved(false), 2500)
    } catch (_) {}
  }

  async function handleClearMemory() {
    if (!window.confirm('Apagar todo o histórico de conversas e fatos memorizados?\n\nEssa ação não pode ser desfeita.')) return
    setClearing(true)
    await clearAllMemory()
    setClearing(false)
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
  }

  // ─── Handlers: Agentes ────────────────────────────────────────────────────

  function handleAgentToggle(id: string, enabled: boolean) {
    const next = { ...agentsEnabled, [id]: enabled }
    setAgentsEnabled(next)
    localStorage.setItem('maya_agents_config', JSON.stringify(next))
  }

  // ─── Handlers: Conhecimento ───────────────────────────────────────────────

  const loadKnowledgeFiles = useCallback(async () => {
    setKnLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      if (res.ok) {
        const data = await res.json() as { files: KnowledgeFileMeta[] }
        setKnFiles(data.files ?? [])
      }
    } catch (_) {}
    setKnLoading(false)
  }, [])

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file, 'UTF-8')
    })
  }

  async function processUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadMsg('Arquivo muito grande (máx 10MB)')
      return
    }
    setUploading(true)
    setUploadMsg(`Lendo ${file.name}…`)
    try {
      const text = await readFileAsText(file)
      setUploadMsg('Processando e salvando…')
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: (file.type || file.name.split('.').pop()) ?? '',
          content:  text,
        }),
      })
      if (res.ok) {
        setUploadMsg('Arquivo importado com sucesso!')
        await loadKnowledgeFiles()
        setTimeout(() => setUploadMsg(''), 3000)
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string }
        setUploadMsg(`Erro: ${err.error ?? res.statusText}`)
      }
    } catch (err) {
      setUploadMsg(`Erro ao ler arquivo: ${String(err)}`)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await processUpload(file)
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) await processUpload(file)
  }

  async function handleKnFileDelete(fileId: string) {
    if (!window.confirm('Remover este arquivo e seus dados da base de conhecimento?')) return
    try {
      await fetch(`/api/knowledge?id=${fileId}`, { method: 'DELETE' })
      await loadKnowledgeFiles()
    } catch (_) {}
  }

  // ─── Handlers: Vozes ──────────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      const res = await fetch('/api/speaker-enroll')
      if (res.ok) {
        const data = await res.json() as { profiles: typeof profiles }
        setProfiles(data.profiles ?? [])
      }
    } catch (_) {}
    setProfilesLoading(false)
  }, [])

  async function handleDeleteProfile(name: string) {
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

  function handleOpenEnroll(suggestedName = '') {
    window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName } }))
    onClose()
  }

  // ─── Derived colours ──────────────────────────────────────────────────────

  const a10 = `${accentColor}1a`
  const a20 = `${accentColor}33`
  const a30 = `${accentColor}4d`
  const a55 = `${accentColor}8c`

  // ─── Shared micro-styles ──────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
    color: `${accentColor}60`, borderBottom: `1px solid ${a20}`,
    paddingBottom: 6, marginBottom: 12, fontFamily: MONO,
    display: 'block',
  }

  const hint: React.CSSProperties = {
    fontSize: 10, color: `${accentColor}55`, fontFamily: MONO,
  }

  const selectSt: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    background: 'rgba(0,0,0,0.45)', border: `1px solid ${a30}`,
    color: '#e2e8f0', fontSize: 12, fontFamily: MONO, cursor: 'pointer',
    outline: 'none',
  }

  const fieldGroup: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14,
  }

  const labelSt: React.CSSProperties = {
    fontSize: 11, color: accentColor, fontWeight: 600, fontFamily: MONO,
  }

  // ─── Tab renderers ────────────────────────────────────────────────────────

  function renderGeral() {
    return (
      <div>
        {/* Position */}
        <span style={sectionLabel}>Posição do Widget</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['right', 'left'] as const).map(s => (
            <button
              key={s}
              onClick={() => handlePositionChange(s)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${position === s ? accentColor : a30}`,
                background: position === s ? a20 : 'transparent',
                color: position === s ? accentColor : a55,
                fontSize: 11, fontFamily: MONO, letterSpacing: 1,
                transition: 'all 0.2s',
              }}
            >
              {s === 'right' ? '⟩ Direita' : 'Esquerda ⟨'}
            </button>
          ))}
        </div>

        {/* TTS */}
        <span style={sectionLabel}>Voz (TTS)</span>
        <div style={fieldGroup}>
          <span style={labelSt}>Provedor</span>
          <select
            value={settings.ttsProvider}
            style={selectSt}
            onChange={e => {
              const p = e.target.value
              const voiceDefs: Record<string, string> = {
                edge: 'pt-BR-FranciscaNeural',
                azure: 'pt-BR-FranciscaNeural',
                gemini: 'Kore',
                openai: 'nova',
                browser: '',
              }
              setSettings(prev => ({ ...prev, ttsProvider: p, ttsVoice: voiceDefs[p] ?? '' }))
              setSaved(false)
            }}
          >
            <option value="edge">EdgeTTS (grátis, padrão)</option>
            <option value="azure">Azure Speech</option>
            <option value="gemini">Gemini TTS</option>
            <option value="openai">OpenAI TTS</option>
            <option value="browser">Browser SpeechSynthesis</option>
          </select>
        </div>

        {settings.ttsProvider !== 'browser' && (
          <div style={{ ...fieldGroup, marginBottom: 18 }}>
            <span style={labelSt}>Voz</span>
            {(settings.ttsProvider === 'edge' || settings.ttsProvider === 'azure') && (
              <select value={settings.ttsVoice} style={selectSt} onChange={e => handleSettingChange('ttsVoice', e.target.value)}>
                <option value="pt-BR-FranciscaNeural">pt-BR – Francisca Neural</option>
              </select>
            )}
            {settings.ttsProvider === 'gemini' && (
              <select value={settings.ttsVoice} style={selectSt} onChange={e => handleSettingChange('ttsVoice', e.target.value)}>
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
              <select value={settings.ttsVoice} style={selectSt} onChange={e => handleSettingChange('ttsVoice', e.target.value)}>
                <option value="nova">Nova (feminino)</option>
                <option value="alloy">Alloy (neutro)</option>
                <option value="echo">Echo (masculino)</option>
                <option value="fable">Fable (masculino)</option>
                <option value="onyx">Onyx (masculino)</option>
                <option value="shimmer">Shimmer (feminino)</option>
              </select>
            )}
            <span style={{
              ...hint,
              color: settings.ttsProvider === 'edge' ? 'rgba(0,255,136,0.65)' : `${accentColor}55`,
            }}>
              {settings.ttsProvider === 'edge'   && '✓ Gratuito, sem API key'}
              {settings.ttsProvider === 'azure'  && 'Requer AZURE_TTS_KEY — 500k chars/mês grátis'}
              {settings.ttsProvider === 'gemini' && 'Requer GEMINI_API_KEY — 10 RPM no plano gratuito'}
              {settings.ttsProvider === 'openai' && 'Requer OPENAI_API_KEY — cobrado por caractere'}
            </span>
          </div>
        )}

        {/* Preferences */}
        <span style={sectionLabel}>Preferências</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.keepAudioInBackground}
            onChange={e => handleSettingChange('keepAudioInBackground', e.target.checked)}
            style={{ accentColor }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: SANS }}>
            Manter áudio em segundo plano
          </span>
        </label>

        <button
          onClick={handleSaveSettings}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 6, cursor: 'pointer',
            background: saved ? 'rgba(0,255,136,0.1)' : a10,
            border: `1px solid ${saved ? 'rgba(0,255,136,0.5)' : a30}`,
            color: saved ? '#4ade80' : accentColor,
            fontSize: 12, fontFamily: MONO, transition: 'all 0.3s', marginBottom: 20,
          }}
        >
          {saved ? '✓ Configurações salvas' : 'Salvar configurações de voz'}
        </button>

        {/* Memory */}
        <span style={sectionLabel}>Dados &amp; Memória</span>
        <button
          onClick={handleClearMemory}
          disabled={clearing}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 6,
            cursor: clearing ? 'not-allowed' : 'pointer',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.28)',
            color: cleared ? '#4ade80' : '#f87171',
            fontSize: 12, fontFamily: MONO, transition: 'all 0.2s',
            opacity: clearing ? 0.5 : 1,
          }}
        >
          {cleared ? '✓ Memória limpa' : clearing ? 'Limpando…' : '🗑  Limpar histórico e memória'}
        </button>
        <p style={{ ...hint, marginTop: 8 }}>
          Apaga conversas e fatos do banco. Configurações locais são mantidas.
        </p>
      </div>
    )
  }

  function renderAgentes() {
    const coreAgents  = AGENTS.filter(a => a.group === 'AIOS Core')
    const fabAgents   = AGENTS.filter(a => a.group === 'Fábrica Rentável')

    function AgentRow({ agent }: { agent: AgentMeta }) {
      const enabled = agentsEnabled[agent.id] !== false
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderRadius: 6, marginBottom: 4,
          background: enabled ? a10 : 'transparent',
          border: `1px solid ${enabled ? a20 : 'rgba(255,255,255,0.05)'}`,
          transition: 'all 0.15s',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 11, color: enabled ? '#e2e8f0' : 'rgba(255,255,255,0.28)',
              fontFamily: MONO, fontWeight: 600,
            }}>
              {agent.id}
            </span>
            <span style={{
              fontSize: 10, color: enabled ? a55 : 'rgba(255,255,255,0.18)',
              marginLeft: 8, fontFamily: SANS,
            }}>
              {agent.desc}
            </span>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => handleAgentToggle(agent.id, !enabled)}
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? 'Desativar' : 'Ativar'} ${agent.id}`}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: enabled ? accentColor : 'rgba(255,255,255,0.13)',
              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              outline: 'none',
            }}
          >
            <span style={{
              position: 'absolute', top: 2,
              left: enabled ? 17 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              display: 'block',
            }} />
          </button>
        </div>
      )
    }

    const activeCount = AGENTS.filter(a => agentsEnabled[a.id] !== false).length

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ ...hint, fontSize: 11 }}>{activeCount}/{AGENTS.length} agentes ativos</span>
          <button
            onClick={() => {
              const allEnabled = AGENTS.every(a => agentsEnabled[a.id] !== false)
              const next = Object.fromEntries(AGENTS.map(a => [a.id, !allEnabled]))
              setAgentsEnabled(next)
              localStorage.setItem('maya_agents_config', JSON.stringify(next))
            }}
            style={{
              fontSize: 10, fontFamily: MONO, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${a30}`,
              color: a55, borderRadius: 4, padding: '3px 10px',
            }}
          >
            {AGENTS.every(a => agentsEnabled[a.id] !== false) ? 'Desativar todos' : 'Ativar todos'}
          </button>
        </div>

        <span style={sectionLabel}>AIOS Core (6)</span>
        {coreAgents.map(a => <AgentRow key={a.id} agent={a} />)}

        <span style={{ ...sectionLabel, marginTop: 16 }}>Fábrica Rentável (15)</span>
        {fabAgents.map(a => <AgentRow key={a.id} agent={a} />)}

        <p style={{ ...hint, marginTop: 12 }}>
          Agentes desativados não recebem delegações e ficam ocultos no painel.
        </p>
      </div>
    )
  }

  function renderConhecimento() {
    return (
      <div>
        {/* Drop zone */}
        <div
          data-testid="knowledge-drop-zone"
          onClick={() => { if (!uploading) fileInputRef.current?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => void handleDrop(e)}
          style={{
            border: `2px dashed ${uploading ? accentColor : a30}`,
            borderRadius: 8, padding: '28px 16px', textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginBottom: 16, transition: 'border-color 0.2s, background 0.2s',
            background: uploading ? a10 : 'transparent',
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 12, color: uploading ? accentColor : a55, fontFamily: MONO }}>
            {uploading ? (uploadMsg || 'Processando…') : 'Clique ou arraste um arquivo'}
          </div>
          <div style={{ ...hint, marginTop: 4 }}>PDF, TXT, MD, DOCX — máx 10 MB</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          style={{ display: 'none' }}
          onChange={e => void handleFileInputChange(e)}
        />

        {/* Status message (not-uploading) */}
        {uploadMsg && !uploading && (
          <p style={{
            ...hint, marginBottom: 12,
            color: uploadMsg.startsWith('Erro') ? '#f87171' : 'rgba(0,255,136,0.7)',
          }}>
            {uploadMsg}
          </p>
        )}

        {/* Files list */}
        <span style={sectionLabel}>Arquivos importados</span>
        {knLoading ? (
          <p style={hint}>Carregando…</p>
        ) : knFiles.length === 0 ? (
          <p style={hint}>Nenhum arquivo importado ainda.</p>
        ) : (
          knFiles.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 6, marginBottom: 6,
              background: a10, border: `1px solid ${a20}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ ...hint, marginTop: 2 }}>
                  {f.chunkCount} segmentos · {new Date(f.uploadedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button
                onClick={() => void handleKnFileDelete(f.id)}
                aria-label={`Remover ${f.name}`}
                style={{
                  marginLeft: 10, background: 'none',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#f87171', borderRadius: 4,
                  padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                }}
              >✕</button>
            </div>
          ))
        )}

        <p style={{ ...hint, marginTop: 10, lineHeight: 1.6 }}>
          Arquivos importados ficam disponíveis como contexto extra para todos os agentes.
          PDF e DOCX são lidos como texto — formatações complexas podem ser perdidas.
        </p>
      </div>
    )
  }

  function renderVozes() {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={sectionLabel}>Perfis de Voz</span>
          <button
            onClick={() => handleOpenEnroll()}
            style={{
              fontSize: 11, fontFamily: MONO, cursor: 'pointer',
              background: a10, border: `1px solid ${a30}`,
              color: accentColor, borderRadius: 6, padding: '5px 12px',
            }}
          >
            + Cadastrar
          </button>
        </div>

        {profilesLoading ? (
          <p style={hint}>Carregando perfis…</p>
        ) : profiles.length === 0 ? (
          <p style={{ ...hint, marginBottom: 14 }}>Nenhum perfil cadastrado.</p>
        ) : (
          profiles.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 6, marginBottom: 6,
              background: a10, border: `1px solid ${a20}`,
            }}>
              <div>
                <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: MONO, fontWeight: 700 }}>
                  {p.name}
                </span>
                <span style={{ ...hint, marginLeft: 10 }}>
                  {new Date(p.enrolledAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleOpenEnroll(p.name)}
                  aria-label={`Regravar voz de ${p.name}`}
                  title="Regravar"
                  style={{
                    background: 'none', border: `1px solid ${a30}`,
                    color: accentColor, borderRadius: 4,
                    padding: '3px 7px', fontSize: 12, cursor: 'pointer',
                  }}
                >↺</button>
                <button
                  onClick={() => void handleDeleteProfile(p.name)}
                  disabled={deletingProfile === p.name}
                  aria-label={`Remover voz de ${p.name}`}
                  style={{
                    background: 'none', border: '1px solid rgba(239,68,68,0.35)',
                    color: deletingProfile === p.name ? 'rgba(248,113,113,0.4)' : '#f87171',
                    borderRadius: 4, padding: '3px 7px', fontSize: 12, cursor: 'pointer',
                  }}
                >✕</button>
              </div>
            </div>
          ))
        )}

        <span style={{ ...sectionLabel, marginTop: 16 }}>Verificação de Voz</span>

        {verifyEnabled && profiles.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: SANS }}>
                Sensibilidade
              </span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: accentColor }}>
                {threshold >= 0.95 ? 'Muito alto' : threshold >= 0.85 ? 'Alto' : threshold >= 0.75 ? 'Médio' : 'Baixo'}
                {' '}({threshold.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0.60} max={0.95} step={0.05}
              value={threshold}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setThreshold(v)
                localStorage.setItem('maya_verify_threshold', String(v))
              }}
              style={{ width: '100%', accentColor, cursor: 'pointer', marginBottom: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={hint}>← Mais permissivo</span>
              <span style={hint}>Mais restrito →</span>
            </div>
          </div>
        )}

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          cursor: profiles.length === 0 ? 'not-allowed' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={verifyEnabled}
            disabled={profiles.length === 0}
            onChange={e => {
              setVerifyEnabled(e.target.checked)
              localStorage.setItem('maya_speaker_verify_enabled', e.target.checked ? 'true' : 'false')
            }}
            style={{ accentColor, marginTop: 2 }}
          />
          <span>
            <span style={{
              fontSize: 12, fontFamily: SANS,
              color: profiles.length === 0 ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
            }}>
              Ativar verificação de voz antes de responder
            </span>
            <br />
            <span style={hint}>
              {profiles.length === 0
                ? 'Cadastre ao menos uma voz para ativar esta opção'
                : 'Maya identificará o falante em cada mensagem de voz'}
            </span>
          </span>
        </label>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div
      data-testid="widget-settings-modal"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 10000,
        background: 'rgba(2,6,9,0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        width: 'min(500px, 100%)',
        maxHeight: '84vh',
        background: 'rgba(2,6,9,0.97)',
        border: `1px solid ${a30}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: MONO,
        boxShadow: `0 0 60px rgba(0,0,0,0.85), 0 0 20px ${a10}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${a20}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: `${accentColor}aa`, textTransform: 'uppercase' }}>
            ⚙ Configurações Maya
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar configurações"
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 16,
              cursor: 'pointer', padding: '2px 6px', fontFamily: MONO,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}
          >✕</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${a20}`,
          flexShrink: 0, background: 'rgba(0,0,0,0.25)',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: tab === t.id ? accentColor : 'rgba(255,255,255,0.32)',
                borderBottom: `2px solid ${tab === t.id ? accentColor : 'transparent'}`,
                fontSize: 10, letterSpacing: 1.5, fontFamily: MONO,
                textTransform: 'uppercase', transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 20px',
          color: '#e2e8f0',
          scrollbarWidth: 'thin',
          scrollbarColor: `${a30} transparent`,
        }}>
          {tab === 'geral'        && renderGeral()}
          {tab === 'agentes'      && renderAgentes()}
          {tab === 'conhecimento' && renderConhecimento()}
          {tab === 'vozes'        && renderVozes()}
        </div>
      </div>
    </div>
  )
}
