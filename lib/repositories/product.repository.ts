import { and, eq, isNull } from 'drizzle-orm'
import { productVariants } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import type {
  VariantView,
  VariantWithCost,
  VariantWithoutCost,
} from '@/lib/domain/catalog/variant-view'

/**
 * Bentuk select tanpa kolom biaya. Ini yang dipakai untuk peran tanpa
 * `cost:view` — HPP tidak ikut dibaca dari database sama sekali.
 */
const VARIANT_COLUMNS_WITHOUT_COST = {
  id: productVariants.id,
  projectId: productVariants.projectId,
  productId: productVariants.productId,
  skuVariant: productVariants.skuVariant,
  variantName: productVariants.variantName,
} as const

const VARIANT_COLUMNS_WITH_COST = {
  ...VARIANT_COLUMNS_WITHOUT_COST,
  hpp: productVariants.hpp,
  hppUpdatedAt: productVariants.hppUpdatedAt,
} as const

export class ProductRepository {
  /**
   * `includeCost` tidak boleh berasal dari input pemanggil luar — hanya
   * service yang menentukannya dari hasil pengecekan permission.
   */
  async findVariantsByProduct(
    projectId: string,
    productId: string,
    includeCost: boolean
  ): Promise<VariantView[]> {
    return withTenant(projectId, async (tx) => {
      const where = and(
        eq(productVariants.productId, productId),
        eq(productVariants.projectId, projectId),
        isNull(productVariants.deletedAt)
      )

      if (includeCost) {
        return tx.select(VARIANT_COLUMNS_WITH_COST).from(productVariants).where(where)
      }

      return tx.select(VARIANT_COLUMNS_WITHOUT_COST).from(productVariants).where(where)
    })
  }

  async findVariantWithCost(projectId: string, variantId: string): Promise<VariantWithCost | null> {
    const rows = await withTenant(projectId, (tx) =>
      tx
        .select(VARIANT_COLUMNS_WITH_COST)
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(productVariants.projectId, projectId),
            isNull(productVariants.deletedAt)
          )
        )
        .limit(1)
    )

    return rows[0] ?? null
  }
}

export const productRepository = new ProductRepository()

export type { VariantView, VariantWithCost, VariantWithoutCost }
