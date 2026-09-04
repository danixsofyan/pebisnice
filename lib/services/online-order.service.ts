import { randomBytes } from 'node:crypto'
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import {
  branches,
  inventory,
  onlineOrderItems,
  onlineOrders,
  orderLinks,
  productVariants,
  products,
  projects,
  transactions,
} from '@/lib/db/schema'
import { db } from '@/lib/db'
import { withTenant } from '@/lib/db/tenant'
import { decryptToken, encryptToken } from '@/lib/encryption'
import { fromDecimalString, toDecimalString, ZERO } from '@/lib/domain/money'
import { posService } from '@/lib/services/pos.service'
import type { PaymentMethod } from '@/lib/repositories/pos.repository'
import { customerService } from '@/lib/services/customer.service'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const MAX_ITEMS = 50
const MAX_QTY = 1000

export interface OrderContext {
  userId: string
  ip: string
  userAgent: string
}

export interface PublicMenu {
  projectName: string
  branchName: string
  waNumber: string | null
  products: Array<{ variantId: string; name: string; price: string; stockQty: number }>
}

export class OnlineOrderService {
  // Resolve a public short slug to its project/branch. order_links is app_full_access, so this
  // works before any tenant is set (the whole point of the short link).
  async resolveLink(slug: string): Promise<{ projectId: string; branchId: string } | null> {
    const [row] = await db
      .select({ projectId: orderLinks.projectId, branchId: orderLinks.branchId })
      .from(orderLinks)
      .where(eq(orderLinks.slug, slug))
      .limit(1)
    return row ?? null
  }

  // The branch's short order slug, creating one on first use. Gated pos:operate.
  async getOrCreateLink(projectId: string, userId: string, branchId: string): Promise<string> {
    await requirePermission(projectId, userId, 'pos:operate')
    const [existing] = await db
      .select({ slug: orderLinks.slug })
      .from(orderLinks)
      .where(eq(orderLinks.branchId, branchId))
      .limit(1)
    if (existing) return existing.slug

    const slug = randomBytes(5).toString('hex')
    const [row] = await db
      .insert(orderLinks)
      .values({ slug, projectId, branchId })
      .onConflictDoNothing({ target: orderLinks.branchId })
      .returning({ slug: orderLinks.slug })
    if (row) return row.slug
    // Lost a race: another request created it first.
    const [now] = await db
      .select({ slug: orderLinks.slug })
      .from(orderLinks)
      .where(eq(orderLinks.branchId, branchId))
      .limit(1)
    return now!.slug
  }

  // Existing order-link slugs for a project, keyed by branch, for the settings screen.
  async listLinks(projectId: string, userId: string): Promise<Record<string, string>> {
    await requirePermission(projectId, userId, 'pos:operate')
    const rows = await db
      .select({ branchId: orderLinks.branchId, slug: orderLinks.slug })
      .from(orderLinks)
      .where(eq(orderLinks.projectId, projectId))
    return Object.fromEntries(rows.map((r) => [r.branchId, r.slug]))
  }

  // Public catalog for the order link: sellable finished goods (price and stock > 0). No auth;
  // the project is taken from the link, and the branch is verified to belong to it.
  async publicMenu(projectId: string, branchId: string): Promise<PublicMenu> {
    return withTenant(projectId, async (tx) => {
      const [project] = await tx
        .select({ name: projects.name, waNumber: projects.waNumber })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
      if (!project) throw new NotFoundError('Toko tidak ditemukan')

      const [branch] = await tx
        .select({ name: branches.name })
        .from(branches)
        .where(
          and(
            eq(branches.id, branchId),
            eq(branches.projectId, projectId),
            isNull(branches.deletedAt)
          )
        )
        .limit(1)
      if (!branch) throw new NotFoundError('Cabang tidak ditemukan')

      const rows = await tx
        .select({
          variantId: productVariants.id,
          productName: products.name,
          variantName: productVariants.variantName,
          price: productVariants.price,
          stockQty: inventory.stockQty,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .innerJoin(
          inventory,
          and(eq(inventory.productVariantId, productVariants.id), eq(inventory.branchId, branchId))
        )
        .where(
          and(
            eq(productVariants.projectId, projectId),
            eq(products.type, 'finished'),
            isNull(productVariants.deletedAt),
            isNull(products.deletedAt),
            gt(productVariants.price, '0'),
            gt(inventory.stockQty, 0)
          )
        )
        .orderBy(products.name)

      return {
        projectName: project.name,
        branchName: branch.name,
        waNumber: project.waNumber,
        products: rows.map((r) => ({
          variantId: r.variantId,
          name: r.variantName ? `${r.productName} · ${r.variantName}` : r.productName,
          price: r.price,
          stockQty: r.stockQty ?? 0,
        })),
      }
    })
  }

  // Place a pending order from the public link. No auth; prices are re-read server-side so a
  // tampered client can't set them. Holds no stock until staff accept it.
  async placeOrder(
    projectId: string,
    branchId: string,
    input: {
      customerName: string
      customerPhone: string | null
      note: string | null
      items: Array<{ variantId: string; qty: number }>
    }
  ): Promise<{ id: string }> {
    if (!input.customerName.trim()) throw new ValidationError('Nama wajib diisi')
    if (input.items.length === 0 || input.items.length > MAX_ITEMS) {
      throw new ValidationError('Jumlah item pesanan tidak valid')
    }
    for (const i of input.items) {
      if (!Number.isInteger(i.qty) || i.qty <= 0 || i.qty > MAX_QTY) {
        throw new ValidationError('Qty tidak valid')
      }
    }

    const created = await withTenant(projectId, async (tx) => {
      const [branch] = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, branchId),
            eq(branches.projectId, projectId),
            isNull(branches.deletedAt)
          )
        )
        .limit(1)
      if (!branch) throw new NotFoundError('Cabang tidak ditemukan')

      const variantIds = input.items.map((i) => i.variantId)
      const priced = await tx
        .select({
          id: productVariants.id,
          productName: products.name,
          variantName: productVariants.variantName,
          price: productVariants.price,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(productVariants.projectId, projectId),
            inArray(productVariants.id, variantIds),
            isNull(productVariants.deletedAt)
          )
        )
      const byId = new Map(priced.map((p) => [p.id, p]))

      let total = ZERO
      const lines = input.items.map((i) => {
        const p = byId.get(i.variantId)
        if (!p) throw new ValidationError('Produk tidak tersedia')
        total += fromDecimalString(p.price) * BigInt(i.qty)
        return {
          productVariantId: i.variantId,
          productName: p.variantName ? `${p.productName} · ${p.variantName}` : p.productName,
          qty: i.qty,
          unitPrice: p.price,
        }
      })

      const [order] = await tx
        .insert(onlineOrders)
        .values({
          projectId,
          branchId,
          customerName: sanitizeText(input.customerName),
          customerPhoneEnc: input.customerPhone?.trim()
            ? encryptToken(input.customerPhone.trim())
            : null,
          status: 'pending',
          totalAmount: toDecimalString(total),
          note: input.note ? sanitizeText(input.note) : null,
        })
        .returning({ id: onlineOrders.id })

      await tx.insert(onlineOrderItems).values(
        lines.map((l) => ({
          projectId,
          orderId: order!.id,
          productVariantId: l.productVariantId,
          productName: l.productName,
          qty: l.qty,
          unitPrice: l.unitPrice,
        }))
      )
      return order!
    })

    logger.info({ projectId, branchId, orderId: created.id }, 'online order placed')
    return created
  }

  async listPending(projectId: string, userId: string) {
    await requirePermission(projectId, userId, 'pos:operate')
    const orders = await withTenant(projectId, (tx) =>
      tx
        .select({
          id: onlineOrders.id,
          customerName: onlineOrders.customerName,
          customerPhoneEnc: onlineOrders.customerPhoneEnc,
          totalAmount: onlineOrders.totalAmount,
          note: onlineOrders.note,
          createdAt: onlineOrders.createdAt,
        })
        .from(onlineOrders)
        .where(
          and(
            eq(onlineOrders.projectId, projectId),
            eq(onlineOrders.status, 'pending'),
            isNull(onlineOrders.deletedAt)
          )
        )
        .orderBy(desc(onlineOrders.createdAt))
        .limit(200)
    )
    return orders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhoneEnc ? decryptToken(o.customerPhoneEnc) : null,
      totalAmount: o.totalAmount,
      note: o.note,
      createdAt: o.createdAt,
    }))
  }

  async reject(projectId: string, orderId: string, context: OrderContext): Promise<void> {
    await requirePermission(projectId, context.userId, 'pos:operate')
    const updated = await withTenant(projectId, (tx) =>
      tx
        .update(onlineOrders)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(onlineOrders.id, orderId),
            eq(onlineOrders.projectId, projectId),
            eq(onlineOrders.status, 'pending')
          )
        )
        .returning({ id: onlineOrders.id })
    )
    if (updated.length === 0) throw new NotFoundError('Pesanan tidak ditemukan')
    await auditRepository.log({
      action: 'update',
      resource: 'online_order',
      resourceId: orderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { status: 'rejected' },
    })
  }

  // Accept a pending order: turn it into a POS sale (stock decremented via posService), link/
  // create the customer, and mark it accepted. Requires an open cash session at the branch.
  async accept(
    projectId: string,
    orderId: string,
    paymentMethod: PaymentMethod,
    context: OrderContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, 'pos:operate')

    const order = await withTenant(projectId, async (tx) => {
      const [head] = await tx
        .select({
          id: onlineOrders.id,
          branchId: onlineOrders.branchId,
          status: onlineOrders.status,
          customerName: onlineOrders.customerName,
          customerPhoneEnc: onlineOrders.customerPhoneEnc,
        })
        .from(onlineOrders)
        .where(and(eq(onlineOrders.id, orderId), eq(onlineOrders.projectId, projectId)))
        .limit(1)
      if (!head) throw new NotFoundError('Pesanan tidak ditemukan')
      if (head.status !== 'pending') throw new ValidationError('Pesanan sudah diproses')

      const items = await tx
        .select({
          productVariantId: onlineOrderItems.productVariantId,
          qty: onlineOrderItems.qty,
          unitPrice: onlineOrderItems.unitPrice,
        })
        .from(onlineOrderItems)
        .where(eq(onlineOrderItems.orderId, orderId))
      return { head, items }
    })

    const lines = order.items
      .filter((i) => i.productVariantId)
      .map((i) => ({
        productVariantId: i.productVariantId!,
        qty: i.qty,
        unitPrice: fromDecimalString(i.unitPrice),
      }))
    if (lines.length === 0) throw new ValidationError('Pesanan tidak punya item valid')

    // Creates the sale and decrements stock; throws if no open cash session or stock is short.
    const sale = await posService.createSale(
      {
        projectId,
        branchId: order.head.branchId,
        lines,
        discount: { type: 'none' },
        paymentMethod,
        paidAmount: lines.reduce((sum, l) => sum + l.unitPrice * BigInt(l.qty), ZERO),
      },
      context
    )

    const phone = order.head.customerPhoneEnc ? decryptToken(order.head.customerPhoneEnc) : null
    let customerId: string | null = null
    if (phone) {
      const existing = await customerService.findByPhone(projectId, context.userId, phone)
      customerId = existing
        ? existing.id
        : (
            await customerService.create(
              projectId,
              {
                name: order.head.customerName,
                phone,
                email: null,
                address: null,
                note: 'Dari pesanan online',
              },
              context
            )
          ).id
    }

    await withTenant(projectId, async (tx) => {
      if (customerId) {
        await tx.update(transactions).set({ customerId }).where(eq(transactions.id, sale.header.id))
      }
      await tx
        .update(onlineOrders)
        .set({ status: 'accepted', transactionId: sale.header.id })
        .where(eq(onlineOrders.id, orderId))
    })

    await auditRepository.log({
      action: 'update',
      resource: 'online_order',
      resourceId: orderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { status: 'accepted', transactionId: sale.header.id },
    })
    logger.info({ projectId, orderId, transactionId: sale.header.id }, 'online order accepted')
  }
}

export const onlineOrderService = new OnlineOrderService()
