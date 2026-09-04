import { eq } from 'drizzle-orm'
import { withTenant } from '@/lib/db/tenant'
import { stores } from '@/lib/db/schema'
import { decryptToken, encryptToken } from '@/lib/encryption'
import type { NewTransaction } from '@/lib/repositories/transaction.repository'
import { fetchOrders, refreshAccessToken } from './client'
import { mapShopeeOrder } from './order-mapper'
import { logger } from '@/lib/logging/logger'

type Store = typeof stores.$inferSelect

const FIFTEEN_DAYS_S = 15 * 24 * 60 * 60

// Shopee access tokens last ~4 hours while the cron runs less often, so refresh
// first when expired and persist the new pair before fetching.
async function ensureFreshToken(store: Store): Promise<string> {
  const now = Date.now()
  const expired = !store.tokenExpiresAt || store.tokenExpiresAt.getTime() <= now + 60_000
  if (!expired) return decryptToken(store.encryptedAccessToken!)

  const tokens = await refreshAccessToken(
    decryptToken(store.encryptedRefreshToken!),
    store.platformStoreId!
  )
  await withTenant(store.projectId, (tx) =>
    tx
      .update(stores)
      .set({
        encryptedAccessToken: encryptToken(tokens.accessToken),
        encryptedRefreshToken: encryptToken(tokens.refreshToken),
        tokenExpiresAt: new Date(now + tokens.expiresInSeconds * 1000),
      })
      .where(eq(stores.id, store.id))
  )
  logger.info({ storeId: store.id }, 'shopee token refreshed')
  return tokens.accessToken
}

export async function shopeeConnector(store: Store): Promise<NewTransaction[]> {
  if (!store.encryptedAccessToken || !store.encryptedRefreshToken || !store.platformStoreId) {
    return []
  }

  const accessToken = await ensureFreshToken(store)
  const timeTo = Math.floor(Date.now() / 1000)
  const lastSync = store.lastSyncedAt ? Math.floor(store.lastSyncedAt.getTime() / 1000) : 0
  const timeFrom = Math.max(lastSync, timeTo - FIFTEEN_DAYS_S)

  const orders = await fetchOrders(accessToken, store.platformStoreId, timeFrom, timeTo)
  return orders.map((order) =>
    mapShopeeOrder(order, {
      projectId: store.projectId,
      storeId: store.id,
      branchId: store.branchId,
    })
  )
}
