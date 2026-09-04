'use server'

import { storeService } from '@/lib/services/store.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { getRequestOrigin } from '@/lib/http/origin'
import { buildAuthUrl } from '@/lib/integrations/shopee/auth'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError } from '@/lib/errors/app-error'

// Build the Shopee authorization URL; the client sends the merchant there.
export async function startShopeeConnectAction() {
  return withRequestScope('startShopeeConnectAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const origin = await getRequestOrigin()
      const url = buildAuthUrl(`${origin}/api/v1/integrations/shopee/callback`)
      return { success: true as const, data: { url } }
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
