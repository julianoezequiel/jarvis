"use client"
import React, { useEffect, useState } from 'react'
import SettingsPanel from './SettingsPanel'

type StatusBarProps = {
  showSettings: boolean
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>
}

export default function StatusBar({ showSettings, setShowSettings }: StatusBarProps) {
  const [now, setNow] = useState<string>('--:--:--')

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleTimeString())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl+, or Meta+, to open settings; Esc to close
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings((s) => !s)
      }
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', onKey)
    // Listener para evento customizado de fechar modal
    function onCloseSettingsModal() {
      setShowSettings(false)
    }
    window.addEventListener('closeSettingsModal', onCloseSettingsModal as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('closeSettingsModal', onCloseSettingsModal as EventListener)
    }
  }, [setShowSettings])

  return (
    <header className="h-10 bg-black/20 backdrop-blur-sm flex items-center px-4">
      <div className="text-xs text-mayaCyan">MAYA AIOS</div>
      <div className="flex-1 text-right text-xs text-gray-300">{now}</div>
      <button
        onClick={() => setShowSettings(true)}
        className="ml-4 bg-black/30 hover:bg-black/40 text-xs text-gray-200 px-2 py-1 rounded"
        aria-label="Open settings"
      >
        Settings
      </button>

      {showSettings && <SettingsPanel />}
    </header>
  )
}

