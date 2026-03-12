/**
 * /api/speaker-enroll — Manage voice profiles stored in Supabase user_facts.
 *
 * POST { name: string, audioB64: string }
 *   → extract embedding via vosk, upsert profile in Supabase
 *   → returns { ok: true, name, samplesCount }
 *
 * GET → returns { profiles: [{ name, category }] }
 *
 * DELETE { name: string } → removes that profile
 */
import { NextRequest, NextResponse } from 'next/server'
import { extractEmbedding } from '../../../lib/voskSpeaker'
import { supabase } from '../../../lib/supabase'

const CATEGORY = 'voice_profile'

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// ── POST — enroll ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { name?: string; audioB64?: string }
  try {
    body = await req.json()
  } catch {
    return jsonErr('Invalid JSON body')
  }

  const { name, audioB64 } = body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonErr('name is required')
  }
  if (!audioB64 || typeof audioB64 !== 'string') {
    return jsonErr('audioB64 (base64 WAV) is required')
  }

  const cleanName = name.trim()

  // Extract speaker embedding via Python/Vosk
  const embedding = await extractEmbedding(audioB64)
  if (!embedding) {
    return jsonErr('No voice detected in the audio clip. Please speak clearly for at least 3 seconds.', 422)
  }

  // Upsert into Supabase user_facts (one row per person)
  // We use name as unique key within category=voice_profile
  const fact = JSON.stringify({ name: cleanName, voiceprint: embedding })

  // Delete any existing profile for this name first (upsert-style)
  await supabase
    .from('user_facts')
    .delete()
    .eq('category', CATEGORY)
    .like('fact', `%"name":"${cleanName}"%`)

  const { error } = await supabase.from('user_facts').insert({
    fact,
    category: CATEGORY,
    importance: 5,
    source: 'speaker-enroll',
  })

  if (error) {
    console.error('[speaker-enroll] Supabase insert error:', error)
    return jsonErr('Failed to save voice profile', 500)
  }

  return NextResponse.json({ ok: true, name: cleanName })
}

// ── GET — list profiles ───────────────────────────────────────────────────────

export async function GET() {
  const { data, error } = await supabase
    .from('user_facts')
    .select('id, fact, created_at')
    .eq('category', CATEGORY)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profiles = (data || []).map((row: any) => {
    try {
      const parsed = JSON.parse(row.fact)
      return { id: row.id, name: parsed.name as string, enrolledAt: row.created_at }
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ profiles })
}

// ── DELETE — remove profile ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  let body: { name?: string }
  try {
    body = await req.json()
  } catch {
    return jsonErr('Invalid JSON body')
  }

  const { name } = body
  if (!name || typeof name !== 'string') {
    return jsonErr('name is required')
  }

  const { error } = await supabase
    .from('user_facts')
    .delete()
    .eq('category', CATEGORY)
    .like('fact', `%"name":"${name.trim()}"%`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
