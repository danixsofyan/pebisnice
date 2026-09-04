'use server'

import { revalidatePath } from 'next/cache'
import { posService } from '@/lib/services/pos.service'
import { cashSessionService } from '@/lib/services/cash-session.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import { percentToBasisPoints } from '@/lib/domain/money'
import type { CartDiscount } from '@/lib/domain/pos/cart'
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
      }>(createSaleSchema, raw)

      const meta = await requestMeta()

      const result = await posService.createSale(
        {
          projectId: context.projectId,
          branchId: input.branchId,
          lines: input.lines.map((line) => ({
            productVariantId: line.productVariantId,
            qty: line.qty,
            unitPrice: fromDecimalString(line.unitPrice),
          })),
          discount: toDiscount(input.discount),
          paymentMethod: input.paymentMethod,
          paidAmount: fromDecimalString(input.paidAmount),
        },
        { userId: context.userId, ...meta }
      )

      revalidatePath('/pos')
      revalidatePath('/transactions')

      // Numbers go as decimal strings; bigint can't be serialized across the server/client boundary.
      return {
        success: true as const,
        data: {
          transactionId: result.header.id,
          orderCode: result.header.orderId,
          subtotal: toDecimalString(result.cart.subtotal),
          discountAmount: toDecimalString(result.cart.discountAmount),
          total: toDecimalString(result.cart.total),
          paidAmount: toDecimalString(result.cart.total + result.changeAmount),
          changeAmount: toDecimalString(result.changeAmount),
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
