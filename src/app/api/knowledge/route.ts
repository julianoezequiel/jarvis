import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '../../../lib/db'

/**
 * Knowledge file API — stores text knowledge in `agent_knowledge` table.
 *
 * Storage convention:
 *   Metadata row: agent_id='knowledge', skill_name='META::{fileId}', content=JSON(meta)
 *   Chunk rows:   agent_id='knowledge', skill_name='{fileId}::{i}',  content='[name] chunkText'
 */

const CHUNK_SIZE    = 600
const CHUNK_OVERLAP = 80
const AGENT_ID      = 'knowledge'

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = start + CHUNK_SIZE
    chunks.push(text.slice(start, end).trim())
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter(c => c.length > 0)
}

// ── GET /api/knowledge ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const rows = await db.select<Record<string, unknown>>('agent_knowledge', {
      filters: [
        { column: 'agent_id',   op: 'eq',    value: AGENT_ID },
        { column: 'skill_name', op: 'ilike', value: 'META::%' },
      ],
    })

    const files = rows.map((row: Record<string, unknown>) => {
      try { return JSON.parse(row.content as string) as Record<string, unknown> }
      catch { return null }
    }).filter(Boolean)

    return NextResponse.json({ files })
  } catch (err) {
    console.error('[knowledge GET]', err)
    return NextResponse.json({ error: 'Failed to list knowledge files' }, { status: 500 })
  }
}

// ── POST /api/knowledge ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { fileName?: string; fileType?: string; content?: string }
    const { fileName, fileType, content } = body

    if (!fileName || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'fileName and content are required' }, { status: 400 })
    }

    const fileId    = randomUUID()
    const chunks    = chunkText(content)
    const uploadedAt = new Date().toISOString()

    // Metadata row
    const meta = {
      id:         fileId,
      name:       fileName,
      type:       fileType ?? '',
      chunkCount: chunks.length,
      uploadedAt,
    }
    await db.insert('agent_knowledge', {
      agent_id:   AGENT_ID,
      skill_name: `META::${fileId}`,
      content:    JSON.stringify(meta),
      quality:    1,
    })

    // Chunk rows
    await Promise.all(
      chunks.map((chunk, i) =>
        db.insert('agent_knowledge', {
          agent_id:   AGENT_ID,
          skill_name: `${fileId}::${i}`,
          content:    `[${fileName}] ${chunk}`,
          quality:    1,
        }),
      ),
    )

    return NextResponse.json({ success: true, fileId, chunkCount: chunks.length }, { status: 201 })
  } catch (err) {
    console.error('[knowledge POST]', err)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}

// ── DELETE /api/knowledge?id={fileId} ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get('id')
    if (!fileId) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    await db.delete('agent_knowledge', [
      { column: 'agent_id',   op: 'eq',   value: AGENT_ID },
      { column: 'skill_name', op: 'like',  value: `%${fileId}%` },
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[knowledge DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
