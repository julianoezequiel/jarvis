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
import { db } from '../../../lib/db'

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

  // Upsert: delete any existing profile for this name, then insert fresh
  const fact = JSON.stringify({ name: cleanName, voiceprint: embedding })

  try {
    await db.delete('user_facts', [
      { column: 'category', op: 'eq', value: CATEGORY },
      { column: 'fact', op: 'like', value: `%"name":"${cleanName}"%` },
    ])
    await db.insert('user_facts', {
      fact,
      category: CATEGORY,
      importance: 5,
      source: 'speaker-enroll',
    })
  } catch (err) {
    console.error('[speaker-enroll] DB error:', err)
    return jsonErr('Failed to save voice profile', 500)
  }

  return NextResponse.json({ ok: true, name: cleanName })
}

// ── GET — list profiles ───────────────────────────────────────────────────────

export async function GET() {
  let rows: { id: string; fact: string; created_at: string }[]
  try {
    rows = await db.select<{ id: string; fact: string; created_at: string }>('user_facts', {
      columns: 'id, fact, created_at',
      filters: [{ column: 'category', op: 'eq', value: CATEGORY }],
      orderBy: { column: 'created_at', ascending: true },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const profiles = rows.map((row) => {
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

  try {
    await db.delete('user_facts', [
      { column: 'category', op: 'eq', value: CATEGORY },
      { column: 'fact', op: 'like', value: `%"name":"${name.trim()}"%` },
    ])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
