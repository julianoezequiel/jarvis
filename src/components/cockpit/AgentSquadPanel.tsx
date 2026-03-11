"use client"
import React from 'react'

const AGENTS = ['@analyst', '@developer', '@researcher', '@writer', '@ux-design-expert', '@manager']

export default function AgentSquadPanel() {
  return (
    <div className="bg-black/30 rounded p-3 h-full">
      <div className="text-sm text-gray-200">Agentes</div>
      <div className="mt-4 text-xs text-gray-400">
        {AGENTS.map((a) => (
          <div key={a} style={{ marginBottom: 6 }}>
            <strong style={{ color: '#00d4ff' }}>{a}</strong> — <span style={{ color: '#00ff88' }}>ocioso</span>
          </div>
        ))}
      </div>
    </div>
  )
}
