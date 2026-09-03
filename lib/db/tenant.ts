import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { isValidUuid } from '@/lib/security/sanitizer'
import { AppError } from '@/lib/errors/app-error'

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const TENANT_SETTING = 'app.current_project_id'

/**
 * Menjalankan `fn` di dalam satu transaksi database dengan `app.current_project_id`
 * ter-set, sehingga policy RLS pada tabel bisnis dapat mengenali tenant aktif.
 *
 * Ini adalah jaring pengaman lapis kedua. Lapis pertama tetap pengecekan
 * permission di service; RLS hanya memastikan query yang lolos dari sana pun
 * tidak bisa menyentuh baris milik project lain.
 */
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

/**
 * Membaca tenant yang sedang aktif pada koneksi. Mengembalikan null bila belum
 * di-set — dipakai test untuk membuktikan RLS menutup data saat tenant kosong.
 */
export async function currentTenant(tx: Transaction): Promise<string | null> {
  const result = await tx.execute<{ project_id: string | null }>(
    sql`select nullif(current_setting(${TENANT_SETTING}, true), '') as project_id`
  )
  const rows = result as unknown as { rows?: Array<{ project_id: string | null }> }
  return rows.rows?.[0]?.project_id ?? null
}
