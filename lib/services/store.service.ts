import { and, desc, eq, isNull } from 'drizzle-orm'
import { withTenant } from '@/lib/db/tenant'
import { stores } from '@/lib/db/schema'
import { encryptToken } from '@/lib/encryption'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { NotFoundError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface ConnectShopeeInput {
  projectId: string
  userId: string
  platformStoreId: string
  storeName: string
  branchId: string | null
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  ip: string
  userAgent: string
}

export class StoreService {
  // Connect or re-connect a Shopee shop; tokens are encrypted at rest. Idempotent
  // on (project, platform, platformStoreId): re-auth updates the same row.
  async connectShopee(input: ConnectShopeeInput): Promise<void> {
    await requirePermission(input.projectId, input.userId, 'store:manage')

    const values = {
      projectId: input.projectId,
      branchId: input.branchId,
      platform: 'shopee' as const,
      storeName: input.storeName,
      platformStoreId: input.platformStoreId,
      encryptedAccessToken: encryptToken(input.accessToken),
      encryptedRefreshToken: encryptToken(input.refreshToken),
      tokenExpiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      syncStatus: 'connected' as const,
      syncError: null,
      createdBy: input.userId,
      updatedBy: input.userId,
    }

    await withTenant(input.projectId, async (tx) => {
      const existing = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            eq(stores.projectId, input.projectId),
            eq(stores.platform, 'shopee'),
            eq(stores.platformStoreId, input.platformStoreId),
            isNull(stores.deletedAt)
          )
        )
        .limit(1)

      if (existing[0]) {
        await tx.update(stores).set(values).where(eq(stores.id, existing[0].id))
      } else {
        await tx.insert(stores).values(values)
      }
    })

    await auditRepository.log({
      action: 'sync',
      resource: 'store',
      userId: input.userId,
      projectId: input.projectId,
      ipAddress: input.ip,
      userAgent: input.userAgent,
      metadata: { platform: 'shopee', platformStoreId: input.platformStoreId },
    })
    logger.info(
      { projectId: input.projectId, platformStoreId: input.platformStoreId },
      'shopee connected'
    )
  }

  async list(projectId: string, userId: string) {
    await requirePermission(projectId, userId, 'project:view')
    return withTenant(projectId, (tx) =>
      tx
        .select({
          id: stores.id,
          storeName: stores.storeName,
          platform: stores.platform,
          syncStatus: stores.syncStatus,
          lastSyncedAt: stores.lastSyncedAt,
          syncError: stores.syncError,
        })
        .from(stores)
        .where(and(eq(stores.projectId, projectId), isNull(stores.deletedAt)))
        .orderBy(desc(stores.createdAt))
    )
  }

  async disconnect(
    projectId: string,
    userId: string,
    storeId: string,
    meta: { ip: string; userAgent: string }
  ) {
    await requirePermission(projectId, userId, 'store:manage')
    const rows = await withTenant(projectId, (tx) =>
      tx
        .update(stores)
        .set({
          syncStatus: 'disconnected',
          encryptedAccessToken: null,
          encryptedRefreshToken: null,
          updatedBy: userId,
        })
        .where(
          and(eq(stores.id, storeId), eq(stores.projectId, projectId), isNull(stores.deletedAt))
        )
        .returning({ id: stores.id })
    )
    if (rows.length === 0) throw new NotFoundError('Toko tidak ditemukan')
    await auditRepository.log({
      action: 'update',
      resource: 'store',
      resourceId: storeId,
      userId,
      projectId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { disconnected: true },
    })
  }
}

export const storeService = new StoreService()
