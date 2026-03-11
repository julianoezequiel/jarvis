/*
 Minimal Realtime WebSocket client helper for OpenAI Realtime.
 Protocol details and exact messages depend on OpenAI Realtime API.
 Server must provide an ephemeral token (use `/api/realtime-token`).
*/

export type RealtimeEventHandler = (data: any) => void

export function connectRealtime(token: string, onEvent: RealtimeEventHandler) {
  const model = process.env.NEXT_PUBLIC_REALTIME_MODEL || 'gpt-4o-realtime-preview'
  const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`

  const ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    // In practice you must follow OpenAI Realtime auth/session protocol.
    // Typically the ephemeral token is passed via the `Authorization` header
    // during the WebSocket handshake which browsers don't allow — use the
    // server to perform a proxied handshake or rely on the provided client-side pattern.
    onEvent({ type: 'connected' })
  })

  ws.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data as string)
      onEvent(data)
    } catch (e) {
      onEvent({ type: 'message', raw: ev.data })
    }
  })

  ws.addEventListener('error', (err) => onEvent({ type: 'error', error: err }))
  ws.addEventListener('close', () => onEvent({ type: 'closed' }))

  return {
    ws,
    send: (obj: any) => {
      try {
        ws.send(JSON.stringify(obj))
      } catch (e) {
        console.error('send error', e)
      }
    },
    close: () => ws.close(),
  }
}

export async function requestRealtimeToken(): Promise<{ token: string | null }> {
  const res = await fetch('/api/realtime-token', { method: 'POST' })
  if (!res.ok) return { token: null }
  return res.json()
}
