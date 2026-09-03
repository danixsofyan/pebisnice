import { and, eq, isNull, sql } from 'drizzle-orm'
import { inventory, inventoryMovements } from '@/lib/db/schema'
import type { Transaction } from '@/lib/db/tenant'
import type { InferSelectModel } from 'drizzle-orm'
import type { PlannedStockMovement } from '@/lib/domain/inventory/stock-movement'

export type InventoryBalance = InferSelectModel<typeof inventory>
export type InventoryMovement = InferSelectModel<typeof inventoryMovements>

export interface StockLocation {
  projectId: string
  branchId: string
  productVariantId: string
}

/**
 * Seluruh method menerima `tx` dari luar. Repository tidak pernah membuka
 * transaksinya sendiri supaya pemanggil bisa menggabungkan beberapa mutasi
 * dalam satu unit atomik, dan supaya unit test bisa menyuntikkan mock.
 */
export class InventoryRepository {
  /**
   * Mengunci baris saldo untuk mencegah race condition, membuatnya bila belum
   * ada. Mengembalikan saldo terkini.
   */
  async lockBalance(tx: Transaction, location: StockLocation): Promise<number> {
    const locked = await tx.execute<{ stock_qty: number }>(sql`
      SELECT stock_qty FROM inventory
      WHERE branch_id = ${location.branchId}
        AND product_variant_id = ${location.productVariantId}
        AND deleted_at IS NULL
      FOR UPDATE
    `)

    const rows = (locked as unknown as { rows?: Array<{ stock_qty: number }> }).rows ?? []
    if (rows[0]) return Number(rows[0].stock_qty)

    await tx
      .insert(inventory)
      .values({
        projectId: location.projectId,
        branchId: location.branchId,
        productVariantId: location.productVariantId,
        stockQty: 0,
      })
      .onConflictDoNothing()

    return 0
  }

  async setBalance(
    tx: Transaction,
    location: StockLocation,
    quantityAfter: number,
    actorId: string | null
  ): Promise<void> {
    await tx
      .update(inventory)
      .set({ stockQty: quantityAfter, updatedBy: actorId, updatedAt: new Date() })
      .where(
        and(
          eq(inventory.branchId, location.branchId),
          eq(inventory.productVariantId, location.productVariantId),
          isNull(inventory.deletedAt)
        )
      )
  }

  async appendMovement(
    tx: Transaction,
    location: StockLocation,
    plan: PlannedStockMovement,
    actorId: string | null
  ): Promise<void> {
    await tx.insert(inventoryMovements).values({
      projectId: location.projectId,
      branchId: location.branchId,
      productVariantId: location.productVariantId,
      movementType: plan.movementType,
      qty: plan.delta,
      quantityAfter: plan.quantityAfter,
      referenceId: plan.referenceId,
      note: plan.note,
      createdBy: actorId,
    })
  }

  /** Menjumlahkan ledger — dipakai untuk membuktikan saldo tidak melenceng. */
  async sumMovements(tx: Transaction, location: StockLocation): Promise<number> {
    const result = await tx.execute<{ total: string | null }>(sql`
      SELECT COALESCE(SUM(qty), 0) AS total FROM inventory_movements
      WHERE branch_id = ${location.branchId}
        AND product_variant_id = ${location.productVariantId}
    `)

    const rows = (result as unknown as { rows?: Array<{ total: string | null }> }).rows ?? []
    return Number(rows[0]?.total ?? 0)
  }
}

export const inventoryRepository = new InventoryRepository()
