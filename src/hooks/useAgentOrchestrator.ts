/**
 * useAgentOrchestrator.ts
 * Detecta blocos [DELEGATE] no texto do assistente e executa os agentes em paralelo.
 * Atualiza agentStates para o AgentSquadPanel mostrar ATIVO/OCIOSO em tempo real.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { parseDelegations, DelegateCommand } from '../lib/agentRouter'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentState {
  id: string
  status: AgentStatus
  result?: string
  error?: string
  startedAt?: number
  finishedAt?: number
}

const ALL_AGENTS = [
  // AIOS Core
  '@analyst', '@developer', '@researcher', '@writer', '@ux-design-expert', '@manager',
  // Fábrica Rentável
  '@ideias-nichos', '@criador-conteudo', '@produtor-cursos', '@designer', '@empacotador',
  '@cortes-virais', '@gestor-contas', '@trafego-organico', '@vendas', '@relacionamento',
  '@auditor', '@analista-metricas', '@automacao-tecnica', '@financeiro-pix', '@melhoria-continua',
]

const initialStates = (): Record<string, AgentState> =>
  Object.fromEntries(ALL_AGENTS.map(id => [id, { id, status: 'idle' }]))

export function useAgentOrchestrator() {
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(initialStates)
  const runningRef = useRef<Set<string>>(new Set())

  const setAgentStatus = useCallback((id: string, patch: Partial<AgentState>) => {
    setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  /**
   * Executa um único agente chamando /api/agent-execute.
   * Atualiza o estado antes, durante e após a chamada.
   */
  const runAgent = useCallback(async (cmd: DelegateCommand): Promise<string> => {
    const { agent, task, context, priority } = cmd
    setAgentStatus(agent, { status: 'running', startedAt: Date.now(), result: undefined, error: undefined })
    runningRef.current.add(agent)

    try {
      const res = await fetch('/api/agent-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, task, context: context || '', priority: priority || 'normal' }),
      })
      const json = await res.json().catch(() => null)
      const text: string = json?.text || `Agente ${agent} concluiu sem resposta.`
      setAgentStatus(agent, { status: 'done', result: text, finishedAt: Date.now() })

      // Injeta resultado no chat via evento global
      try {
        window.dispatchEvent(new CustomEvent('jarvis:agent-result', { detail: { agent, task, text } }))
      } catch (_) {}

      // Salva resultado como arquivo na aba DOCS (fire-and-forget)
      const slug = task.slice(0, 50).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const ext = (agent === '@developer' || agent === '@automacao-tecnica') ? 'md' : 'md'
      fetch('/api/jarvis-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'write_file',
          payload: { path: `${agent.replace('@', '')}-${slug}.${ext}`, content: text },
        }),
      }).catch(() => {})

      // Persiste em agent_knowledge (fire-and-forget)
      fetch('/api/jarvis-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'save_agent_knowledge',
          payload: { agent_id: agent, skill_name: task.slice(0, 80), content: text, quality: 7 },
        }),
      }).catch(() => {})

      return text
    } catch (err) {
      const errorMsg = String(err)
      setAgentStatus(agent, { status: 'error', error: errorMsg, finishedAt: Date.now() })
      return `Erro no agente ${agent}: ${errorMsg}`
    } finally {
      runningRef.current.delete(agent)
    }
  }, [setAgentStatus])

  /**
   * Parseia o texto do assistente, extrai todos os [DELEGATE: {...}] e os executa
   * em paralelo (Promise.all). Retorna um array com os resultados.
   */
  const processDelegations = useCallback(async (assistantText: string): Promise<{ agent: string; result: string }[]> => {
    const delegations = parseDelegations(assistantText)
    if (delegations.length === 0) return []

    const results = await Promise.all(
      delegations.map(async cmd => ({
        agent: cmd.agent,
        result: await runAgent(cmd),
      }))
    )
    return results
  }, [runAgent])

  /** Reseta todos os agentes para idle (ex: ao limpar chat) */
  const resetAgents = useCallback(() => {
    setAgentStates(initialStates())
    runningRef.current.clear()
  }, [])

  /** Escuta o evento global emitido pelo useJarvisChat e processa DELEGATEs automaticamente */
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (text) processDelegations(text)
    }
    window.addEventListener('jarvis:assistant-message', handler)
    return () => window.removeEventListener('jarvis:assistant-message', handler)
  }, [processDelegations])

  return { agentStates, processDelegations, resetAgents }
}
