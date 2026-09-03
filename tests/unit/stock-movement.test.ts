import { describe, expect, it } from 'vitest'
import {
  InsufficientStockError,
  planStockMovement,
  reconcileBalance,
} from '@/lib/domain/inventory/stock-movement'

describe('planStockMovement', () => {
  it('mengurangi stok untuk penjualan', () => {
    const plan = planStockMovement({ type: 'sale', qty: 3, referenceId: 'ORD-1' }, 10)

    expect(plan).toEqual({
      movementType: 'sale',
      delta: -3,
      quantityAfter: 7,
      note: null,
      referenceId: 'ORD-1',
    })
  })

  it('menambah stok untuk retur dan pembatalan', () => {
    expect(planStockMovement({ type: 'return', qty: 2 }, 5).quantityAfter).toBe(7)
    expect(planStockMovement({ type: 'cancellation', qty: 4 }, 5).quantityAfter).toBe(9)
  })

  it('menolak penjualan yang membuat stok negatif', () => {
    expect(() => planStockMovement({ type: 'sale', qty: 11 }, 10)).toThrow(InsufficientStockError)
    expect(() => planStockMovement({ type: 'sale', qty: 1 }, 0)).toThrow(
      'Stok tidak mencukupi: tersedia 0, diminta 1'
    )
  })

  it('mengizinkan penjualan yang menghabiskan stok tepat', () => {
    expect(planStockMovement({ type: 'sale', qty: 10 }, 10).quantityAfter).toBe(0)
  })

  it('memakai delta bertanda untuk penyesuaian dan menyimpan alasannya', () => {
    const plan = planStockMovement({ type: 'adjustment', delta: -2, reason: '  rusak  ' }, 5)

    expect(plan.delta).toBe(-2)
    expect(plan.quantityAfter).toBe(3)
    expect(plan.note).toBe('rusak')
  })

  it('mewajibkan alasan pada penyesuaian dan opname', () => {
    expect(() => planStockMovement({ type: 'adjustment', delta: 1, reason: '   ' }, 5)).toThrow(
      'Alasan wajib diisi'
    )
    expect(() => planStockMovement({ type: 'opname', countedQty: 5, reason: '' }, 5)).toThrow(
      'Alasan wajib diisi'
    )
  })

  it('menolak penyesuaian bernilai nol', () => {
    expect(() => planStockMovement({ type: 'adjustment', delta: 0, reason: 'cek' }, 5)).toThrow(
      'Delta penyesuaian tidak boleh nol'
    )
  })

  it('menghitung selisih opname terhadap saldo sistem', () => {
    expect(planStockMovement({ type: 'opname', countedQty: 8, reason: 'opname' }, 10).delta).toBe(
      -2
    )
    expect(planStockMovement({ type: 'opname', countedQty: 12, reason: 'opname' }, 10).delta).toBe(
      2
    )
    expect(planStockMovement({ type: 'opname', countedQty: 0, reason: 'opname' }, 10).delta).toBe(
      -10
    )
  })

  it('menjadikan initial idempoten terhadap saldo yang sudah ada', () => {
    expect(planStockMovement({ type: 'initial', qty: 50 }, 0).quantityAfter).toBe(50)
    expect(planStockMovement({ type: 'initial', qty: 50 }, 50).delta).toBe(0)
  })

  it('menolak qty yang bukan bilangan bulat positif', () => {
    expect(() => planStockMovement({ type: 'sale', qty: 0 }, 10)).toThrow('qty harus bilangan')
    expect(() => planStockMovement({ type: 'sale', qty: -1 }, 10)).toThrow('qty harus bilangan')
    expect(() => planStockMovement({ type: 'sale', qty: 1.5 }, 10)).toThrow('qty harus bilangan')
  })

  it('menolak saldo awal yang tidak valid', () => {
    expect(() => planStockMovement({ type: 'sale', qty: 1 }, -1)).toThrow('currentQty harus')
    expect(() => planStockMovement({ type: 'sale', qty: 1 }, 1.5)).toThrow('currentQty harus')
  })
})

describe('reconcileBalance', () => {
  it('menjumlahkan seluruh mutasi menjadi saldo', () => {
    expect(reconcileBalance([{ qty: 50 }, { qty: -3 }, { qty: 2 }, { qty: -10 }])).toBe(39)
    expect(reconcileBalance([])).toBe(0)
  })

  it('sepakat dengan rangkaian planStockMovement', () => {
    const commands = [
      { type: 'initial', qty: 100 },
      { type: 'sale', qty: 30 },
      { type: 'return', qty: 5 },
      { type: 'adjustment', delta: -2, reason: 'rusak' },
      { type: 'opname', countedQty: 70, reason: 'opname bulanan' },
    ] as const

    let balance = 0
    const movements: Array<{ qty: number }> = []

    for (const command of commands) {
      const plan = planStockMovement(command, balance)
      balance = plan.quantityAfter
      movements.push({ qty: plan.delta })
    }

    expect(balance).toBe(70)
    expect(reconcileBalance(movements)).toBe(balance)
  })
})
