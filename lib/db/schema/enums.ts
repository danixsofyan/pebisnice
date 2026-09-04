import { pgEnum } from 'drizzle-orm/pg-core'

export const platformEnum = pgEnum('platform', ['shopee', 'tiktok', 'tokopedia', 'lazada'])

export const orderStatusEnum = pgEnum('order_status', [
  'completed',
  'cancelled',
  'returned',
  'processing',
  'shipped',
])

export const calcMethodEnum = pgEnum('calc_method', ['income_based', 'order_based'])

// 'operator' is a legacy v1.0 role (data uploader); dropping a Postgres enum value is costly and its rows are still used, so it coexists with the new roles.
export const teamRoleEnum = pgEnum('team_role', [
  'owner',
  'admin',
  'manager',
  'finance',
  'cashier',
  'production',
  'operator',
])

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
  'transfer_out',
  'transfer_in',
  'purchase',
])

// Purchase order lifecycle: ordered -> received (goods in) or cancelled.
export const purchaseStatusEnum = pgEnum('purchase_status', ['ordered', 'received', 'cancelled'])

// Public (WhatsApp) order lifecycle: pending -> accepted (converted to a POS sale) or rejected.
export const onlineOrderStatusEnum = pgEnum('online_order_status', [
  'pending',
  'accepted',
  'rejected',
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

/** Sales source. marketplace is API/import-synced, pos is from the cashier. */
export const salesChannelEnum = pgEnum('sales_channel', ['marketplace', 'pos'])

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'transfer',
  'qris',
  'card',
  'other',
])

export const cashSessionStatusEnum = pgEnum('cash_session_status', ['open', 'closed'])

/** finished = sellable, material = used in production. */
export const productTypeEnum = pgEnum('product_type', ['finished', 'material'])

/** Subscription plan kind. Price and duration come from plan rows. */
export const planIntervalEnum = pgEnum('plan_interval', ['trial', 'monthly', 'yearly'])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'expired',
  'canceled',
])

/** Payment status, mapped from Midtrans transaction_status. */
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'expired',
  'canceled',
  'refunded',
])

export const expenseCategoryEnum = pgEnum('expense_category', [
  'rent',
  'salary',
  'utility',
  'marketing',
  'shipping',
  'supply',
  'tax',
  'other',
])

// Money in ('in' = credit/masuk) or out ('out' = debit/keluar) on a bank statement.
export const mutationDirectionEnum = pgEnum('mutation_direction', ['in', 'out'])

// movement_type also gains transfer_out/transfer_in via migration 0017 (ALTER TYPE ADD VALUE).

// How a mutation entered the system: statement import, an aggregator webhook, or hand-entered.
export const mutationSourceEnum = pgEnum('mutation_source', ['import', 'moota', 'manual'])
