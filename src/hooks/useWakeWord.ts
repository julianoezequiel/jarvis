import { useEffect, useRef } from 'react'

type WakeHandler = (phrase: string) => void

export function useWakeWord(onWake: WakeHandler, enabled = true) {
  const recogRef = useRef<any>(null)
  const mutedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Web Speech API not available in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recogRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'pt-BR'

    recognition.onresult = (event: any) => {
      if (mutedRef.current) return // ignora resultados quando mudo
      const last = event.results[event.results.length - 1]
      const text = String(last[0].transcript).trim().toLowerCase()
      // Simple detection: contains wake word 'maya'
      if (text.includes('maya')) {
        onWake(text)
      }
    }

    recognition.onerror = (ev: any) => {
      console.warn('Speech recognition error', ev)
    }

    recognition.start()

    // Escuta eventos de mute global do CentralOrb
    const muteHandler = (e: Event) => {
      const muted = (e as CustomEvent<{ muted: boolean }>).detail?.muted ?? false
      mutedRef.current = muted
      if (muted) {
        try { recognition.stop() } catch (_) {}
      } else {
        try { recognition.start() } catch (_) {}
      }
    }
    window.addEventListener('maya:mute', muteHandler)

    return () => {
      try {
        recognition.stop()
      } catch (e) {
        /* ignore */
      }
      window.removeEventListener('maya:mute', muteHandler)
    }
  }, [onWake, enabled])

  return {
    stop: () => recogRef.current?.stop(),
    start: () => recogRef.current?.start(),
  }
}
