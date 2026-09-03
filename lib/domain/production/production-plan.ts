import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, multiplyByQty, sumMoney, type Money } from '@/lib/domain/money'

export interface MaterialUsageInput {
  productVariantId: string
  qty: number
  /** Snapshot HPP bahan. Diambil server, tidak pernah dari client. */
  hppAtTime: Money
}

export interface PlannedMaterial extends MaterialUsageInput {
  costAmount: Money
}

export interface ProductionPlan {
  quantity: number
  materials: PlannedMaterial[]
  totalMaterialCost: Money
  /** Biaya per unit produk jadi, dibulatkan half-up ke sen terdekat. */
  unitCost: Money
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Jumlah produksi harus bilangan bulat positif', {
      quantity: ['Harus bilangan bulat positif'],
    })
  }
}

function assertMaterials(materials: readonly MaterialUsageInput[]): void {
  if (materials.length === 0) {
    throw new ValidationError('Produksi harus memakai minimal satu bahan', {
      materials: ['Minimal satu bahan'],
    })
  }

  const seen = new Set<string>()
  for (const material of materials) {
    if (seen.has(material.productVariantId)) {
      throw new ValidationError('Bahan yang sama tidak boleh dicatat dua kali', {
        materials: ['Terdapat bahan duplikat'],
      })
    }
    seen.add(material.productVariantId)

    if (!Number.isInteger(material.qty) || material.qty <= 0) {
      throw new ValidationError('Jumlah bahan harus bilangan bulat positif', {
        qty: ['Harus bilangan bulat positif'],
      })
    }
    if (material.hppAtTime < ZERO) {
      throw new ValidationError('HPP bahan tidak boleh negatif', {
        hppAtTime: ['Tidak boleh negatif'],
      })
    }
  }
}

/** Pembagian bigint dengan pembulatan half-up. */
function divideRounded(total: Money, divisor: number): Money {
  const denominator = BigInt(divisor)
  const quotient = total / denominator
  const remainder = total % denominator

  return remainder * 2n >= denominator ? quotient + 1n : quotient
}

/**
 * Menghitung biaya satu proses produksi tanpa menyentuh database.
 *
 * `unitCost` dibulatkan, sehingga `unitCost * quantity` bisa berbeda beberapa
 * sen dari `totalMaterialCost`. Yang disimpan sebagai kebenaran adalah
 * `totalMaterialCost`; `unitCost` hanya untuk memperbarui HPP produk jadi.
 */
export function planProduction(
  quantity: number,
  materials: readonly MaterialUsageInput[]
): ProductionPlan {
  assertQuantity(quantity)
  assertMaterials(materials)

  const planned: PlannedMaterial[] = materials.map((material) => ({
    ...material,
    costAmount: multiplyByQty(material.hppAtTime, material.qty),
  }))

  const totalMaterialCost = sumMoney(planned.map((material) => material.costAmount))

  return {
    quantity,
    materials: planned,
    totalMaterialCost,
    unitCost: divideRounded(totalMaterialCost, quantity),
  }
}
