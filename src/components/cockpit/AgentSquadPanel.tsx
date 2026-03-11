"use client"
import React, { useState } from 'react'
import { AgentState } from '../../hooks/useAgentOrchestrator'

const AIOS_CORE = ['@analyst', '@developer', '@researcher', '@writer', '@ux-design-expert', '@manager']
const FABRICA = [
  '@ideias-nichos', '@criador-conteudo', '@produtor-cursos', '@designer', '@empacotador',
  '@cortes-virais', '@gestor-contas', '@trafego-organico', '@vendas', '@relacionamento',
  '@auditor', '@analista-metricas', '@automacao-tecnica', '@financeiro-pix', '@melhoria-continua',
]

const STATUS_COLOR: Record<string, string> = {
  idle:    '#4b5563', // cinza
  running: '#f59e0b', // âmbar — ATIVO
  done:    '#00ff88', // verde — CONCLUÍDO
  error:   '#ef4444', // vermelho
}

const STATUS_LABEL: Record<string, string> = {
  idle:    'ocioso',
  running: '● ativo',
  done:    '✓ pronto',
  error:   '✗ erro',
}

interface Props {
  agentStates?: Record<string, AgentState>
}

function AgentRow({ id, state }: { id: string; state?: AgentState }) {
  const status = state?.status || 'idle'
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      style={{ marginBottom: 4, cursor: state?.result ? 'pointer' : 'default' }}
      onClick={() => state?.result && setExpanded(e => !e)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#00d4ff', fontSize: 11 }}>{id}</strong>
        <span style={{ color: STATUS_COLOR[status], fontSize: 10, fontFamily: 'monospace' }}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      {expanded && state?.result && (
        <div style={{ marginTop: 4, padding: '4px 6px', background: 'rgba(0,212,255,0.05)', borderLeft: '2px solid #00d4ff', fontSize: 10, color: '#cbd5e1', borderRadius: 2, whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>
          {state.result}
        </div>
      )}
    </div>
  )
}

export default function AgentSquadPanel({ agentStates }: Props) {
  const [tab, setTab] = useState<'core' | 'fabrica'>('core')
  const running = Object.values(agentStates || {}).filter(s => s.status === 'running').length

  return (
    <div className="bg-black/30 rounded p-3" style={{ fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Agentes</span>
        {running > 0 && (
          <span style={{ color: '#f59e0b', fontSize: 10, animation: 'pulse 1s infinite' }}>
            {running} ativo{running > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {(['core', 'fabrica'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: tab === t ? '#00d4ff22' : 'transparent',
              color: tab === t ? '#00d4ff' : '#64748b',
              borderBottom: tab === t ? '1px solid #00d4ff' : '1px solid transparent',
            }}
          >
            {t === 'core' ? 'AIOS Core (6)' : 'Fábrica (15)'}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 300 }}>
        {(tab === 'core' ? AIOS_CORE : FABRICA).map(id => (
          <AgentRow key={id} id={id} state={agentStates?.[id]} />
        ))}
      </div>
    </div>
  )
}
