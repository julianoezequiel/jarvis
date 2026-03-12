'use client'

/**
 * Embed Page — rendered inside the <iframe> injected by maya-widget.js.
 *
 * Responsibilities:
 *   1. Read widget config from URL search params (?position=right&theme=%2300d4ff)
 *   2. Render <MayaWidget> configured accordingly
 *   3. Bridge postMessage ↔ custom events (parent ↔ widget):
 *        parent → 'maya:enroll-voice' postMessage  → dispatch CustomEvent inside iframe
 *        parent → 'maya:open'         postMessage  → dispatch CustomEvent inside iframe
 *        widget → maya:enroll-complete CustomEvent → postMessage to parent
 *        widget → isOpen change        callback    → postMessage `widget:open-change` to parent
 *
 * Security notes:
 *   - postMessage origin validation: we intentionally use `*` for targetOrigin when posting
 *     to parent since the parent origin is unknown at widget load time.  The data sent
 *     (enroll-complete) is not sensitive (just name/userId echoed back).
 *   - Incoming message source is validated (only known `type` values are processed).
 */

import React, { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MayaWidget from '../../components/widget/MayaWidget'
import type { MayaWidgetConfig } from '../../components/widget/MayaWidget'
import type { WidgetPosition } from '../../components/widget/MayaOrb'

// ─── Inner component (needs Suspense boundary for useSearchParams) ────────────

function EmbedRoot() {
  const params = useSearchParams()

  // ── Config from URL params ──────────────────────────────────────────────────

  const rawPosition = params.get('position') ?? 'right'
  const theme       = params.get('theme')    ?? '#00d4ff'

  const position: WidgetPosition =
    rawPosition === 'left'        ? 'bottom-left'  :
    rawPosition === 'bottom-left' ? 'bottom-left'  :
    'bottom-right'

  const widgetConfig: MayaWidgetConfig = {
    orb: { theme: { primaryColor: theme } },
    position,
  }

  // ── Bridge: postMessage from parent → internal custom events ───────────────

  useEffect(() => {
    function onParentMessage(e: MessageEvent) {
      // Only process recognised message types; ignore all others
      if (!e.data || typeof e.data.type !== 'string') return

      switch (e.data.type as string) {
        case 'maya:enroll-voice':
          window.dispatchEvent(new CustomEvent('maya:enroll-voice', {
            detail: {
              name:   e.data.name   ?? '',
              userId: e.data.userId ?? undefined,
            },
          }))
          break
        case 'maya:open':
          window.dispatchEvent(new CustomEvent('maya:open'))
          break
        default:
          break
      }
    }
    window.addEventListener('message', onParentMessage)
    return () => window.removeEventListener('message', onParentMessage)
  }, [])

  // ── Bridge: maya:enroll-complete CustomEvent → postMessage to parent ────────

  useEffect(() => {
    function onEnrollComplete(e: Event) {
      const detail = (e as CustomEvent<{
        name: string; userId?: string; success: boolean; error?: string
      }>).detail
      window.parent?.postMessage(
        { type: 'maya:enroll-complete', ...detail },
        '*',
      )
    }
    window.addEventListener('maya:enroll-complete', onEnrollComplete)
    return () => window.removeEventListener('maya:enroll-complete', onEnrollComplete)
  }, [])

  // ── Notify parent of open/close (used to resize the iframe) ────────────────

  function handleOpenChange(isOpen: boolean) {
    window.parent?.postMessage({ type: 'widget:open-change', isOpen }, '*')
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        /**
         * pointer-events: none on this container ensures that any area not
         * covered by a widget element passes clicks through to the host page.
         * Widget elements (MayaOrb button, MayaSidebar, modals) explicitly set
         * pointer-events: auto via their own inline styles.
         */
        pointerEvents: 'none',
      }}
    >
      <MayaWidget config={widgetConfig} onOpenChange={handleOpenChange} />
    </div>
  )
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedRoot />
    </Suspense>
  )
}
