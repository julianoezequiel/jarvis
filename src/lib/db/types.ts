/**
 * src/lib/db/types.ts
 *
 * Shared types for the database abstraction layer.
 * All adapters (Supabase, PostgreSQL) must implement DbAdapter.
 */

export type FilterOp = 'eq' | 'neq' | 'ilike' | 'like' | 'gt' | 'lt' | 'gte' | 'lte'

export interface Filter {
  column: string
  op: FilterOp
  value: unknown
}

export interface OrderBy {
  column: string
  /** Default: true (ASC). Set false for DESC. */
  ascending?: boolean
}

export interface SelectOptions {
  /** Comma-separated column list or '*'. Default: '*' */
  columns?: string
  /** AND conditions applied to the WHERE clause. */
  filters?: Filter[]
  /** OR conditions — all applied with OR logic as a single group. */
  orFilters?: Filter[]
  orderBy?: OrderBy
  limit?: number
}

export interface DbAdapter {
  select<T = Record<string, unknown>>(table: string, options?: SelectOptions): Promise<T[]>
  insert<T = Record<string, unknown>>(table: string, rows: T | T[]): Promise<void>
  update<T = Record<string, unknown>>(table: string, data: Partial<T>, filters: Filter[]): Promise<void>
  delete(table: string, filters: Filter[]): Promise<void>
}
