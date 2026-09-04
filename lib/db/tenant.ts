import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { isValidUuid } from '@/lib/security/uuid'
import { AppError } from '@/lib/errors/app-error'

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const TENANT_SETTING = 'app.current_project_id'

// Run fn in one transaction with app.current_project_id set, so RLS policies on business tables recognize the active tenant. This is the second line of defense; the first is the permission check in the service.
export async function withTenant<T>(
  projectId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  if (!isValidUuid(projectId)) {
    throw new AppError('Project id tidak valid', 'INVALID_TENANT', 400)
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config(${TENANT_SETTING}, ${projectId}, true)`)
    return fn(tx)
  })
}

// Read the tenant currently set on the connection; null if unset. Used by tests to prove RLS hides data when the tenant is empty.
export async function currentTenant(tx: Transaction): Promise<string | null> {
  const result = await tx.execute<{ project_id: string | null }>(
    sql`select nullif(current_setting(${TENANT_SETTING}, true), '') as project_id`
  )
  const rows = result as unknown as { rows?: Array<{ project_id: string | null }> }
  return rows.rows?.[0]?.project_id ?? null
}
