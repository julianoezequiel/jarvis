"use client"
import React, { useState, useEffect } from 'react'
import StatusBar from './StatusBar'
import HexGrid from './HexGrid'
import CentralOrb from './CentralOrb'
import ChatPanel from './ChatPanel'
import AgentSquadPanel from './AgentSquadPanel'
import BootSequence from './BootSequence'
import './MicPermissionOverlay' // registra listeners de módulo (maya:init-mic)
import DeliveriesPanel from './DeliveriesPanel'
import SpeechCaption from './SpeechCaption'
import { useAgentOrchestrator } from '../../hooks/useAgentOrchestrator'
import { playWelcomeTTS } from '../../hooks/useMayaChat'
import VoiceEnrollModal from './VoiceEnrollModal'

type Phase = 'booting' | 'ready'

export default function MayaCockpit() {
  const [phase, setPhase] = useState<Phase>('booting')
  const [showSettings, setShowSettings] = useState(false)
  const [rightTab, setRightTab] = useState<'agents' | 'docs'>('agents')
  const [rightOpen, setRightOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [winWidth, setWinWidth] = useState(1400)
  const [enrollFlow, setEnrollFlow] = useState<{ active: boolean; suggestedName: string }>({ active: false, suggestedName: '' })
  const { agentStates } = useAgentOrchestrator()

  // Responsive width tracking
  useEffect(() => {
    const update = () => setWinWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Breakpoints
  const isMobile = winWidth < 700
  const isTablet = winWidth >= 700 && winWidth < 1100
  // Side panel width: 320 on desktop, proportional on tablet, hidden on mobile
  const sideWidth = isMobile ? 0 : isTablet ? Math.max(160, Math.floor((winWidth - 380) / 2)) : 320
  // Escalar o orbe para caber na tela mobile (canvas é 400×400 fixo)
  const orbScale = isMobile ? Math.min(1, (winWidth - 32) / 400) : 1
  const orbSize = Math.round(400 * orbScale)

  useEffect(() => {
    // Solicita permissão do microfone imediatamente ao carregar a tela.
    // O browser exibe o popup nativo; não bloqueia o boot.
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        // Permissão concedida antes do boot terminar: dispara init-mic agora
        window.dispatchEvent(new CustomEvent('maya:init-mic'))
      })
      .catch((e) => {
        console.warn('[maya] mic permission denied or unavailable:', e)
      })
  }, [])

  useEffect(() => {
    const handler = () => setRightTab('docs')
    window.addEventListener('maya:new-delivery', handler)
    return () => window.removeEventListener('maya:new-delivery', handler)
  }, [])

  // Open VoiceEnrollModal when enroll intent is detected (from voice or chat)
  useEffect(() => {
    const handler = (e: Event) => {
      const suggestedName = (e as CustomEvent<{ suggestedName?: string }>).detail?.suggestedName ?? ''
      setEnrollFlow({ active: true, suggestedName })
    }
    window.addEventListener('maya:enroll-intent', handler)
    return () => window.removeEventListener('maya:enroll-intent', handler)
  }, [])

  // Toca mensagem de boas-vindas quando o boot termina.
  // Tenta imediatamente (funciona se usuário já interagiu, ex: clicou em Allow no mic).
  // Fallback: aguarda primeiro clique/tecla caso o browser bloqueie autoplay.
  useEffect(() => {
    if (phase !== 'ready') return
    let played = false
    const play = () => {
      if (played) return
      played = true
      playWelcomeTTS()
    }
    const t = setTimeout(play, 800)
    const onInteraction = () => { clearTimeout(t); play() }
    document.addEventListener('click', onInteraction, { once: true })
    document.addEventListener('keydown', onInteraction, { once: true })
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('keydown', onInteraction)
    }
  }, [phase])

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <StatusBar showSettings={showSettings} setShowSettings={setShowSettings} />

      {phase === 'booting' && (
        <BootSequence onDone={() => setPhase('ready')} />
      )}

      {/* Orbe — sempre fixo no centro exato do viewport, independente do layout */}
      {phase === 'ready' && (
        <div style={{
          position: 'fixed',
          left: '50%', top: '50%',
          transform: `translate(-50%, -50%) scale(${orbScale})`,
          transformOrigin: 'center center',
          width: 400, height: 400,
          zIndex: 0,
          pointerEvents: 'auto',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <HexGrid />
          {!showSettings && <CentralOrb />}
        </div>
      )}

      {phase === 'ready' && (isMobile ? (

        /* ═══════════════════════════════════════════════
           MOBILE: position-relative container — orbe absolutamente centralizado
           ═══════════════════════════════════════════════ */
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Chat drawer — sobe a partir do bottom, acima da barra de botões */}
          {leftOpen && (
            <div style={{
              position: 'absolute', bottom: 60, left: 0, right: 0,
              height: '42vh',
              background: 'rgba(2,6,9,0.97)',
              borderTop: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '12px 12px 0 0',
              padding: '8px',
              overflow: 'hidden',
              boxShadow: '0 -4px 24px rgba(0,212,255,0.12)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
            }}>
              <ChatPanel alwaysOpen />
            </div>
          )}

          {/* Agentes drawer — sobe a partir do bottom, acima da barra de botões */}
          {rightOpen && !leftOpen && (
            <div style={{
              position: 'absolute', bottom: 60, left: 0, right: 0,
              height: '42vh',
              background: 'rgba(2,6,9,0.97)',
              borderTop: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '12px 12px 0 0',
              padding: '8px',
              overflow: 'hidden',
              boxShadow: '0 -4px 24px rgba(0,212,255,0.12)',
              zIndex: 10,
            }}>
              <div style={{ display: 'flex', marginBottom: 8, border: '1px solid rgba(0,212,255,0.15)', borderRadius: 6, overflow: 'hidden' }}>
                {(['agents', 'docs'] as const).map(tab => (
                  <button key={tab} onClick={() => setRightTab(tab)} style={{ flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600, fontFamily: 'Orbitron, sans-serif', letterSpacing: 1, background: rightTab === tab ? 'rgba(0,212,255,0.12)' : 'transparent', color: rightTab === tab ? '#00d4ff' : '#475569', border: 'none', borderBottom: rightTab === tab ? '1px solid #00d4ff' : '1px solid transparent', cursor: 'pointer' }}>
                    {tab === 'agents' ? 'AGENTES' : 'DOCS'}
                  </button>
                ))}
              </div>
              <div style={{ overflow: 'auto', flex: 1 }}>
                {rightTab === 'agents' ? <AgentSquadPanel agentStates={agentStates} /> : <DeliveriesPanel />}
              </div>
            </div>
          )}

          {/* Barra de botões — fixa na base */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px',
            background: 'rgba(2,6,9,0.6)',
            borderTop: '1px solid rgba(0,212,255,0.08)',
            zIndex: 20,
          }}>
            <button
              onClick={() => { setLeftOpen(v => !v); setRightOpen(false) }}
              style={{ width: 44, height: 44, borderRadius: '50%', background: leftOpen ? 'rgba(0,212,255,0.15)' : 'rgba(2,6,9,0.90)', border: `1px solid ${leftOpen ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`, cursor: 'pointer', color: '#00d4ff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(0,212,255,0.2)' }}
            >💬</button>
            <button
              onClick={() => { setRightOpen(v => !v); setLeftOpen(false) }}
              style={{ width: 44, height: 44, borderRadius: '50%', background: rightOpen ? 'rgba(0,212,255,0.15)' : 'rgba(2,6,9,0.90)', border: `1px solid ${rightOpen ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`, cursor: 'pointer', color: '#00d4ff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(0,212,255,0.2)' }}
            >⚡</button>
          </div>
        </div>

      ) : (

        /* ═══════════════════════════════════════════════
           DESKTOP / TABLET: layout horizontal original
           ═══════════════════════════════════════════════ */
        <div
          className="flex-1 flex"
          style={{ minWidth: 0, gap: '1rem', padding: isTablet ? '1rem 1rem 4rem' : '1.5rem 1.5rem 5rem' }}
        >
          {/* Left panel */}
          <div style={{ width: sideWidth, flexShrink: 0, display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
            <ChatPanel alwaysOpen />
          </div>

          {/* Espaço central — orbe está em position:fixed, não precisa de coluna */}
          <div style={{ flex: 1 }} />

          {/* Right panel */}
          <div style={{ width: sideWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', overflow: 'hidden' }}>
            {/* Triangle toggle — points left (◀) when closed, right when open */}
            <button
              onClick={() => setRightOpen(v => !v)}
              title={rightOpen ? 'Fechar painel' : 'Abrir painel'}
              style={{
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderWidth: rightOpen ? '9px 16px 9px 0' : '9px 0 9px 16px',
                borderColor: rightOpen
                  ? 'transparent rgba(0,212,255,0.8) transparent transparent'
                  : 'transparent transparent transparent rgba(0,212,255,0.8)',
                background: 'none',
                cursor: 'pointer',
                filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.55))',
                transition: 'all 0.15s ease',
                marginRight: rightOpen ? '0' : '2px',
                marginBottom: rightOpen ? '8px' : '0',
                alignSelf: 'flex-end',
              }}
            />

            {rightOpen && (
              <div style={{
                width: Math.min(300, sideWidth - 20),
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(2,6,9,0.80)',
                border: '1px solid rgba(0,212,255,0.18)',
                borderRadius: '8px',
                padding: '10px 12px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 20px rgba(0,212,255,0.07)',
                animation: 'chatExpand 0.2s ease',
              }}>
                {/* Tabs: AGENTES | DOCS */}
                <div style={{ display: 'flex', marginBottom: 4, border: '1px solid rgba(0,212,255,0.15)', borderRadius: 6, overflow: 'hidden' }}>
                  {(['agents', 'docs'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRightTab(tab)}
                      style={{
                        flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600,
                        fontFamily: 'Orbitron, sans-serif', letterSpacing: 1,
                        background: rightTab === tab ? 'rgba(0,212,255,0.12)' : 'transparent',
                        color: rightTab === tab ? '#00d4ff' : '#475569',
                        border: 'none', borderBottom: rightTab === tab ? '1px solid #00d4ff' : '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {tab === 'agents' ? 'AGENTES' : 'DOCS'}
                    </button>
                  ))}
                </div>
                {rightTab === 'agents' ? (
                  <AgentSquadPanel agentStates={agentStates} />
                ) : (
                  <DeliveriesPanel />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    <SpeechCaption />

    {/* Voice enrollment modal */}
    {enrollFlow.active && (
      <VoiceEnrollModal
        suggestedName={enrollFlow.suggestedName}
        onClose={() => setEnrollFlow({ active: false, suggestedName: '' })}
        onEnrolled={(name) => {
          // Enable speaker verification now that at least one profile exists
          localStorage.setItem('maya_speaker_verify_enabled', 'true')
          console.log(`[maya] voice enrolled: ${name} — speaker verification enabled`)
        }}
      />
    )}
    </div>
  )
}

