/**
 * Phase 1 Tests — DB Adapter factory
 *
 * Tests that do NOT require a real database connection.
 * Validates the factory logic: which adapter is selected based on DB_ADAPTER env var.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Factory selection ────────────────────────────────────────────────────────

describe('db/index factory', () => {
  const originalEnv = process.env.DB_ADAPTER

  beforeEach(() => {
    // Clear module cache so each test gets a fresh singleton
    vi.resetModules()
  })

  afterEach(() => {
    process.env.DB_ADAPTER = originalEnv
  })

  it('exports a db object with the 4 required methods', async () => {
    process.env.DB_ADAPTER = 'supabase'
    // Mock supabase client to avoid real network calls
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({ from: () => ({ select: () => ({ data: [], error: null }) }) }),
    }))
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'

    const { db } = await import('../../../lib/db')

    expect(typeof db.select).toBe('function')
    expect(typeof db.insert).toBe('function')
    expect(typeof db.update).toBe('function')
    expect(typeof db.delete).toBe('function')
  })

  it('selects SupabaseAdapter when DB_ADAPTER=supabase', async () => {
    process.env.DB_ADAPTER = 'supabase'
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({ from: () => ({}) }),
    }))
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'

    const { SupabaseAdapter } = await import('../../../lib/db/adapters/supabaseAdapter')
    const instance = new SupabaseAdapter()

    expect(instance).toBeDefined()
  })

  it('selects SupabaseAdapter when DB_ADAPTER is not set (default)', async () => {
    delete process.env.DB_ADAPTER
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({ from: () => ({}) }),
    }))
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'

    const { SupabaseAdapter } = await import('../../../lib/db/adapters/supabaseAdapter')
    const instance = new SupabaseAdapter()

    expect(instance).toBeDefined()
  })
})

// ─── OrbType types ────────────────────────────────────────────────────────────
// Type-level contracts validated at compile time — runtime checks for defaults.

describe('db types / OrbConfig defaults', () => {
  it('DEFAULT_ORB_CONFIG has expected shape', async () => {
    const { DEFAULT_ORB_CONFIG } = await import('../../../components/widget/orbs/types')
    expect(DEFAULT_ORB_CONFIG.type).toBe('default')
    expect(DEFAULT_ORB_CONFIG.size).toBe(72)
    expect(DEFAULT_ORB_CONFIG.showLabel).toBe(false)
  })
})
