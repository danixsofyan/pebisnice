import { z } from 'zod'

const MONEY = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Nominal harus angka dengan maksimal 2 desimal')

const UUID = z.string().uuid('Id tidak valid')

export const posLineSchema = z.object({
  productVariantId: UUID,
  qty: z.number().int().positive('Qty harus bilangan bulat positif'),
  unitPrice: MONEY,
})

export const discountSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('nominal'), amount: MONEY }),
  z.object({
    type: z.literal('percent'),
    percent: z.number().min(0).max(100, 'Diskon persen maksimal 100'),
  }),
])

export const createSaleSchema = z.object({
  branchId: UUID,
  lines: z.array(posLineSchema).min(1, 'Keranjang tidak boleh kosong'),
  discount: discountSchema,
  paymentMethod: z.enum(['cash', 'transfer', 'qris', 'card', 'other']),
  paidAmount: MONEY,
  voucherCode: z.string().trim().max(64).optional(),
  customerId: UUID.optional(),
  redeemPoints: z.number().int().nonnegative().max(100_000_000).optional(),
})

export const voidSaleSchema = z.object({
  transactionId: UUID,
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(500),
})

export const openSessionSchema = z.object({
  branchId: UUID,
  openingBalance: MONEY,
})

export const closeSessionSchema = z.object({
  branchId: UUID,
  countedBalance: MONEY,
  note: z.string().trim().max(500).optional(),
})

export const recordExpenseSchema = z.object({
  branchId: UUID.nullable(),
  category: z.enum([
    'rent',
    'salary',
    'utility',
    'marketing',
    'shipping',
    'supply',
    'tax',
    'other',
  ]),
  amount: MONEY,
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD'),
  note: z.string().trim().max(500).optional(),
})

export const stockAdjustmentSchema = z.object({
  branchId: UUID,
  productVariantId: UUID,
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Penyesuaian tidak boleh nol'),
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(500),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type VoidSaleInput = z.infer<typeof voidSaleSchema>
export type OpenSessionInput = z.infer<typeof openSessionSchema>
export type CloseSessionInput = z.infer<typeof closeSessionSchema>
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
