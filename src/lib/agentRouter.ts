/**
 * agentRouter.ts
 * Parseia blocos [DELEGATE: {...}] e [EXECUTE: {...}] do texto emitido pelo MAYA/MAYA.
 */

export interface DelegateCommand {
  agent: string    // ex: "@analyst"
  task: string
  context?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface ExecuteCommand {
  command: string
}

const DELEGATE_RE = /\[DELEGATE:\s*(\{[\s\S]*?\})\]/g
const EXECUTE_RE  = /\[EXECUTE:\s*(\{[\s\S]*?\})\]/g

function safeParseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T } catch { return null }
}

export function parseDelegations(text: string): DelegateCommand[] {
  const results: DelegateCommand[] = []
  let m: RegExpExecArray | null
  DELEGATE_RE.lastIndex = 0
  while ((m = DELEGATE_RE.exec(text)) !== null) {
    const parsed = safeParseJson<DelegateCommand>(m[1])
    if (parsed && parsed.agent && parsed.task) results.push(parsed)
  }
  return results
}

export function parseExecutions(text: string): ExecuteCommand[] {
  const results: ExecuteCommand[] = []
  let m: RegExpExecArray | null
  EXECUTE_RE.lastIndex = 0
  while ((m = EXECUTE_RE.exec(text)) !== null) {
    const parsed = safeParseJson<ExecuteCommand>(m[1])
    if (parsed && parsed.command) results.push(parsed)
  }
  return results
}

/** Remove blocos de protocolo do texto antes de exibir ao usuário */
export function stripProtocols(text: string): string {
  return text
    .replace(/\[DELEGATE:\s*\{[\s\S]*?\}\]/g, '')
    .replace(/\[EXECUTE:\s*\{[\s\S]*?\}\]/g, '')
    .trim()
}
