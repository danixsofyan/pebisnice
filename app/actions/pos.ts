'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { posService } from '@/lib/services/pos.service'
import { promoService } from '@/lib/services/promo.service'
import { loyaltyService } from '@/lib/services/loyalty.service'
import { cashSessionService } from '@/lib/services/cash-session.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { fromDecimalString, toDecimalString, ZERO } from '@/lib/domain/money'
import { percentToBasisPoints } from '@/lib/domain/money'
import type { CartDiscount } from '@/lib/domain/pos/cart'
import type { Transaction } from '@/lib/db/tenant'
import {
  closeSessionSchema,
  createSaleSchema,
  openSessionSchema,
  voidSaleSchema,
} from '@/lib/domain/validators/pos.schema'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'

async function requestMeta() {
  const meta = await readRequestMeta()
  return { ip: meta.ip, userAgent: meta.userAgent }
}

function parseOrThrow<T>(schema: { safeParse: (value: unknown) => unknown }, raw: unknown): T {
  const result = schema.safeParse(raw) as {
    success: boolean
    data?: T
    error?: { flatten: () => { fieldErrors: Record<string, string[]> } }
  }

  if (!result.success || !result.data) {
    throw new ValidationError('Validasi gagal', result.error?.flatten().fieldErrors)
  }

  return result.data
}

function toDiscount(input: { type: string; amount?: string; percent?: number }): CartDiscount {
  if (input.type === 'nominal') {
    return { type: 'nominal', amount: fromDecimalString(input.amount!) }
  }
  if (input.type === 'percent') {
    return { type: 'percent', basisPoints: percentToBasisPoints(input.percent!) }
  }
  return { type: 'none' }
}

export async function createSaleAction(raw: unknown) {
  return withRequestScope('createSaleAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const input = parseOrThrow<{
        branchId: string
        lines: Array<{ productVariantId: string; qty: number; unitPrice: string }>
        discount: { type: string; amount?: string; percent?: number }
        paymentMethod: 'cash' | 'transfer' | 'qris' | 'card' | 'other'
        paidAmount: string
        voucherCode?: string
        customerId?: string
        redeemPoints?: number
        clientRequestId?: string
      }>(createSaleSchema, raw)

      const meta = await requestMeta()

      // Everything money-related is recomputed server-side from the line prices; the client's
      // discount numbers are never trusted. Voucher and loyalty-point redemption stack, applied
      // sequentially so points never discount more than what's left after the voucher.
      const subtotal = input.lines.reduce(
        (sum, line) => sum + fromDecimalString(line.unitPrice) * BigInt(line.qty),
        ZERO
      )
      let discount = toDiscount(input.discount)
      const sideEffects: Array<(tx: Transaction, transactionId: string) => Promise<void>> = []

      // Voucher: re-validated against the server subtotal; used_count is bumped in the sale's own
      // transaction so a redemption can't be lost or double-counted.
      let voucherDiscount = ZERO
      const voucherCode = input.voucherCode?.trim()
      if (voucherCode) {
        const promo = await promoService.validate(
          context.projectId,
          context.userId,
          voucherCode,
          subtotal
        )
        voucherDiscount = promo.discountAmount
        sideEffects.push((tx, transactionId) =>
          promoService.redeem(tx, context.projectId, promo.promotionId, transactionId)
        )
      }

      // Loyalty: earn always accrues (if enabled) when a customer is attached; redemption is
      // capped at what remains after the voucher, and only the points that yield a discount are
      // spent. The balance is decremented atomically inside the sale transaction.
      let pointsDiscount = ZERO
      const customerId = input.customerId
      if (customerId) {
        const config = await loyaltyService.getConfig(context.projectId)
        let redeemPoints = input.redeemPoints ?? 0
        if (redeemPoints > 0) {
          if (!config.enabled || config.redeemValue <= 0) {
            throw new ValidationError('Program loyalti tidak aktif')
          }
          const valuePerPoint = BigInt(config.redeemValue) * 100n // rupiah → minor units
          const remaining = subtotal - voucherDiscount
          const capPoints = Number(remaining / valuePerPoint)
          if (redeemPoints > capPoints) redeemPoints = capPoints
          pointsDiscount = BigInt(redeemPoints) * valuePerPoint
        }
        const effectivePoints = redeemPoints
        sideEffects.push((tx, transactionId) =>
          loyaltyService.accrue(tx, {
            projectId: context.projectId,
            customerId,
            transactionId,
            redeemPoints: effectivePoints,
            config,
            actorId: context.userId,
          })
        )
      }

      const combinedDiscount = voucherDiscount + pointsDiscount
      if (combinedDiscount > ZERO) {
        discount = { type: 'nominal', amount: combinedDiscount }
      }

      const afterInsert =
        sideEffects.length > 0
          ? async (tx: Transaction, transactionId: string) => {
              for (const effect of sideEffects) await effect(tx, transactionId)
            }
          : undefined

      const result = await posService.createSale(
        {
          projectId: context.projectId,
          branchId: input.branchId,
          lines: input.lines.map((line) => ({
            productVariantId: line.productVariantId,
            qty: line.qty,
            unitPrice: fromDecimalString(line.unitPrice),
          })),
          discount,
          paymentMethod: input.paymentMethod,
          paidAmount: fromDecimalString(input.paidAmount),
          customerId: customerId ?? null,
          clientRequestId: input.clientRequestId ?? null,
        },
        { userId: context.userId, ...meta },
        afterInsert ? { afterInsert } : undefined
      )

      revalidatePath('/pos')
      revalidatePath('/transactions')

      // Read the receipt straight off the stored header so an idempotent replay (result.duplicate)
      // returns the same numbers as the original sale. Amounts are decimal strings; bigint can't
      // cross the server/client boundary.
      const header = result.header
      return {
        success: true as const,
        data: {
          transactionId: header.id,
          orderCode: header.orderId,
          subtotal: header.grossAmount,
          discountAmount: header.discountAmount,
          total: header.netAmount,
          paidAmount: header.paidAmount ?? header.netAmount,
          changeAmount: header.changeAmount ?? '0',
          duplicate: result.duplicate,
        },
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

// Cashier previews a voucher before checkout: same server-side validation as createSaleAction, so
// the discount shown is exactly the one that will be applied. The final redemption still happens
// atomically inside createSaleAction — this is a read-only preview.
export async function validateVoucherAction(raw: unknown) {
  return withRequestScope('validateVoucherAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const input = parseOrThrow<{ code: string; subtotal: string }>(
        z.object({ code: z.string().trim().min(1).max(64), subtotal: z.string() }),
        raw
      )
      const promo = await promoService.validate(
        context.projectId,
        context.userId,
        input.code,
        fromDecimalString(input.subtotal)
      )
      return {
        success: true as const,
        data: {
          code: promo.code,
          discountAmount: toDecimalString(promo.discountAmount),
        },
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function voidSaleAction(raw: unknown) {
  return withRequestScope('voidSaleAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const input = parseOrThrow<{ transactionId: string; reason: string }>(voidSaleSchema, raw)
      const meta = await requestMeta()

      await posService.voidSale(context.projectId, input.transactionId, input.reason, {
        userId: context.userId,
        ...meta,
      })

      revalidatePath('/pos')
      revalidatePath('/transactions')

      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function getReturnableItemsAction(transactionId: string) {
  return withRequestScope('getReturnableItemsAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      if (!z.string().uuid().safeParse(transactionId).success) {
        throw new ValidationError('Transaksi tidak valid')
      }
      const items = await posService.listReturnableItems(
        context.projectId,
        context.userId,
        transactionId
      )
      return { success: true as const, data: items }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const returnSaleSchema = z.object({
  transactionId: z.string().uuid('Transaksi tidak valid'),
  reason: z.string().trim().max(300).optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.string().uuid('Barang tidak valid'),
        qty: z.number().int().min(1, 'Qty minimal 1'),
      })
    )
    .min(1, 'Pilih minimal satu barang'),
})

export async function returnSaleAction(raw: unknown) {
  return withRequestScope('returnSaleAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const parsed = returnSaleSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }
      const meta = await requestMeta()

      const result = await posService.returnSale(
        context.projectId,
        {
          transactionId: parsed.data.transactionId,
          reason: parsed.data.reason ?? '',
          items: parsed.data.items,
        },
        { userId: context.userId, ...meta }
      )

      revalidatePath('/transactions')
      revalidatePath('/inventory')
      return { success: true as const, data: result }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function openCashSessionAction(raw: unknown) {
  return withRequestScope('openCashSessionAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const input = parseOrThrow<{ branchId: string; openingBalance: string }>(
        openSessionSchema,
        raw
      )
      const meta = await requestMeta()

      const session = await cashSessionService.open(
        context.projectId,
        input.branchId,
        fromDecimalString(input.openingBalance),
        { userId: context.userId, ...meta }
      )

      revalidatePath('/pos')

      return { success: true as const, data: { sessionId: session.id } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function closeCashSessionAction(raw: unknown) {
  return withRequestScope('closeCashSessionAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const input = parseOrThrow<{ branchId: string; countedBalance: string; note?: string }>(
        closeSessionSchema,
        raw
      )
      const meta = await requestMeta()

      const result = await cashSessionService.close(
        context.projectId,
        input.branchId,
        fromDecimalString(input.countedBalance),
        input.note ?? null,
        { userId: context.userId, ...meta }
      )

      revalidatePath('/pos')

      return {
        success: true as const,
        data: {
          expectedBalance: toDecimalString(result.closing.expectedBalance),
          countedBalance: toDecimalString(result.closing.countedBalance),
          difference: toDecimalString(result.closing.difference),
          isBalanced: result.closing.isBalanced,
        },
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
