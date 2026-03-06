import {
  pgTable,
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

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  plan: text('plan').default('free').notNull(),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  (account) => [{ compoundKey: [account.provider, account.providerAccountId] }]
)

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [{ compoundKey: [vt.identifier, vt.token] }]
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('projects_user_id_idx').on(t.userId)]
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
    tokenExpiresAt: timestamp('token_expires_at'),
    syncStatus: syncStatusEnum('sync_status').default('disconnected').notNull(),
    lastSyncedAt: timestamp('last_synced_at'),
    syncError: text('sync_error'),
    calcMethod: calcMethodEnum('calc_method'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('stores_project_id_idx').on(t.projectId)]
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('products_project_id_idx').on(t.projectId)]
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    platformVariantId: text('platform_variant_id'),
    skuVariant: text('sku_variant'),
    variantName: text('variant_name'),
    hpp: numeric('hpp', { precision: 15, scale: 2 }).default('0').notNull(),
    hppUpdatedAt: timestamp('hpp_updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('variants_product_id_idx').on(t.productId)]
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: text('order_id').notNull(),
    orderDate: timestamp('order_date').notNull(),
    settlementDate: timestamp('settlement_date'),
    status: orderStatusEnum('status').notNull(),
    grossAmount: numeric('gross_amount', { precision: 15, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 15, scale: 2 }).default('0').notNull(),
    netAmount: numeric('net_amount', { precision: 15, scale: 2 }).notNull(),
    totalFees: numeric('total_fees', { precision: 15, scale: 2 }).default('0').notNull(),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('tx_store_id_idx').on(t.storeId),
    index('tx_order_date_idx').on(t.orderDate),
    index('tx_settlement_date_idx').on(t.settlementDate),
    uniqueIndex('tx_store_order_unique').on(t.storeId, t.orderId),
  ]
)

export const transactionFees = pgTable(
  'transaction_fees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    feeType: feeTypeEnum('fee_type').notNull(),
    label: text('label').notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  },
  (t) => [index('fees_tx_id_idx').on(t.transactionId)]
)

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id),
    productName: text('product_name').notNull(),
    variantName: text('variant_name'),
    sku: text('sku'),
    qty: integer('qty').notNull(),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
    hppAtTime: numeric('hpp_at_time', { precision: 15, scale: 2 }).default('0').notNull(),
  },
  (t) => [index('items_tx_id_idx').on(t.transactionId)]
)

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  productVariantId: uuid('product_variant_id')
    .references(() => productVariants.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  stockQty: integer('stock_qty').default(0).notNull(),
  lastOpnameDate: timestamp('last_opname_date'),
  lastOpnameQty: integer('last_opname_qty'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    movementType: movementTypeEnum('movement_type').notNull(),
    qty: integer('qty').notNull(),
    referenceId: text('reference_id'),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('movements_variant_id_idx').on(t.productVariantId)]
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
    invitedAt: timestamp('invited_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
  },
  (t) => [
    index('team_project_id_idx').on(t.projectId),
    uniqueIndex('team_project_email_unique').on(t.projectId, t.email),
  ]
)

export const fileUploads = pgTable('file_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  mimeType: text('mime_type').notNull(),
  fileType: text('file_type').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  status: text('status').default('pending').notNull(),
  rowsTotal: integer('rows_total'),
  rowsProcessed: integer('rows_processed'),
  rowsFailed: integer('rows_failed'),
  errorDetails: jsonb('error_details'),
})

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id),
    projectId: uuid('project_id').references(() => projects.id),
    action: auditActionEnum('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_user_id_idx').on(t.userId),
    index('audit_project_id_idx').on(t.projectId),
    index('audit_created_at_idx').on(t.createdAt),
  ]
)
