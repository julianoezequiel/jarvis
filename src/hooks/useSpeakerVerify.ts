/**
 * useSpeakerVerify — Hook to interact with the speaker enrollment/verification system.
 *
 * Provides:
 *   verify(audioB64)           → POST /api/speaker-verify
 *   enrollByName(name, audioB64) → POST /api/speaker-enroll
 *   listProfiles()             → GET  /api/speaker-enroll
 *   deleteProfile(name)        → DELETE /api/speaker-enroll
 */
import { useCallback } from 'react'

export interface VerifyResult {
  match: boolean
  speaker: string | null
  confidence: number
  reason: 'compared' | 'no_enrollment' | 'no_voice_detected' | 'error'
  error?: string
}

export interface ProfileInfo {
  id: string
  name: string
  enrolledAt: string
}

export function useSpeakerVerify() {
  /** Verify a WAV audio clip (base64) against all enrolled profiles. */
  const verify = useCallback(async (audioB64: string): Promise<VerifyResult> => {
    try {
      const res = await fetch('/api/speaker-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioB64 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { match: false, speaker: null, confidence: 0, reason: 'error', error: err.error ?? `HTTP ${res.status}` }
      }
      return await res.json()
    } catch (err: any) {
      return { match: false, speaker: null, confidence: 0, reason: 'error', error: String(err) }
    }
  }, [])

  /** Enroll a new voice profile from a base64 WAV clip. */
  const enrollByName = useCallback(async (name: string, audioB64: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/speaker-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, audioB64 }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: String(err) }
    }
  }, [])

  /** List all enrolled profiles (name + enrolledAt). */
  const listProfiles = useCallback(async (): Promise<ProfileInfo[]> => {
    try {
      const res = await fetch('/api/speaker-enroll')
      if (!res.ok) return []
      const data = await res.json()
      return data.profiles ?? []
    } catch {
      return []
    }
  }, [])

  /** Delete an enrolled profile by name. */
  const deleteProfile = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/speaker-enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return { verify, enrollByName, listProfiles, deleteProfile }
}
