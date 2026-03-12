/**
 * voskSpeaker.ts — Node.js wrapper around src/scripts/vosk_speaker.py
 *
 * Calls the Python script via child_process.execFile.
 * Audio must be base64-encoded WAV (16kHz, mono, PCM16) as produced by
 * the rolling buffer in MicPermissionOverlay.tsx.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

/** Resolve paths relative to the Next.js project root (process.cwd()). */
const PYTHON = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
const SCRIPT = path.join(process.cwd(), 'src', 'scripts', 'vosk_speaker.py')

export interface VoiceProfile {
  name: string
  voiceprint: number[]   // 128-dim embedding
}

export interface VerifyResult {
  match: boolean
  speaker: string | null
  confidence: number
  reason: 'compared' | 'no_enrollment' | 'no_voice_detected' | 'error'
  error?: string
}

/** Write base64 WAV to a temp file, return its path. Caller must delete it. */
async function writeTempWav(audioB64: string): Promise<string> {
  const wavPath = path.join(os.tmpdir(), `maya_spk_${randomUUID()}.wav`)
  const buffer = Buffer.from(audioB64, 'base64')
  await writeFile(wavPath, buffer)
  return wavPath
}

/** Extract a 128-dim speaker embedding from a base64 WAV clip. */
export async function extractEmbedding(audioB64: string): Promise<number[] | null> {
  const wavPath = await writeTempWav(audioB64)
  try {
    const { stdout } = await execFileAsync(PYTHON, [SCRIPT, 'extract', wavPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 512,
    })
    const result = JSON.parse(stdout.trim())
    if (result.error) {
      console.error('[voskSpeaker] extract error:', result.error)
      return null
    }
    return result.embedding as number[]
  } catch (err) {
    console.error('[voskSpeaker] execFile error (extract):', err)
    return null
  } finally {
    await unlink(wavPath).catch(() => {})
  }
}

/**
 * Compare audio against a set of enrolled profiles.
 * Returns "no_enrollment" match (allow-all) if profiles array is empty.
 */
export async function verifyAgainstProfiles(
  audioB64: string,
  profiles: VoiceProfile[],
): Promise<VerifyResult> {
  // No enrolled profiles → open access (no restriction mode)
  if (!profiles.length) {
    return { match: true, speaker: null, confidence: 1.0, reason: 'no_enrollment' }
  }

  const wavPath = await writeTempWav(audioB64)
  try {
    const profilesJson = JSON.stringify(profiles)
    const { stdout } = await execFileAsync(
      PYTHON,
      [SCRIPT, 'compare', wavPath, profilesJson],
      {
        timeout: 30_000,
        maxBuffer: 1024 * 512,
      },
    )
    const result = JSON.parse(stdout.trim())
    if (result.error) {
      console.error('[voskSpeaker] compare error:', result.error)
      return { match: false, speaker: null, confidence: 0, reason: 'error', error: result.error }
    }
    return result as VerifyResult
  } catch (err: any) {
    console.error('[voskSpeaker] execFile error (compare):', err)
    return { match: false, speaker: null, confidence: 0, reason: 'error', error: String(err) }
  } finally {
    await unlink(wavPath).catch(() => {})
  }
}
