'use server'

import { revalidatePath } from 'next/cache'
import { subscriptionService } from '@/lib/services/subscription.service'
import { getUserFromSession } from '@/lib/auth-utils'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError } from '@/lib/errors/app-error'

/**
 * Memulai masa coba lalu mengantar ke onboarding. Kelayakan (belum punya
 * langganan) diperiksa di service, bukan di klien.
 */
export async function startTrialAction() {
  return withRequestScope('startTrialAction', async () => {
    try {
      const user = await getUserFromSession()
      tagRequestActor(user.id)

      await subscriptionService.startTrial(user.id)

      revalidatePath('/', 'layout')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
