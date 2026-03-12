/**
 * mayaLogger — coleta logs do browser em memória e exporta como .txt
 *
 * Captura todas as chamadas console.log/warn/error que contenham [maya:*].
 * Uso:
 *   - Ctrl+Shift+L  → baixa o arquivo de log
 *   - window.__mayaDownloadLogs()  → mesmo efeito via DevTools
 *   - window.__mayaClearLogs()     → limpa o buffer
 *   - window.__mayaLogs            → array de entradas (leitura)
 */

const MAX_ENTRIES = 2000

export interface LogEntry {
  ts: string
  level: 'log' | 'warn' | 'error'
  msg: string
}

const _buffer: LogEntry[] = []
let _initialized = false

// ─── Internals ───────────────────────────────────────────────────────────────

function _serialize(args: unknown[]): string {
  return args
    .map(a => {
      if (typeof a === 'string') return a
      try { return JSON.stringify(a) } catch { return String(a) }
    })
    .join(' ')
}

function _append(level: LogEntry['level'], args: unknown[]): void {
  const msg = _serialize(args)
  if (!msg.includes('[maya:')) return // filtra só linhas com prefixo maya

  if (_buffer.length >= MAX_ENTRIES) _buffer.shift()
  _buffer.push({ ts: new Date().toISOString(), level, msg })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function downloadLogs(): void {
  if (_buffer.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[maya:logger] nenhum log capturado ainda')
    return
  }

  const header = [
    `# Maya AIOS — Log Export`,
    `# Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    `# Total de entradas: ${_buffer.length}`,
    `# Atalho: Ctrl+Shift+L`,
    `# ─────────────────────────────────────────────────────────────────`,
    '',
  ].join('\n')

  const body = _buffer
    .map(e => `[${e.ts}] [${e.level.toUpperCase().padEnd(5)}] ${e.msg}`)
    .join('\n')

  const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' })
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `maya-logs-${now}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function clearLogs(): void {
  _buffer.length = 0
}

export function getLogs(): readonly LogEntry[] {
  return _buffer
}

// ─── Initializer (call once) ─────────────────────────────────────────────────

export function initLogger(): void {
  if (typeof window === 'undefined' || _initialized) return
  _initialized = true

  // Wrap console methods
  const origLog   = console.log.bind(console)   // eslint-disable-line no-console
  const origWarn  = console.warn.bind(console)  // eslint-disable-line no-console
  const origError = console.error.bind(console) // eslint-disable-line no-console

  console.log = (...args: unknown[]) => {   // eslint-disable-line no-console
    _append('log', args)
    origLog(...args)
  }
  console.warn = (...args: unknown[]) => {  // eslint-disable-line no-console
    _append('warn', args)
    origWarn(...args)
  }
  console.error = (...args: unknown[]) => { // eslint-disable-line no-console
    _append('error', args)
    origError(...args)
  }

  // Keyboard shortcut: Ctrl+Shift+L
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault()
      downloadLogs()
    }
  })

  // Event-based trigger: window.dispatchEvent(new CustomEvent('maya:download-logs'))
  window.addEventListener('maya:download-logs', () => downloadLogs())

  // Expose in DevTools
  const win = window as unknown as Record<string, unknown>
  win.__mayaDownloadLogs = downloadLogs
  win.__mayaClearLogs    = clearLogs
  win.__mayaLogs         = _buffer

  origLog('[maya:logger] iniciado — Ctrl+Shift+L para baixar logs')
}
