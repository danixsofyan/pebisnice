'use server'

import { storeService } from '@/lib/services/store.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { getRequestOrigin } from '@/lib/http/origin'
import { buildAuthUrl } from '@/lib/integrations/shopee/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const connectSchema = z.object({ branchId: z.string().uuid().nullable().optional() })

// Build the Shopee authorization URL; the client sends the merchant there. The
// chosen branch rides along in the redirect so the callback can attach the shop.
export async function startShopeeConnectAction(raw: unknown) {
  return withRequestScope('startShopeeConnectAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const parsed = connectSchema.safeParse(raw ?? {})
      if (!parsed.success) throw new ValidationError('Cabang tidak valid')

      const origin = await getRequestOrigin()
      const redirect = new URL(`${origin}/api/v1/integrations/shopee/callback`)
      if (parsed.data.branchId) redirect.searchParams.set('branch', parsed.data.branchId)

      const url = buildAuthUrl(redirect.toString())
      return { success: true as const, data: { url } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function syncShopeeNowAction(storeId: string) {
  return withRequestScope('syncShopeeNowAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const result = await storeService.syncNow(context.projectId, context.userId, storeId)
      revalidatePath('/settings')
      revalidatePath('/transactions')
      revalidatePath('/reports')
      return { success: true as const, data: result }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function disconnectStoreAction(storeId: string) {
  return withRequestScope('disconnectStoreAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const meta = await readRequestMeta()
      await storeService.disconnect(context.projectId, context.userId, storeId, meta)
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
