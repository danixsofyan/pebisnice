'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { catalogService } from '@/lib/services/catalog.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { fromDecimalString } from '@/lib/domain/money'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'
import { parseCsvRecords } from '@/lib/import/csv-parse'
import { parseProductRows } from '@/lib/import/product-import'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_ROWS = 1000

const createProductSchema = z.object({
  branchId: z.string().uuid('Cabang tidak valid'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  type: z.enum(['finished', 'material']),
  sku: z.string().trim().max(60).optional(),
  variantName: z.string().trim().max(100).optional(),
  hpp: z.string().regex(/^\d+(\.\d{1,2})?$/, 'HPP harus angka'),
  productionWage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Upah harus angka')
    .optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Harga harus angka')
    .optional(),
  initialStock: z.number().int().min(0, 'Stok awal tidak boleh negatif'),
  imageKey: z.string().trim().max(200).optional(),
})

export async function createProductAction(raw: unknown) {
  return withRequestScope('createProductAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = createProductSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const headersList = await headers()
      const result = await catalogService.createProduct(
        {
          projectId: context.projectId,
          branchId: parsed.data.branchId,
          name: parsed.data.name,
          type: parsed.data.type,
          sku: parsed.data.sku ?? null,
          variantName: parsed.data.variantName ?? null,
          hpp: fromDecimalString(parsed.data.hpp),
          productionWage: fromDecimalString(parsed.data.productionWage ?? '0'),
          price: fromDecimalString(parsed.data.price ?? '0'),
          initialStock: parsed.data.initialStock,
          imageKey: parsed.data.imageKey ?? null,
        },
        {
          userId: context.userId,
          ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
          userAgent: headersList.get('user-agent') ?? 'unknown',
        }
      )

      revalidatePath('/products')
      revalidatePath('/pos')

      return { success: true as const, data: { productId: result.product.id } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const updateProductSchema = z.object({
  productId: z.string().uuid('Produk tidak valid'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  type: z.enum(['finished', 'material']),
  sku: z.string().trim().max(60).optional(),
  variantName: z.string().trim().max(100).optional(),
  hpp: z.string().regex(/^\d+(\.\d{1,2})?$/, 'HPP harus angka'),
  productionWage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Upah harus angka')
    .optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Harga harus angka')
    .optional(),
  imageKey: z.string().trim().max(200).nullable().optional(),
})

export async function updateProductAction(raw: unknown) {
  return withRequestScope('updateProductAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = updateProductSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const headersList = await headers()
      await catalogService.updateProduct(
        {
          projectId: context.projectId,
          productId: parsed.data.productId,
          name: parsed.data.name,
          type: parsed.data.type,
          sku: parsed.data.sku ?? null,
          variantName: parsed.data.variantName ?? null,
          hpp: fromDecimalString(parsed.data.hpp),
          productionWage: fromDecimalString(parsed.data.productionWage ?? '0'),
          price: fromDecimalString(parsed.data.price ?? '0'),
          imageKey: parsed.data.imageKey ?? null,
        },
        {
          userId: context.userId,
          ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
          userAgent: headersList.get('user-agent') ?? 'unknown',
        }
      )

      revalidatePath('/products')
      revalidatePath('/pos')

      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

// Read the HPP change history for one variant. Gated to cost:view inside the service.
export async function getCostHistoryAction(variantId: string) {
  return withRequestScope('getCostHistoryAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      if (!z.string().uuid().safeParse(variantId).success) {
        throw new ValidationError('Varian tidak valid')
      }

      const rows = await catalogService.costHistory(context.projectId, context.userId, variantId)
      return {
        success: true as const,
        data: rows.map((r) => ({
          id: r.id,
          cost: r.cost,
          previousCost: r.previousCost,
          effectiveFrom: r.effectiveFrom.toISOString(),
          changedByEmail: r.changedByEmail,
        })),
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

/** Discard a photo uploaded but whose product was never saved. */
export async function discardUnsavedImageAction(imageKey: string) {
  return withRequestScope('discardUnsavedImageAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      await catalogService.discardUnsavedImage(context.projectId, context.userId, imageKey)

      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

// Upload the product photo first, separate from saving the product. Takes FormData because binary can't pass as a JSON server-action argument; returns the object key the form then references when creating the product.
export async function uploadProductImageAction(formData: FormData) {
  return withRequestScope('uploadProductImageAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const file = formData.get('file')
      if (!(file instanceof File)) {
        throw new ValidationError('Berkas tidak ditemukan')
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      const { key } = await catalogService.uploadProductImage(
        context.projectId,
        context.userId,
        bytes
      )

      return { success: true as const, data: { imageKey: key } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

// Import products from an uploaded CSV. Parsing and validation are pure; each
// valid row is created, and per-row parse/create errors are returned together.
export async function importProductsAction(formData: FormData) {
  return withRequestScope('importProductsAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const branchId = String(formData.get('branchId') ?? '')
      const file = formData.get('file')
      if (!branchId) throw new ValidationError('Cabang wajib dipilih')
      if (!(file instanceof File)) throw new ValidationError('Berkas CSV tidak ditemukan')
      if (file.size > MAX_IMPORT_BYTES) {
        throw new ValidationError('Berkas CSV terlalu besar (maks 2 MB)')
      }

      const text = await file.text()
      const records = parseCsvRecords(text)
      const { rows, errors } = parseProductRows(
        records.map((r) => r.cells),
        records.map((r) => r.line)
      )
      if (rows.length === 0) {
        throw new ValidationError(errors[0]?.message ?? 'Tidak ada baris yang bisa diimpor')
      }
      if (rows.length > MAX_IMPORT_ROWS) {
        throw new ValidationError(`Maksimum ${MAX_IMPORT_ROWS} baris per impor`)
      }

      const headersList = await headers()
      const result = await catalogService.bulkImport(
        { projectId: context.projectId, branchId, rows },
        {
          userId: context.userId,
          ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
          userAgent: headersList.get('user-agent') ?? 'unknown',
        }
      )

      revalidatePath('/products')
      revalidatePath('/inventory')
      return {
        success: true as const,
        data: {
          created: result.created,
          parseErrors: errors,
          failed: result.failed,
        },
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
