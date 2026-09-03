import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { actorColumns, tenantColumn } from './columns'
import { calcMethodEnum, platformEnum, syncStatusEnum } from './enums'
import { lifecycleColumns, tz } from './primitives'

/** Akun marketplace yang tertaut ke sebuah project. */
export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    platform: platformEnum('platform').notNull(),
    storeName: text('store_name').notNull(),
    platformStoreId: text('platform_store_id'),
    encryptedAccessToken: text('encrypted_access_token'),
    encryptedRefreshToken: text('encrypted_refresh_token'),
    tokenExpiresAt: tz('token_expires_at'),
    syncStatus: syncStatusEnum('sync_status').default('disconnected').notNull(),
    lastSyncedAt: tz('last_synced_at'),
    syncError: text('sync_error'),
    calcMethod: calcMethodEnum('calc_method'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('stores_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('stores_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('stores_created_by_idx').on(t.createdBy),
    index('stores_updated_by_idx').on(t.updatedBy),
    uniqueIndex('stores_platform_store_unique')
      .on(t.projectId, t.platform, t.platformStoreId)
      .where(sql`${t.deletedAt} is null and ${t.platformStoreId} is not null`),
  ]
)
