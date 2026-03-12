/**
 * Embed Layout — minimal shell for the iframe content.
 *
 * Rendered inside an <iframe> injected by maya-widget.js (the host-side loader).
 * Requirements:
 *   - Transparent background so the host page shows through
 *   - No margins, no overflow, no global fonts that might leak
 *   - pointer-events: none on the root so transparent areas don't swallow host clicks
 *     (widget elements override with pointer-events: auto via inline styles)
 */

import React from 'react'

export const metadata = { title: 'Maya Widget' }

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="pt-BR" style={{ background: 'transparent' }}>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          overflow: 'hidden',
          /**
           * pointer-events: none on the body means transparent areas of the iframe
           * do NOT consume mouse events — they fall through to the host page.
           * Widget elements (orb, sidebar, modals) have pointer-events: auto via
           * their own inline styles.
           */
          pointerEvents: 'none',
        }}
      >
        {children}
      </body>
    </html>
  )
}
