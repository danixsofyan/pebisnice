import { and, asc, eq, isNull } from 'drizzle-orm'
import { inventory, productVariants, products } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { toDecimalString, type Money } from '@/lib/domain/money'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { checkPermission, requireBranchAccess, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { sanitizeText } from '@/lib/security/sanitizer'
import { logger } from '@/lib/logging/logger'
import { inspectImage } from '@/lib/domain/media/image'
import { deleteObject, putObject } from '@/lib/storage/object-store'
import { buildObjectKey, objectKeyBelongsToProject } from '@/lib/storage/object-key'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'

export type ProductType = 'finished' | 'material'

export interface CreateProductRequest {
  projectId: string
  branchId: string
  name: string
  type: ProductType
  sku: string | null
  variantName: string | null
  /** HPP awal. Hanya diterapkan bila pemanggil punya `cost:view`. */
  hpp: Money
  initialStock: number
  /** Kunci objek foto yang sudah diunggah lebih dulu. */
  imageKey: string | null
}

export interface UpdateProductRequest {
  projectId: string
  productId: string
  name: string
  type: ProductType
  sku: string | null
  variantName: string | null
  /** HPP baru. Hanya diterapkan bila pemanggil punya `cost:view`. */
  hpp: Money
  /** Kunci foto: sama seperti sebelumnya, kunci baru, atau null untuk menghapus. */
  imageKey: string | null
}

export interface CatalogContext {
  userId: string
  ip: string
  userAgent: string
}

export interface ProductListItem {
  productId: string
  variantId: string
  name: string
  type: ProductType
  sku: string | null
  variantName: string | null
  stockQty: number
  /** Hanya terisi untuk peran dengan `cost:view`. */
  hpp: string | null
  /** Kunci objek foto, atau null. Diubah jadi URL proxy di lapisan tampilan. */
  imageKey: string | null
}

export class CatalogService {
  /**
   * Membuat produk beserta satu varian dan stok awalnya.
   *
   * Semuanya dalam satu transaksi: produk tanpa varian tidak bisa dijual, dan
   * varian tanpa baris stok akan membuat POS gagal saat mengunci saldo.
   */
  async createProduct(request: CreateProductRequest, context: CatalogContext) {
    await requirePermission(request.projectId, context.userId, 'product:manage')
    await requireBranchAccess(request.projectId, context.userId, request.branchId)

    const canViewCost = await checkPermission(request.projectId, context.userId, COST_PERMISSION)

    const created = await withTenant(request.projectId, async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          projectId: request.projectId,
          name: sanitizeText(request.name),
          type: request.type,
          sku: request.sku ? sanitizeText(request.sku) : null,
          imageKey: request.imageKey,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning()

      const [variant] = await tx
        .insert(productVariants)
        .values({
          projectId: request.projectId,
          productId: product!.id,
          variantName: request.variantName ? sanitizeText(request.variantName) : null,
          skuVariant: request.sku ? sanitizeText(request.sku) : null,
          hpp: canViewCost ? toDecimalString(request.hpp) : '0',
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning()

      const location = {
        projectId: request.projectId,
        branchId: request.branchId,
        productVariantId: variant!.id,
      }

      await inventoryRepository.lockBalance(tx, location)

      if (request.initialStock > 0) {
        const plan = planStockMovement({ type: 'initial', qty: request.initialStock }, 0)
        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)
      }

      return { product: product!, variant: variant! }
    })

    await auditRepository.log({
      action: 'create',
      resource: 'product',
      resourceId: created.product.id,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { name: created.product.name, type: request.type },
    })

    logger.info({ projectId: request.projectId, productId: created.product.id }, 'Product created')

    return created
  }

  /**
   * Menyimpan foto produk ke bucket privat dan mengembalikan kunci objeknya.
   *
   * Terpisah dari `createProduct` supaya bisa dipakai ulang saat mengganti foto
   * dan supaya form bisa mengunggah lebih dulu lalu menyertakan kunci saat
   * menyimpan. Jenis berkas diperiksa dari byte, bukan dari yang diklaim klien.
   */
  async uploadProductImage(
    projectId: string,
    userId: string,
    bytes: Uint8Array
  ): Promise<{ key: string }> {
    await requirePermission(projectId, userId, 'product:manage')

    const check = inspectImage(bytes)
    if (!check.ok) {
      throw new ValidationError(check.reason)
    }

    const key = buildObjectKey({
      projectId,
      resource: 'products',
      id: crypto.randomUUID(),
      ext: check.kind.ext,
    })

    await putObject(key, Buffer.from(bytes), { contentType: check.kind.mime })
    logger.info({ projectId, key }, 'product image uploaded')

    return { key }
  }

  /**
   * Menghapus foto yang sudah terunggah tetapi produknya belum tersimpan —
   * dipanggil saat pengguna mengganti pilihan atau membatalkan form.
   *
   * Menolak dua hal demi keamanan: kunci milik project lain, dan kunci yang
   * ternyata masih dirujuk sebuah produk (agar tidak menghapus foto tersimpan).
   */
  async discardUnsavedImage(projectId: string, userId: string, key: string): Promise<void> {
    await requirePermission(projectId, userId, 'product:manage')

    if (!objectKeyBelongsToProject(key, projectId)) {
      throw new ValidationError('Kunci berkas tidak sah')
    }

    const referenced = await withTenant(projectId, (tx) =>
      tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.projectId, projectId), eq(products.imageKey, key)))
        .limit(1)
    )
    if (referenced.length > 0) {
      // Sudah dipakai produk — bukan yatim, jangan disentuh.
      return
    }

    await deleteObject(key)
  }

  /**
   * Memperbarui produk beserta variannya.
   *
   * Foto lama dihapus segera bila diganti atau dikosongkan — kuncinya diketahui,
   * jadi tak perlu menunggu cron. HPP hanya disentuh oleh peran ber-`cost:view`;
   * bila tidak, kolomnya dibiarkan apa adanya.
   */
  async updateProduct(request: UpdateProductRequest, context: CatalogContext): Promise<void> {
    await requirePermission(request.projectId, context.userId, 'product:manage')
    const canViewCost = await checkPermission(request.projectId, context.userId, COST_PERMISSION)

    const existing = await withTenant(request.projectId, (tx) =>
      tx
        .select({ id: products.id, imageKey: products.imageKey })
        .from(products)
        .where(
          and(
            eq(products.id, request.productId),
            eq(products.projectId, request.projectId),
            isNull(products.deletedAt)
          )
        )
        .limit(1)
    )

    const current = existing[0]
    if (!current) throw new NotFoundError('Produk tidak ditemukan')

    await withTenant(request.projectId, async (tx) => {
      await tx
        .update(products)
        .set({
          name: sanitizeText(request.name),
          type: request.type,
          sku: request.sku ? sanitizeText(request.sku) : null,
          imageKey: request.imageKey,
          updatedBy: context.userId,
        })
        .where(and(eq(products.id, request.productId), eq(products.projectId, request.projectId)))

      await tx
        .update(productVariants)
        .set({
          variantName: request.variantName ? sanitizeText(request.variantName) : null,
          skuVariant: request.sku ? sanitizeText(request.sku) : null,
          ...(canViewCost ? { hpp: toDecimalString(request.hpp) } : {}),
          updatedBy: context.userId,
        })
        .where(
          and(
            eq(productVariants.productId, request.productId),
            eq(productVariants.projectId, request.projectId)
          )
        )
    })

    // Di luar transaksi: gagal menghapus objek tidak boleh menggagalkan
    // penyimpanan; paling buruk objek jadi yatim dan disapu cron.
    if (current.imageKey && current.imageKey !== request.imageKey) {
      try {
        await deleteObject(current.imageKey)
      } catch (error) {
        logger.warn(
          { projectId: request.projectId, key: current.imageKey, err: String(error) },
          'gagal menghapus foto lama, dibiarkan untuk cron'
        )
      }
    }

    await auditRepository.log({
      action: 'update',
      resource: 'product',
      resourceId: request.productId,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { name: request.name },
    })

    logger.info({ projectId: request.projectId, productId: request.productId }, 'Product updated')
  }

  /**
   * Daftar produk beserta stok cabang. Kolom HPP hanya ikut untuk peran yang
   * berhak — pola yang sama dengan `productRepository`.
   */
  async list(projectId: string, branchId: string, userId: string): Promise<ProductListItem[]> {
    await requirePermission(projectId, userId, 'project:view')

    const canViewCost = await checkPermission(projectId, userId, COST_PERMISSION)

    const rows = await withTenant(projectId, (tx) =>
      tx
        .select({
          productId: products.id,
          variantId: productVariants.id,
          name: products.name,
          type: products.type,
          sku: productVariants.skuVariant,
          variantName: productVariants.variantName,
          stockQty: inventory.stockQty,
          hpp: productVariants.hpp,
          imageKey: products.imageKey,
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
            isNull(productVariants.deletedAt),
            isNull(products.deletedAt)
          )
        )
        .orderBy(asc(products.name))
    )

    return rows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      name: row.name,
      type: row.type,
      sku: row.sku,
      variantName: row.variantName,
      stockQty: row.stockQty ?? 0,
      hpp: canViewCost ? row.hpp : null,
      imageKey: row.imageKey,
    }))
  }
}

export const catalogService = new CatalogService()
