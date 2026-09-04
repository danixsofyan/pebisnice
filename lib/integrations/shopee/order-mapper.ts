import type { NewTransaction } from '@/lib/repositories/transaction.repository'

type OrderStatus = NewTransaction['status']

export interface ShopeeOrder {
  order_sn: string
  order_status: string
  create_time: number
  total_amount?: number | string
  currency?: string
}

export interface StoreRef {
  projectId: string
  storeId: string
  branchId: string | null
}

// Map a Shopee order_status to our internal status. Anything in-flight is
// treated as processing so it isn't miscounted as a completed sale.
export function mapShopeeStatus(status: string): OrderStatus {
  switch (status) {
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
    case 'IN_CANCEL':
      return 'cancelled'
    case 'TO_RETURN':
      return 'returned'
    case 'SHIPPED':
    case 'TO_CONFIRM_RECEIVE':
      return 'shipped'
    default:
      return 'processing'
  }
}

// Map a Shopee order to a transaction row. Fees and line items need the escrow
// and item APIs and are added later; grossAmount is the order total, and the
// raw order is kept for audit.
export function mapShopeeOrder(order: ShopeeOrder, store: StoreRef): NewTransaction {
  const total = order.total_amount != null ? String(order.total_amount) : '0'
  return {
    projectId: store.projectId,
    storeId: store.storeId,
    branchId: store.branchId,
    channel: 'marketplace',
    orderId: order.order_sn,
    orderDate: new Date(order.create_time * 1000),
    status: mapShopeeStatus(order.order_status),
    grossAmount: total,
    netAmount: total,
    rawData: order as unknown as Record<string, unknown>,
  }
}
