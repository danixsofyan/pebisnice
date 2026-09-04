'use server'

import { transactionService } from '@/lib/services/transaction.service'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError } from '@/lib/errors/app-error'
import { getUserFromSession } from '@/lib/auth-utils'
import { headers } from 'next/headers'

export async function triggerManualSyncAction(storeId: string, projectId: string) {
  return withRequestScope('triggerManualSyncAction', async () => {
    try {
      const user = await getUserFromSession()
      tagRequestActor(user.id)

      const headersList = await headers()
      const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      const userAgent = headersList.get('user-agent') || 'unknown'

      const result = await transactionService.triggerManualSync(storeId, projectId, user.id, {
        ip,
        userAgent,
      })

      return { success: true as const, data: result }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
