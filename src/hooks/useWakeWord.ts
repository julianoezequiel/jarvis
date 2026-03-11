import { useEffect, useRef } from 'react'

type WakeHandler = (phrase: string) => void

export function useWakeWord(onWake: WakeHandler, enabled = true) {
  const recogRef = useRef<any>(null)

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

    return () => {
      try {
        recognition.stop()
      } catch (e) {
        /* ignore */
      }
    }
  }, [onWake, enabled])

  return {
    stop: () => recogRef.current?.stop(),
    start: () => recogRef.current?.start(),
  }
}
