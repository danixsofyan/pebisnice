'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { createCheckoutAction, startTrialAction } from '@/app/actions/billing'

export interface PlanCard {
  id: string
  code: string
  name: string
  description: string | null
  interval: 'trial' | 'monthly' | 'yearly'
  price: string
  trialDays: number | null
}

const INTERVAL_LABEL: Record<PlanCard['interval'], string> = {
  trial: '',
  monthly: '/bulan',
  yearly: '/tahun',
}

// Plan choice cards. Trial activates at once and leads to onboarding. Paid plans await payment integration, so the button is disabled with a note rather than hidden, keeping the flow visible.
export function PlanCards({
  plans,
  hadSubscription,
}: {
  plans: PlanCard[]
  /** Once subscribed before, the trial option no longer applies. */
  hadSubscription: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function chooseTrial() {
    setError(null)
    startTransition(async () => {
      const result = await startTrialAction()
      if (!result.success) {
        setError(result.error)
        return
      }
      router.replace('/onboarding')
    })
  }

  function choosePaid(planId: string) {
    setError(null)
    setBusyPlan(planId)
    startTransition(async () => {
      const result = await createCheckoutAction({ planId })
      if (!result.success) {
        setError(result.error)
        setBusyPlan(null)
        return
      }
      // Off to the Midtrans payment page; the webhook activates the subscription.
      window.location.href = result.data.redirectUrl
    })
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isTrial = plan.interval === 'trial'
          const trialBlocked = isTrial && hadSubscription

          return (
            <div
              key={plan.id}
              className="border-border bg-card flex flex-col rounded-xl border p-5"
            >
              <h3 className="font-semibold">{plan.name}</h3>
              {plan.description ? (
                <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
              ) : null}

              <div className="mt-4 text-2xl font-bold">
                {isTrial ? (
                  `${plan.trialDays} hari`
                ) : (
                  <>
                    {formatRupiahFromDecimal(plan.price)}
                    <span className="text-muted-foreground text-sm font-normal">
                      {INTERVAL_LABEL[plan.interval]}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-6">
                {isTrial ? (
                  <Button
                    onClick={chooseTrial}
                    disabled={isPending || trialBlocked}
                    className="w-full"
                  >
                    {trialBlocked
                      ? 'Trial sudah dipakai'
                      : isPending
                        ? 'Memproses…'
                        : 'Mulai coba gratis'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => choosePaid(plan.id)}
                    disabled={isPending}
                    className="w-full"
                  >
                    {busyPlan === plan.id ? 'Mengalihkan…' : 'Langganan'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error ? (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
