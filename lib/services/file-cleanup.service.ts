import { isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { deleteObject, listObjects } from '@/lib/storage/object-store'
import { ORPHAN_MIN_AGE_MS, selectOrphans } from '@/lib/domain/media/orphan'
import { logger } from '@/lib/logging/logger'

export interface CleanupResult {
  scanned: number
  deleted: number
}

/**
 * Menghapus foto produk yatim dari bucket.
 *
 * Rujukan dikumpulkan dari SELURUH baris produk yang punya `image_key`, termasuk
 * yang sudah di-soft-delete — supaya foto produk yang masih bisa dipulihkan
 * tidak ikut terbuang. Objek yang lebih muda dari ambang usia dibiarkan agar
 * upload yang formnya belum disimpan tetap aman.
 */
export class FileCleanupService {
  async cleanupOrphanProductImages(now: Date = new Date()): Promise<CleanupResult> {
    const objects = await listObjects()

    const rows = await db
      .select({ imageKey: products.imageKey })
      .from(products)
      .where(isNotNull(products.imageKey))

    const referencedKeys = new Set(rows.map((row) => row.imageKey as string))

    const orphans = selectOrphans({
      objects,
      referencedKeys,
      now,
      minAgeMs: ORPHAN_MIN_AGE_MS,
    })

    for (const key of orphans) {
      await deleteObject(key)
    }

    if (orphans.length > 0) {
      logger.info(
        { scanned: objects.length, deleted: orphans.length },
        'orphan product images removed'
      )
    }

    return { scanned: objects.length, deleted: orphans.length }
  }
}

export const fileCleanupService = new FileCleanupService()
