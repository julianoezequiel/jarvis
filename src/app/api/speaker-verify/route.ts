/**
 * /api/speaker-verify — Verify a speaker against all enrolled voice profiles.
 *
 * POST { audioB64: string }
 *   → fetch all profiles from Supabase
 *   → call Python compare
 *   → returns { match, speaker, confidence, reason }
 *
 * If no profiles are enrolled, always returns match=true, reason="no_enrollment".
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAgainstProfiles, VoiceProfile } from '../../../lib/voskSpeaker'
import { db } from '../../../lib/db'

const CATEGORY = 'voice_profile'

export async function POST(req: NextRequest) {
  let body: { audioB64?: string; threshold?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { audioB64, threshold } = body
  const safeThreshold = typeof threshold === 'number' && threshold >= 0.5 && threshold <= 1.0
    ? threshold
    : 0.85

  if (!audioB64 || typeof audioB64 !== 'string') {
    return NextResponse.json({ error: 'audioB64 is required' }, { status: 400 })
  }

  // Fetch all enrolled profiles
  let rows: { fact: string }[]
  try {
    rows = await db.select<{ fact: string }>('user_facts', {
      columns: 'fact',
      filters: [{ column: 'category', op: 'eq', value: CATEGORY }],
    })
  } catch (err) {
    console.error('[speaker-verify] DB fetch error:', err)
    // Fail open: if DB is down, don't block users
    return NextResponse.json({ match: true, speaker: null, confidence: 1.0, reason: 'no_enrollment' })
  }

  const profiles: VoiceProfile[] = rows
    .map((row: { fact: string }) => {
      try {
        const p = JSON.parse(row.fact)
        if (p.name && Array.isArray(p.voiceprint) && p.voiceprint.length === 128) {
          return { name: p.name as string, voiceprint: p.voiceprint as number[] }
        }
        return null
      } catch {
        return null
      }
    })
    .filter((p): p is VoiceProfile => p !== null)

  const result = await verifyAgainstProfiles(audioB64, profiles, safeThreshold)
  return NextResponse.json(result)
}
