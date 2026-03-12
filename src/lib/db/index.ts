/**
 * src/lib/db/index.ts
 *
 * Entry point for the database abstraction layer.
 *
 * Usage:
 *   import { db } from '@/lib/db'
 *   const rows = await db.select('user_facts', { filters: [{ column: 'category', op: 'eq', value: 'voice_profile' }] })
 *   await db.insert('jarvis_memory', { role: 'user', content: 'Hello' })
 *
 * Adapter is selected via the DB_ADAPTER environment variable:
 *   DB_ADAPTER=supabase  (default) — uses @supabase/supabase-js
 *   DB_ADAPTER=postgres           — uses node-postgres (pg) with DATABASE_URL
 */

import type { DbAdapter } from './types'
export type { DbAdapter, Filter, FilterOp, SelectOptions, OrderBy } from './types'

// Lazy singleton — resolved on first call so env vars are available at runtime
let _instance: DbAdapter | null = null

function getInstance(): DbAdapter {
  if (_instance) return _instance

  const adapterType = process.env.DB_ADAPTER ?? 'supabase'

  if (adapterType === 'postgres') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresAdapter } = require('./adapters/postgresAdapter') as {
      PostgresAdapter: new () => DbAdapter
    }
    _instance = new PostgresAdapter()
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseAdapter } = require('./adapters/supabaseAdapter') as {
      SupabaseAdapter: new () => DbAdapter
    }
    _instance = new SupabaseAdapter()
  }

  return _instance
}

/**
 * The db object delegates all calls to the lazily-initialized adapter.
 * Call from any server-side file (API routes, server actions).
 * Do NOT import in client components — use API routes as the boundary.
 */
export const db: DbAdapter = {
  select: (table, options) => getInstance().select(table, options),
  insert: (table, rows) => getInstance().insert(table, rows),
  update: (table, data, filters) => getInstance().update(table, data, filters),
  delete: (table, filters) => getInstance().delete(table, filters),
}
