"use client"
import React, { useState, useEffect } from 'react'
import StatusBar from './StatusBar'
import HexGrid from './HexGrid'
import CentralOrb from './CentralOrb'
import ChatPanel from './ChatPanel'
import AgentSquadPanel from './AgentSquadPanel'
import PasswordGate from './PasswordGate'
import MicPermissionOverlay from './MicPermissionOverlay'
import BootSequence from './BootSequence'
import DeliveriesPanel from './DeliveriesPanel'
import SpeechCaption from './SpeechCaption'
import { useAgentOrchestrator } from '../../hooks/useAgentOrchestrator'

type Phase = 'locked' | 'mic-prompt' | 'booting' | 'ready'

export default function JarvisCockpit() {
  const [phase, setPhase] = useState<Phase>('locked')
  const [showSettings, setShowSettings] = useState(false)
  const [rightTab, setRightTab] = useState<'agents' | 'docs'>('agents')
  const { agentStates } = useAgentOrchestrator()

  useEffect(() => {
    const handler = () => setRightTab('docs')
    window.addEventListener('jarvis:new-delivery', handler)
    return () => window.removeEventListener('jarvis:new-delivery', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <StatusBar showSettings={showSettings} setShowSettings={setShowSettings} />

      {phase === 'locked' && (
        <PasswordGate
          onUnlock={() => setPhase('mic-prompt')}
        />
      )}

      {phase === 'mic-prompt' && (
        <MicPermissionOverlay
          onGranted={() => setPhase('booting')}
          onDenied={() => setPhase('mic-prompt')}
        />
      )}

      {phase === 'booting' && (
        <BootSequence onDone={() => setPhase('ready')} />
      )}

      {phase === 'ready' && (
        <div className="flex-1 flex gap-4 p-6 pb-20">
          <div className="w-80 flex items-start">
            <div className="w-full h-[280px] overflow-hidden min-h-0">
              <ChatPanel />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <HexGrid />
              {!showSettings && <CentralOrb />}
            </div>
          </div>
          <div className="w-80">
            {/* Tabs: AGENTES | DOCS */}
            <div style={{ display: 'flex', marginBottom: 8, border: '1px solid rgba(0,212,255,0.15)', borderRadius: 6, overflow: 'hidden' }}>
              {(['agents', 'docs'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600,
                    fontFamily: 'Orbitron, sans-serif', letterSpacing: 1,
                    background: rightTab === t ? 'rgba(0,212,255,0.12)' : 'transparent',
                    color: rightTab === t ? '#00d4ff' : '#475569',
                    border: 'none', borderBottom: rightTab === t ? '1px solid #00d4ff' : '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {t === 'agents' ? 'AGENTES' : 'DOCS'}
                </button>
              ))}
            </div>
            {rightTab === 'agents' ? (
              <AgentSquadPanel agentStates={agentStates} />
            ) : (
              <DeliveriesPanel />
            )}
          </div>
        </div>
      )}
    <SpeechCaption />
    </div>
  )
}

