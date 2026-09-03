import { describe, expect, it } from 'vitest'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import { planProduction, type MaterialUsageInput } from '@/lib/domain/production/production-plan'

function material(overrides: Partial<MaterialUsageInput> = {}): MaterialUsageInput {
  return {
    productVariantId: 'm1',
    qty: 10,
    hppAtTime: fromDecimalString('5000.00'),
    ...overrides,
  }
}

describe('planProduction', () => {
  it('menjumlahkan biaya bahan dan membagi menjadi biaya per unit', () => {
    const plan = planProduction(5, [
      material({ qty: 10, hppAtTime: fromDecimalString('5000.00') }),
      material({ productVariantId: 'm2', qty: 2, hppAtTime: fromDecimalString('12500.00') }),
    ])

    expect(toDecimalString(plan.totalMaterialCost)).toBe('75000.00')
    expect(toDecimalString(plan.unitCost)).toBe('15000.00')
  })

  it('menyimpan biaya tiap bahan', () => {
    const plan = planProduction(1, [material({ qty: 3, hppAtTime: fromDecimalString('7500.00') })])

    expect(toDecimalString(plan.materials[0]!.costAmount)).toBe('22500.00')
  })

  it('membulatkan biaya per unit half-up', () => {
    // 100,00 / 3 = 33,3333 -> 33,33
    const turun = planProduction(3, [material({ qty: 1, hppAtTime: fromDecimalString('100.00') })])
    expect(toDecimalString(turun.unitCost)).toBe('33.33')

    // 0,05 / 2 = 0,025 -> 0,03
    const naik = planProduction(2, [material({ qty: 1, hppAtTime: fromDecimalString('0.05') })])
    expect(toDecimalString(naik.unitCost)).toBe('0.03')
  })

  it('mempertahankan total sebagai kebenaran meski unit cost dibulatkan', () => {
    const plan = planProduction(3, [material({ qty: 1, hppAtTime: fromDecimalString('100.00') })])

    expect(toDecimalString(plan.totalMaterialCost)).toBe('100.00')
    expect(plan.unitCost * 3n).not.toBe(plan.totalMaterialCost)
  })

  it('menerima bahan ber-HPP nol', () => {
    const plan = planProduction(1, [material({ hppAtTime: fromDecimalString('0.00') })])

    expect(toDecimalString(plan.totalMaterialCost)).toBe('0.00')
    expect(toDecimalString(plan.unitCost)).toBe('0.00')
  })

  it('menolak jumlah produksi tidak valid', () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(() => planProduction(quantity, [material()]), String(quantity)).toThrow(
        'Jumlah produksi harus bilangan bulat positif'
      )
    }
  })

  it('menolak produksi tanpa bahan', () => {
    expect(() => planProduction(1, [])).toThrow('minimal satu bahan')
  })

  it('menolak bahan duplikat', () => {
    expect(() =>
      planProduction(1, [
        material({ productVariantId: 'm1' }),
        material({ productVariantId: 'm1' }),
      ])
    ).toThrow('Bahan yang sama tidak boleh dicatat dua kali')
  })

  it('menolak jumlah bahan tidak valid', () => {
    for (const qty of [0, -1, 2.5]) {
      expect(() => planProduction(1, [material({ qty })]), String(qty)).toThrow(
        'Jumlah bahan harus bilangan bulat positif'
      )
    }
  })

  it('menolak HPP bahan negatif', () => {
    expect(() => planProduction(1, [material({ hppAtTime: fromDecimalString('-1.00') })])).toThrow(
      'HPP bahan tidak boleh negatif'
    )
  })
})
