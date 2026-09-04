import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { inventory, productVariants, products } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'

// Items a cashier can pick. No cost column at all, since the POS screen is used by the cashier role without cost:view; HPP for COGS is fetched separately server-side when the sale is saved.
export interface SellableItem {
  productVariantId: string
  productName: string
  variantName: string | null
  sku: string | null
  stockQty: number
}

export class PosCatalogRepository {
  async search(
    projectId: string,
    branchId: string,
    keyword: string,
    limit = 50
  ): Promise<SellableItem[]> {
    const pattern = `%${keyword.trim()}%`

    return withTenant(projectId, (tx) =>
      tx
        .select({
          productVariantId: productVariants.id,
          productName: products.name,
          variantName: productVariants.variantName,
          sku: productVariants.skuVariant,
          stockQty: sql<number>`coalesce(${inventory.stockQty}, 0)`,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .leftJoin(
          inventory,
          and(
            eq(inventory.productVariantId, productVariants.id),
            eq(inventory.branchId, branchId),
            isNull(inventory.deletedAt)
          )
        )
        .where(
          and(
            eq(productVariants.projectId, projectId),
            eq(products.type, 'finished'),
            eq(products.isArchived, false),
            isNull(productVariants.deletedAt),
            isNull(products.deletedAt),
            keyword.trim().length === 0
              ? undefined
              : or(
                  ilike(products.name, pattern),
                  ilike(productVariants.variantName, pattern),
                  ilike(productVariants.skuVariant, pattern)
                )
          )
        )
        .orderBy(asc(products.name), asc(productVariants.variantName))
        .limit(limit)
    )
  }
}

export const posCatalogRepository = new PosCatalogRepository()
