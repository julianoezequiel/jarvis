/**
 * agents.ts
 * Tipos centrais para o sistema de 21 agentes do MAYA AIOS.
 */

// Union de todos os IDs de agentes válidos
export type AgentId =
  // AIOS Core
  | '@analyst'
  | '@developer'
  | '@researcher'
  | '@writer'
  | '@ux-design-expert'
  | '@manager'
  // Fábrica Rentável
  | '@ideias-nichos'
  | '@criador-conteudo'
  | '@produtor-cursos'
  | '@designer'
  | '@empacotador'
  | '@cortes-virais'
  | '@gestor-contas'
  | '@trafego-organico'
  | '@vendas'
  | '@relacionamento'
  | '@auditor'
  | '@analista-metricas'
  | '@automacao-tecnica'
  | '@financeiro-pix'
  | '@melhoria-continua'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentState {
  id: AgentId | string
  status: AgentStatus
  result?: string
  error?: string
  startedAt?: number
  finishedAt?: number
}

export interface DelegateCommand {
  agent: AgentId | string
  task: string
  context?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface ExecuteCommand {
  command: string
}

export interface AgentResult {
  agent: AgentId | string
  result: string
  provider?: string
  elapsedMs?: number
}
