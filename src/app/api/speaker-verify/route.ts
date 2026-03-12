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
import { supabase } from '../../../lib/supabase'

const CATEGORY = 'voice_profile'

export async function POST(req: NextRequest) {
  let body: { audioB64?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { audioB64 } = body
  if (!audioB64 || typeof audioB64 !== 'string') {
    return NextResponse.json({ error: 'audioB64 is required' }, { status: 400 })
  }

  // Fetch all enrolled profiles
  const { data, error } = await supabase
    .from('user_facts')
    .select('fact')
    .eq('category', CATEGORY)

  if (error) {
    console.error('[speaker-verify] Supabase fetch error:', error)
    // Fail open: if DB is down, don't block users
    return NextResponse.json({ match: true, speaker: null, confidence: 1.0, reason: 'no_enrollment' })
  }

  const profiles: VoiceProfile[] = (data || [])
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

  const result = await verifyAgainstProfiles(audioB64, profiles)
  return NextResponse.json(result)
}
