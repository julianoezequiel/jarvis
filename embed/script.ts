/**
 * embed/script.ts — Maya Widget Embed Loader
 *
 * TypeScript source for the self-contained widget loader.
 * The compiled & minified output is distributed as `public/maya-widget.js`.
 *
 * Usage (host page):
 *   <script
 *     src="https://maya.yourdomain.com/maya-widget.js"
 *     data-token="sk-..."
 *     data-position="right"
 *     data-theme="#00d4ff"
 *   ></script>
 *
 * Public API (after script loads):
 *   window.__maya.enrollVoice(name: string, userId?: string): void
 *   window.__maya.open(): void
 *   window.__maya.close(): void
 *   window.__maya.on(event: string, handler: (detail: unknown) => void): void
 *   window.__maya.off(event: string, handler: (detail: unknown) => void): void
 *
 * Architecture:
 *   - Injects a fixed <iframe> pointing to /embed (the Next.js route)
 *   - Uses postMessage for bidirectional communication with the iframe
 *   - Dynamically resizes the iframe: orb-only (120×120) when closed,
 *     sidebar (420×100vh) when open
 *   - Does not pollute window.* beyond window.__maya
 */

;(function () {
  'use strict'

  // ─── Constants ─────────────────────────────────────────────────────────────

  const ORB_SIZE     = 120   // iframe px when widget is closed (orb only)
  const SIDEBAR_W    = 420   // iframe width px when sidebar is open
  const IFRAME_ID    = 'maya-widget-iframe'
  const SCRIPT_ATTR  = 'data-token'

  // ─── Resolve the script element that loaded us ────────────────────────────

  function findScriptTag(): HTMLScriptElement | null {
    // Prefer the element with data-token; fall back to scripts containing "maya-widget"
    const byToken = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_ATTR}]`)
    if (byToken) return byToken
    const all = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))
    return all.find(s => s.src.includes('maya-widget')) ?? null
  }

  const scriptEl = findScriptTag()
  const scriptSrc = scriptEl?.src ?? ''
  // Base URL is the origin of the script (same server hosts the /embed route)
  const baseUrl = scriptSrc
    ? new URL(scriptSrc).origin
    : window.location.origin

  // ─── Read config from data-* attributes ──────────────────────────────────

  const token    = scriptEl?.getAttribute('data-token')    ?? ''
  const position = scriptEl?.getAttribute('data-position') ?? 'right'
  const theme    = scriptEl?.getAttribute('data-theme')    ?? '#00d4ff'

  // ─── Build iframe src URL ─────────────────────────────────────────────────

  const params = new URLSearchParams({ position, theme })
  if (token) params.set('token', token)
  const embedSrc = `${baseUrl}/embed?${params.toString()}`

  // ─── Create and inject iframe ─────────────────────────────────────────────

  const iframe = document.createElement('iframe')
  iframe.id    = IFRAME_ID
  iframe.src   = embedSrc
  iframe.setAttribute('aria-label', 'Maya AI Widget')
  iframe.setAttribute('title',      'Maya AI Widget')
  // Allow microphone (required for voice enrollment and wake word)
  iframe.allow = 'microphone; autoplay; clipboard-write'
  iframe.setAttribute('scrolling', 'no')

  const isLeft = position === 'left' || position === 'bottom-left'

  // Start in orb-only size
  Object.assign(iframe.style, {
    position:   'fixed',
    bottom:     '0',
    [isLeft ? 'left' : 'right']: '0',
    width:      `${ORB_SIZE}px`,
    height:     `${ORB_SIZE}px`,
    border:     'none',
    background: 'transparent',
    zIndex:     '2147483640',  // near max (leaves room for modals above)
    overflow:   'hidden',
    colorScheme: 'normal',    // prevent OS dark mode from re-styling transparent bg
    transition: 'width 0.25s ease, height 0.25s ease',
  })

  // Ensure the page body exists before appending
  ;(document.body ?? document.documentElement).appendChild(iframe)

  // ─── Event listeners (extern → iframe postMessage) ────────────────────────

  const eventHandlers = new Map<string, Set<(detail: unknown) => void>>()

  function fireHandlers(event: string, detail: unknown) {
    eventHandlers.get(event)?.forEach(fn => {
      try { fn(detail) } catch (_) {}
    })
  }

  window.addEventListener('message', (e: MessageEvent) => {
    // Only process messages from the maya iframe origin
    if (e.source !== iframe.contentWindow) return
    if (!e.data || typeof e.data.type !== 'string') return

    switch (e.data.type as string) {
      case 'widget:open-change': {
        const isOpen = Boolean(e.data.isOpen)
        if (isOpen) {
          // Expand to sidebar size (full height of host viewport)
          const vh = document.documentElement.clientHeight
          Object.assign(iframe.style, {
            width:  `${SIDEBAR_W}px`,
            height: `${vh}px`,
            bottom: '0',
            top:    'auto',
          })
        } else {
          // Collapse back to orb-only
          Object.assign(iframe.style, {
            width:  `${ORB_SIZE}px`,
            height: `${ORB_SIZE}px`,
          })
        }
        fireHandlers('open-change', { isOpen })
        break
      }

      case 'maya:enroll-complete': {
        fireHandlers('enroll-complete', e.data)
        break
      }
    }
  })

  // ─── Public API exposes window.__maya ─────────────────────────────────────

  interface MayaPublicAPI {
    enrollVoice(name: string, userId?: string): void
    open(): void
    close(): void
    on(event: string, handler: (detail: unknown) => void): void
    off(event: string, handler: (detail: unknown) => void): void
  }

  const api: MayaPublicAPI = {
    /** Trigger voice enrollment flow for a user from the host application. */
    enrollVoice(name: string, userId?: string) {
      iframe.contentWindow?.postMessage({ type: 'maya:enroll-voice', name, userId }, baseUrl)
    },

    /** Open the widget sidebar programmatically. */
    open() {
      iframe.contentWindow?.postMessage({ type: 'maya:open' }, baseUrl)
    },

    /** Not applicable directly (user closes via widget UI), exposed for completeness. */
    close() {
      iframe.contentWindow?.postMessage({ type: 'maya:close' }, baseUrl)
    },

    /**
     * Subscribe to widget events.
     * Supported events:
     *   'enroll-complete' — { name, userId?, success, error? }
     *   'open-change'     — { isOpen: boolean }
     */
    on(event: string, handler: (detail: unknown) => void) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, new Set())
      eventHandlers.get(event)!.add(handler)
    },

    /** Unsubscribe from a widget event. */
    off(event: string, handler: (detail: unknown) => void) {
      eventHandlers.get(event)?.delete(handler)
    },
  }

  // @ts-ignore — intentional global
  window.__maya = api

})()
