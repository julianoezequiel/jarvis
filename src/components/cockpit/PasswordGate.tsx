"use client"
import React, { useState } from 'react'

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState(false)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (pwd === '1234') {
      onUnlock()
    } else {
      setErr(true)
      setTimeout(() => setErr(false), 600)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <form onSubmit={submit} className={`bg-[#071017] p-6 rounded shadow-lg w-80 ${err ? 'animate-shake' : ''}`}>
        <h3 className="text-lg text-mayaCyan mb-2">Enter Password</h3>
        <input
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Senha"
          className="w-full p-2 rounded mb-3"
          type="password"
          autoComplete="off"
        />
        <div className="flex justify-end">
          <button className="px-3 py-1 bg-mayaCyan rounded text-black">Unlock</button>
        </div>
      </form>
    </div>
  )
}

