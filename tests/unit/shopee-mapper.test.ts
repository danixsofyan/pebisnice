import { describe, expect, it } from 'vitest'
import { mapShopeeOrder, mapShopeeStatus } from '@/lib/integrations/shopee/order-mapper'

const store = { projectId: 'p1', storeId: 's1', branchId: 'b1' }

describe('Shopee status mapping', () => {
  it('maps terminal and in-flight states', () => {
    expect(mapShopeeStatus('COMPLETED')).toBe('completed')
    expect(mapShopeeStatus('CANCELLED')).toBe('cancelled')
    expect(mapShopeeStatus('TO_RETURN')).toBe('returned')
    expect(mapShopeeStatus('SHIPPED')).toBe('shipped')
    expect(mapShopeeStatus('READY_TO_SHIP')).toBe('processing')
    expect(mapShopeeStatus('UNPAID')).toBe('processing')
  })
})

describe('Shopee order mapping', () => {
  it('maps an order to a marketplace transaction', () => {
    const tx = mapShopeeOrder(
      {
        order_sn: '2409ABCXYZ',
        order_status: 'COMPLETED',
        create_time: 1700000000,
        total_amount: 150000,
      },
      store
    )
    expect(tx.orderId).toBe('2409ABCXYZ')
    expect(tx.channel).toBe('marketplace')
    expect(tx.status).toBe('completed')
    expect(tx.grossAmount).toBe('150000')
    expect(tx.storeId).toBe('s1')
    expect(tx.orderDate.toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })

  it('defaults amount to 0 when absent', () => {
    const tx = mapShopeeOrder({ order_sn: 'x', order_status: 'UNPAID', create_time: 1 }, store)
    expect(tx.grossAmount).toBe('0')
  })
})
