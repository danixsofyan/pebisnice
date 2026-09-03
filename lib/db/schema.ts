import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const platformEnum = pgEnum('platform', ['shopee', 'tiktok', 'tokopedia', 'lazada'])
export const orderStatusEnum = pgEnum('order_status', [
  'completed',
  'cancelled',
  'returned',
  'processing',
  'shipped',
])
export const calcMethodEnum = pgEnum('calc_method', ['income_based', 'order_based'])
export const teamRoleEnum = pgEnum('team_role', ['owner', 'admin', 'finance', 'operator'])
export const teamStatusEnum = pgEnum('team_status', ['active', 'invited', 'disabled'])
export const syncStatusEnum = pgEnum('sync_status', [
  'connected',
  'syncing',
  'error',
  'disconnected',
])
export const movementTypeEnum = pgEnum('movement_type', [
  'sale',
  'return',
  'cancellation',
  'adjustment',
  'opname',
  'initial',
])
export const feeTypeEnum = pgEnum('fee_type', [
  'commission',
  'service_fee',
  'payment_fee',
  'free_shipping',
  'ams',
  'voucher',
  'coin_cashback',
  'adjustment',
  'other',
])
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'sync',
  'invite',
])

const money = (name: string) => numeric(name, { precision: 18, scale: 2 })
const tz = (name: string) => timestamp(name, { withTimezone: true })

// Kolom wajib untuk tabel bisnis (docs/db-standards.md §3). Tabel ledger yang
// immutable (inventory_movements, audit_logs) sengaja tidak memakainya.
const lifecycleColumns = {
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  deletedAt: tz('deleted_at'),
}

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: tz('emailVerified'),
  image: text('image'),
  plan: text('plan').default('free').notNull(),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index('accounts_user_id_idx').on(account.userId),
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: tz('expires').notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)]
)

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: tz('expires').notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    currency: varchar('currency', { length: 3 }).default('IDR').notNull(),
    timezone: text('timezone').default('Asia/Jakarta').notNull(),
    defaultCalcMethod: calcMethodEnum('default_calc_method').default('income_based').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('projects_user_id_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('projects_created_by_idx').on(t.createdBy),
    index('projects_updated_by_idx').on(t.updatedBy),
  ]
)

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
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
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('stores_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('stores_created_by_idx').on(t.createdBy),
    index('stores_updated_by_idx').on(t.updatedBy),
    uniqueIndex('stores_platform_store_unique')
      .on(t.projectId, t.platform, t.platformStoreId)
      .where(sql`${t.deletedAt} is null and ${t.platformStoreId} is not null`),
  ]
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    platformProductId: text('platform_product_id'),
    platform: platformEnum('platform'),
    sku: text('sku'),
    name: text('name').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('products_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('products_created_by_idx').on(t.createdBy),
    index('products_updated_by_idx').on(t.updatedBy),
    uniqueIndex('products_project_sku_unique')
      .on(t.projectId, t.sku)
      .where(sql`${t.deletedAt} is null and ${t.sku} is not null`),
  ]
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    platformVariantId: text('platform_variant_id'),
    skuVariant: text('sku_variant'),
    variantName: text('variant_name'),
    hpp: money('hpp').default('0').notNull(),
    hppUpdatedAt: tz('hpp_updated_at').defaultNow(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('variants_product_id_idx')
      .on(t.productId)
      .where(sql`${t.deletedAt} is null`),
    index('variants_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('variants_created_by_idx').on(t.createdBy),
    index('variants_updated_by_idx').on(t.updatedBy),
  ]
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: text('order_id').notNull(),
    orderDate: tz('order_date').notNull(),
    settlementDate: tz('settlement_date'),
    status: orderStatusEnum('status').notNull(),
    grossAmount: money('gross_amount').notNull(),
    discountAmount: money('discount_amount').default('0').notNull(),
    netAmount: money('net_amount').notNull(),
    totalFees: money('total_fees').default('0').notNull(),
    rawData: jsonb('raw_data'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('tx_store_id_idx')
      .on(t.storeId)
      .where(sql`${t.deletedAt} is null`),
    index('tx_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('tx_order_date_idx').on(t.orderDate.desc()),
    index('tx_settlement_date_idx').on(t.settlementDate.desc()),
    index('tx_created_by_idx').on(t.createdBy),
    index('tx_updated_by_idx').on(t.updatedBy),
    uniqueIndex('tx_store_order_unique')
      .on(t.storeId, t.orderId)
      .where(sql`${t.deletedAt} is null`),
  ]
)

export const transactionFees = pgTable(
  'transaction_fees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    feeType: feeTypeEnum('fee_type').notNull(),
    label: text('label').notNull(),
    amount: money('amount').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [index('fees_tx_id_idx').on(t.transactionId), index('fees_project_id_idx').on(t.projectId)]
)

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    variantName: text('variant_name'),
    sku: text('sku'),
    qty: integer('qty').notNull(),
    unitPrice: money('unit_price').notNull(),
    hppAtTime: money('hpp_at_time').default('0').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('items_tx_id_idx').on(t.transactionId),
    index('items_project_id_idx').on(t.projectId),
    index('items_variant_id_idx').on(t.productVariantId),
  ]
)

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    stockQty: integer('stock_qty').default(0).notNull(),
    lastOpnameDate: tz('last_opname_date'),
    lastOpnameQty: integer('last_opname_qty'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('inventory_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('inventory_created_by_idx').on(t.createdBy),
    index('inventory_updated_by_idx').on(t.updatedBy),
    uniqueIndex('inventory_variant_unique')
      .on(t.productVariantId)
      .where(sql`${t.deletedAt} is null`),
  ]
)

// Append-only. Trigger fn_prevent_mutation() menolak UPDATE dan DELETE.
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    movementType: movementTypeEnum('movement_type').notNull(),
    qty: integer('qty').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    referenceId: text('reference_id'),
    note: text('note'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('movements_variant_id_idx').on(t.productVariantId),
    index('movements_project_id_idx').on(t.projectId),
    index('movements_created_by_idx').on(t.createdBy),
    index('movements_created_at_idx').on(t.createdAt.desc()),
  ]
)

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: teamRoleEnum('role').default('operator').notNull(),
    status: teamStatusEnum('status').default('invited').notNull(),
    inviteToken: text('invite_token'),
    invitedAt: tz('invited_at').defaultNow().notNull(),
    acceptedAt: tz('accepted_at'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('team_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('team_user_id_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('team_created_by_idx').on(t.createdBy),
    index('team_updated_by_idx').on(t.updatedBy),
    uniqueIndex('team_project_email_unique')
      .on(t.projectId, t.email)
      .where(sql`${t.deletedAt} is null`),
  ]
)

export const fileUploads = pgTable(
  'file_uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    fileType: text('file_type').notNull(),
    uploadedAt: tz('uploaded_at').defaultNow().notNull(),
    processedAt: tz('processed_at'),
    status: text('status').default('pending').notNull(),
    rowsTotal: integer('rows_total'),
    rowsProcessed: integer('rows_processed'),
    rowsFailed: integer('rows_failed'),
    errorDetails: jsonb('error_details'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('uploads_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('uploads_store_id_idx')
      .on(t.storeId)
      .where(sql`${t.deletedAt} is null`),
    index('uploads_user_id_idx').on(t.userId),
    index('uploads_created_by_idx').on(t.createdBy),
    index('uploads_updated_by_idx').on(t.updatedBy),
  ]
)

// Immutable. Trigger fn_prevent_mutation() menolak UPDATE dan DELETE.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    action: auditActionEnum('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_user_id_idx').on(t.userId),
    index('audit_project_id_idx').on(t.projectId),
    index('audit_created_at_idx').on(t.createdAt.desc()),
  ]
)
