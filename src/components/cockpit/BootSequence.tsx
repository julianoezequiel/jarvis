"use client"
import React, { useEffect, useState } from 'react'

export default function BootSequence({ onDone, noMic = false }: { onDone: () => void; noMic?: boolean }) {
  const [progress, setProgress] = useState(0)
  const lines = ['Initializing core', 'Loading agents', 'Starting services', 'Finalizing']
  const [activeLine, setActiveLine] = useState(0)

  useEffect(() => {
    const total = 3000
    const step = 100
    let elapsed = 0
    const id = setInterval(() => {
      elapsed += step
      setProgress(Math.min(100, Math.round((elapsed / total) * 100)))
      const lineIdx = Math.min(lines.length - 1, Math.floor((elapsed / total) * lines.length))
      setActiveLine(lineIdx)
      if (elapsed >= total) {
        clearInterval(id)        // Iniciar microfone automaticamente antes de transitar para ready
        try {
          if (!noMic && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('maya:init-mic'))
          }
        } catch (_) {}        setTimeout(onDone, 250)
      }
    }, step)
    return () => clearInterval(id)
  }, [onDone, noMic])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="bg-[#071017] p-6 rounded shadow-lg w-96 text-left">
        <h3 className="text-mayaCyan mb-3">Boot sequence</h3>
        <div className="text-xs text-gray-300 mb-3">
          {lines.map((l, i) => (
            <div key={l} className={`mb-1 ${i === activeLine ? 'text-mayaCyan' : 'text-gray-500'}`}>{i === activeLine ? '• ' : '  '}{l}</div>
          ))}
        </div>
        <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
          <div style={{ width: `${progress}%` }} className="h-2 bg-mayaCyan" />
        </div>
        <div className="text-xs text-gray-400 mt-2">{progress}%</div>
      </div>
    </div>
  )
}

