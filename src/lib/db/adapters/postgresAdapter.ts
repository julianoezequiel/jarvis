/**
 * src/lib/db/adapters/postgresAdapter.ts
 *
 * DbAdapter implementation backed by node-postgres (pg).
 * Used when DB_ADAPTER=postgres — e.g. in Docker deployments with PontoCore's PostgreSQL.
 *
 * Requires environment variable:
 *   DATABASE_URL=postgresql://user:password@host:5432/dbname
 */

import { Pool } from 'pg'
import type { DbAdapter, Filter, SelectOptions } from '../types'

/**
 * Converts filter array to a SQL WHERE clause with positional parameters.
 * startIndex: the $N index to start counting from (1-based).
 */
function buildWhere(
  filters: Filter[],
  startIndex: number
): { clause: string; params: unknown[] } {
  if (filters.length === 0) return { clause: '', params: [] }

  const params: unknown[] = []
  const parts = filters.map((f) => {
    const idx = startIndex + params.length
    params.push(f.value)
    switch (f.op) {
      case 'eq':    return `"${f.column}" = $${idx}`
      case 'neq':   return `"${f.column}" != $${idx}`
      case 'ilike': return `"${f.column}" ILIKE $${idx}`
      case 'like':  return `"${f.column}" LIKE $${idx}`
      case 'gt':    return `"${f.column}" > $${idx}`
      case 'lt':    return `"${f.column}" < $${idx}`
      case 'gte':   return `"${f.column}" >= $${idx}`
      case 'lte':   return `"${f.column}" <= $${idx}`
      default:      return `"${f.column}" = $${idx}`
    }
  })

  return { clause: `WHERE ${parts.join(' AND ')}`, params }
}

/**
 * Builds an OR clause for orFilters, appending params starting at startIndex.
 */
function buildOrClause(
  orFilters: Filter[],
  startIndex: number
): { clause: string; params: unknown[] } {
  if (orFilters.length === 0) return { clause: '', params: [] }

  const params: unknown[] = []
  const parts = orFilters.map((f) => {
    const idx = startIndex + params.length
    params.push(f.value)
    switch (f.op) {
      case 'ilike': return `"${f.column}" ILIKE $${idx}`
      case 'like':  return `"${f.column}" LIKE $${idx}`
      case 'eq':    return `"${f.column}" = $${idx}`
      case 'neq':   return `"${f.column}" != $${idx}`
      default:      return `"${f.column}" = $${idx}`
    }
  })

  return { clause: `(${parts.join(' OR ')})`, params }
}

export class PostgresAdapter implements DbAdapter {
  private pool: Pool

  constructor() {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('[PostgresAdapter] Missing required env var: DATABASE_URL')
    }
    this.pool = new Pool({ connectionString: url, max: 10 })

    // Surface connection errors early — do not silently swallow pool creation failures
    this.pool.on('error', (err) => {
      console.error('[PostgresAdapter] Unexpected pool error:', err)
    })
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
    const { columns = '*', filters = [], orFilters = [], orderBy, limit } = options

    const allAndParams: unknown[] = []
    const andParts: string[] = []

    // AND filters
    if (filters.length > 0) {
      const { clause, params } = buildWhere(filters, allAndParams.length + 1)
      // clause starts with "WHERE " — strip that, collect parts
      const rawPart = clause.replace(/^WHERE\s+/, '')
      // reindex: params already built with correct indices from buildWhere
      andParts.push(rawPart)
      allAndParams.push(...params)
    }

    // OR group
    let orParams: unknown[] = []
    if (orFilters.length > 0) {
      const { clause, params } = buildOrClause(orFilters, allAndParams.length + 1)
      andParts.push(clause)
      orParams = params
    }

    const allParams = [...allAndParams, ...orParams]
    const whereClause = andParts.length > 0 ? `WHERE ${andParts.join(' AND ')}` : ''

    let sql = `SELECT ${columns} FROM "${table}" ${whereClause}`.trimEnd()

    if (orderBy) {
      sql += ` ORDER BY "${orderBy.column}" ${orderBy.ascending === false ? 'DESC' : 'ASC'}`
    }
    if (limit !== undefined) {
      // LIMIT is not parameterized — sanitize to integer to prevent injection
      sql += ` LIMIT ${Math.floor(Math.abs(Number(limit)))}`
    }

    const { rows } = await this.pool.query(sql, allParams)
    return rows as T[]
  }

  async insert<T>(table: string, rows: T | T[]): Promise<void> {
    const data = Array.isArray(rows) ? rows : [rows]
    if (data.length === 0) return

    for (const row of data) {
      const obj = row as Record<string, unknown>
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined)
      if (keys.length === 0) continue

      const cols = keys.map((k) => `"${k}"`).join(', ')
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
      const values = keys.map((k) => obj[k])

      await this.pool.query(
        `INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`,
        values
      )
    }
  }

  async update<T>(table: string, data: Partial<T>, filters: Filter[]): Promise<void> {
    const obj = data as Record<string, unknown>
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined)
    if (keys.length === 0) return

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
    const setValues = keys.map((k) => obj[k])

    const { clause, params } = buildWhere(filters, setValues.length + 1)
    await this.pool.query(
      `UPDATE "${table}" SET ${setClauses} ${clause}`,
      [...setValues, ...params]
    )
  }

  async delete(table: string, filters: Filter[]): Promise<void> {
    if (filters.length === 0) {
      // Delete all rows in the table
      await this.pool.query(`DELETE FROM "${table}"`)
      return
    }
    const { clause, params } = buildWhere(filters, 1)
    await this.pool.query(`DELETE FROM "${table}" ${clause}`, params)
  }
}
