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

// `operator` dipertahankan sebagai peran warisan v1.0 (pengunggah data).
// Menghapus nilai enum Postgres mahal dan berisiko, sementara barisnya masih
// dipakai — jadi dibiarkan hidup berdampingan dengan peran baru.
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

/** Sumber penjualan. `marketplace` disinkron API/import, `pos` dari kasir. */
export const salesChannelEnum = pgEnum('sales_channel', ['marketplace', 'pos'])

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'transfer',
  'qris',
  'card',
  'other',
])

export const cashSessionStatusEnum = pgEnum('cash_session_status', ['open', 'closed'])
