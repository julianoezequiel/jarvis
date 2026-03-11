"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChatMessage } from '../../hooks/useJarvisChat'

export default function HistoryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('jarvis_messages')
      if (raw) setMessages(JSON.parse(raw))
    } catch (e) { /* ignore */ }
  }, [])

  return (
    <div className="p-6 min-h-screen bg-[#020609] text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Histórico de Conversa</h1>
          <Link href="/" className="text-jarvisCyan underline">Voltar</Link>
        </div>
        {messages.length === 0 ? (
          <div className="text-gray-400">Nenhuma mensagem salva.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className="p-3 rounded border bg-black/30 border-jarvisCyan/10">
                <div className="text-sm text-jarvisCyan/70 uppercase tracking-wider">{m.role}</div>
                <div className="mt-1 text-base text-white leading-relaxed">{m.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
