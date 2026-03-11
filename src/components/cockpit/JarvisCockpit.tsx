"use client"
import React, { useState } from 'react'
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
  const { agentStates } = useAgentOrchestrator()

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
            <AgentSquadPanel agentStates={agentStates} />
            <div className="mt-4">
              <DeliveriesPanel />
            </div>
          </div>
        </div>
      )}
    <SpeechCaption />
    </div>
  )
}

