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

/**
 * Extrai arquivos do JSON estruturado retornado pelo @developer.
 * Usa diretamente o campo `files[]` com os `path` originais (estrutura de pastas preservada).
 * Fallback: tenta extrair blocos markdown caso não seja JSON válido.
 */
function extractDeveloperFiles(result: string): { files: Array<{ path: string; content: string }>; projectName: string | null } {
  // Tenta parsear como JSON estruturado primeiro
  try {
    let cleaned = result.replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    }
    const parsed = JSON.parse(cleaned)
    if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
      const files = parsed.files
        .filter((f: any) => f?.path && typeof f.content === 'string' && f.content.length > 0)
        .map((f: any) => ({ path: f.path as string, content: f.content as string }))
      return { files, projectName: parsed.project_name || null }
    }
  } catch (_) {
    // JSON parse falhou — cai no fallback de markdown
  }

  // Fallback: extrai blocos de código markdown
  const files: Array<{ path: string; content: string }> = []
  const regex = /```(html|css|javascript|js|typescript|ts|python|py)[^\n]*\n([\s\S]*?)```/gi
  let match
  const seen = new Set<string>()
  while ((match = regex.exec(result)) !== null) {
    const lang = match[1].toLowerCase()
    const content = match[2].trim()
    const ext = ['javascript', 'js'].includes(lang) ? 'js'
              : ['typescript', 'ts'].includes(lang) ? 'ts'
              : ['python', 'py'].includes(lang) ? 'py'
              : lang === 'css' ? 'css' : 'html'
    const filenameMatch = content.match(/^(?:<!--\s*(?:filename:|file:)?\s*([\w./\-]+)\s*-->|\/\/\s*(?:filename:|file:)?\s*([\w./\-]+)|#\s*(?:filename:|file:)?\s*([\w./\-]+))/)
    const filePath = filenameMatch
      ? (filenameMatch[1] || filenameMatch[2] || filenameMatch[3])
      : `arquivo-${files.length + 1}.${ext}`
    if (!seen.has(filePath) && content.length > 20) {
      seen.add(filePath)
      files.push({ path: filePath, content })
    }
  }
  return { files, projectName: null }
}

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

      // Persiste em agent_knowledge (fire-and-forget)
      fetch('/api/maya-memory', {
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
        task: cmd.task,
        result: await runAgent(cmd),
      }))
    )

    // Agrupa todos os resultados como um projeto ZIP na aba DOCS
    const firstTask = delegations[0]?.task || 'projeto'
    const slug = firstTask.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const fallbackProjectName = `${slug}-${Date.now().toString(36)}`

    const files: Array<{ path: string; content: string }> = []
    let resolvedProjectName = fallbackProjectName

    /**
     * Decide se o resultado de um agente deve ser exibido inline no chat ou salvo em DOCS.
     *  - delivery:"file" → sempre para DOCS
     *  - delivery:"chat" → sempre inline
     *  - sem delivery → inline se resultado curto (< 2000 chars), DOCS se longo
     */
    const shouldInlineResult = (delivery: string | undefined, resultText: string, hasCodeFiles: boolean): boolean => {
      if (hasCodeFiles) return false
      if (delivery === 'file') return false
      if (delivery === 'chat') return true
      return resultText.length < 2000
    }

    /**
     * Chama /api/agent-synthesize para extrair a resposta direta à pergunta do usuário
     * a partir do resultado bruto do agente. Fallback: retorna resultado bruto.
     */
    const synthesizeResult = async (agent: string, question: string, agentResult: string): Promise<string> => {
      try {
        const res = await fetch('/api/agent-synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, question, agentResult }),
        })
        const json = await res.json().catch(() => null)
        if (json?.text && String(json.text).trim().length > 0) return String(json.text).trim()
      } catch (_) {}
      return agentResult
    }

    for (const r of results) {
      const { agent, task, result } = r
      const cmd = delegations.find(d => d.agent === agent)
      const delivery = (cmd as any)?.delivery as string | undefined
      // A pergunta original do usuário está no campo context do DELEGATE
      const originalQuestion = cmd?.context || cmd?.task || task
      const agentSlug = agent.replace('@', '')

      if (agent === '@developer' || agent === '@automacao-tecnica') {
        const { files: codeFiles, projectName: jsonProjectName } = extractDeveloperFiles(result)
        if (codeFiles.length > 0) {
          if (jsonProjectName && agent === '@developer') {
            resolvedProjectName = `${jsonProjectName}-${Date.now().toString(36)}`
          }
          files.push(...codeFiles)
          // Para código: síntese diz o que foi criado
          const synopsis = await synthesizeResult(agent, originalQuestion, result)
          try { window.dispatchEvent(new CustomEvent('maya:agent-result', { detail: { agent, task, text: synopsis } })) } catch (_) {}
        } else if (shouldInlineResult(delivery, result, false)) {
          const synthesized = await synthesizeResult(agent, originalQuestion, result)
          try { window.dispatchEvent(new CustomEvent('maya:agent-inline', { detail: { agent, task, text: synthesized } })) } catch (_) {}
        } else {
          files.push({ path: `${agentSlug}.md`, content: result })
          const synopsis = await synthesizeResult(agent, originalQuestion, result)
          try { window.dispatchEvent(new CustomEvent('maya:agent-result', { detail: { agent, task, text: synopsis } })) } catch (_) {}
        }
      } else if (shouldInlineResult(delivery, result, false)) {
        // Inline: sintetiza primeiro, depois mostra no chat
        const synthesized = await synthesizeResult(agent, originalQuestion, result)
        try { window.dispatchEvent(new CustomEvent('maya:agent-inline', { detail: { agent, task, text: synthesized } })) } catch (_) {}
      } else {
        // DOCS: salva resultado completo, mostra síntese no chat
        files.push({ path: `${agentSlug}.md`, content: result })
        const synopsis = await synthesizeResult(agent, originalQuestion, result)
        try { window.dispatchEvent(new CustomEvent('maya:agent-result', { detail: { agent, task, text: synopsis } })) } catch (_) {}
      }
    }

    // Salva em DOCS somente se houver arquivos para salvar
    if (files.length > 0) {
      fetch('/api/maya-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'save_project', payload: { project_name: resolvedProjectName, files } }),
      }).catch(() => {})
    }

    return results.map(r => ({ agent: r.agent, result: r.result }))
  }, [runAgent])

  /** Reseta todos os agentes para idle (ex: ao limpar chat) */
  const resetAgents = useCallback(() => {
    setAgentStates(initialStates())
    runningRef.current.clear()
  }, [])

  /** Escuta o evento global emitido pelo useMayaChat e processa DELEGATEs automaticamente */
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (text) processDelegations(text)
    }
    window.addEventListener('maya:assistant-message', handler)
    return () => window.removeEventListener('maya:assistant-message', handler)
  }, [processDelegations])

  return { agentStates, processDelegations, resetAgents }
}
