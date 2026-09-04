'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { subscriptionService } from '@/lib/services/subscription.service'
import { subscriptionPaymentService } from '@/lib/services/subscription-payment.service'
import { getUserFromSession } from '@/lib/auth-utils'
import { getRequestOrigin } from '@/lib/http/origin'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

// Start a trial, then send to onboarding. Eligibility (no existing subscription) is checked in the service, not the client.
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

const checkoutSchema = z.object({ planId: z.string().uuid('Paket tidak valid') })

// Create a Snap payment session for a paid plan and return the redirect URL. The client sends the browser there; activation happens via the webhook, not the user's return.
export async function createCheckoutAction(raw: unknown) {
  return withRequestScope('createCheckoutAction', async () => {
    try {
      const user = await getUserFromSession()
      tagRequestActor(user.id)

      const parsed = checkoutSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Paket tidak valid')
      }

      const origin = await getRequestOrigin()
      const result = await subscriptionPaymentService.createCheckout({
        userId: user.id,
        planId: parsed.data.planId,
        customer: {
          ...(user.name ? { firstName: user.name } : {}),
          ...(user.email ? { email: user.email } : {}),
        },
        finishUrl: `${origin}/billing`,
        notificationUrl: `${origin}/api/v1/webhooks/midtrans`,
      })

      return { success: true as const, data: { redirectUrl: result.redirectUrl } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
