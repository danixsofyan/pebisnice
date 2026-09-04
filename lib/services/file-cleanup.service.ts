import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products, projects } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { deleteObject, listObjects } from '@/lib/storage/object-store'
import { ORPHAN_MIN_AGE_MS, selectOrphans } from '@/lib/domain/media/orphan'
import { logger } from '@/lib/logging/logger'

export interface CleanupResult {
  scanned: number
  deleted: number
}

/**
 * Removes orphaned product images from the bucket.
 *
 * References are collected per project inside each tenant's context so the query
 * stays valid under row-level security; soft-deleted rows are still counted so
 * recoverable images are never swept. Objects younger than the age threshold are
 * left alone, protecting uploads whose form has not been saved yet.
 */
export class FileCleanupService {
  async cleanupOrphanProductImages(now: Date = new Date()): Promise<CleanupResult> {
    const objects = await listObjects()

    const allProjects = await db.select({ id: projects.id }).from(projects)
    const referencedKeys = new Set<string>()

    for (const project of allProjects) {
      const rows = await withTenant(project.id, (tx) =>
        tx
          .select({ imageKey: products.imageKey })
          .from(products)
          .where(and(eq(products.projectId, project.id), isNotNull(products.imageKey)))
      )
      for (const row of rows) {
        if (row.imageKey) referencedKeys.add(row.imageKey)
      }
    }

    const orphans = selectOrphans({ objects, referencedKeys, now, minAgeMs: ORPHAN_MIN_AGE_MS })
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
