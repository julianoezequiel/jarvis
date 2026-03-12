/**
 * src/lib/db/adapters/supabaseAdapter.ts
 *
 * DbAdapter implementation backed by Supabase (@supabase/supabase-js).
 *
 * Key preference: uses SUPABASE_SERVICE_ROLE_KEY when available so that
 * server-side routes bypass Row Level Security (required for INSERT/DELETE).
 * Falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY for read-only queries.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { DbAdapter, Filter, SelectOptions } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: Filter[] = []): any {
  for (const f of filters) {
    switch (f.op) {
      case 'eq':    query = query.eq(f.column, f.value); break
      case 'neq':   query = query.neq(f.column, f.value); break
      case 'ilike': query = query.ilike(f.column, f.value); break
      case 'like':  query = query.like(f.column, f.value); break
      case 'gt':    query = query.gt(f.column, f.value); break
      case 'lt':    query = query.lt(f.column, f.value); break
      case 'gte':   query = query.gte(f.column, f.value); break
      case 'lte':   query = query.lte(f.column, f.value); break
    }
  }
  return query
}

export class SupabaseAdapter implements DbAdapter {
  private client: SupabaseClient

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    // Prefer service role — needed for server-side inserts/deletes with RLS
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error(
        '[SupabaseAdapter] Missing required env vars: ' +
        'NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
      )
    }

    this.client = createClient(url, key)
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
    const { columns = '*', filters = [], orFilters = [], orderBy, limit } = options

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = this.client.from(table).select(columns)
    q = applyFilters(q, filters)

    if (orFilters.length > 0) {
      const orStr = orFilters
        .map((f) => {
          switch (f.op) {
            case 'ilike': return `${f.column}.ilike.${f.value}`
            case 'like':  return `${f.column}.like.${f.value}`
            case 'eq':    return `${f.column}.eq.${f.value}`
            case 'neq':   return `${f.column}.neq.${f.value}`
            default:      return `${f.column}.eq.${f.value}`
          }
        })
        .join(',')
      q = q.or(orStr)
    }

    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    if (limit !== undefined) q = q.limit(limit)

    const { data, error } = await q
    if (error) throw new Error(`[SupabaseAdapter.select] ${table}: ${error.message}`)
    return (data ?? []) as T[]
  }

  async insert<T>(table: string, rows: T | T[]): Promise<void> {
    const data = Array.isArray(rows) ? rows : [rows]
    const { error } = await this.client.from(table).insert(data)
    if (error) throw new Error(`[SupabaseAdapter.insert] ${table}: ${error.message}`)
  }

  async update<T>(table: string, data: Partial<T>, filters: Filter[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = this.client.from(table).update(data)
    q = applyFilters(q, filters)
    const { error } = await q
    if (error) throw new Error(`[SupabaseAdapter.update] ${table}: ${error.message}`)
  }

  async delete(table: string, filters: Filter[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = this.client.from(table).delete()

    if (filters.length === 0) {
      // "Delete all" — Supabase requires at least one filter; use neq on a nil UUID as convention
      q = q.neq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      q = applyFilters(q, filters)
    }

    const { error } = await q
    if (error) throw new Error(`[SupabaseAdapter.delete] ${table}: ${error.message}`)
  }
}
