import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { subscriptionService } from '@/lib/services/subscription.service'
import { resolveBillingState } from '@/lib/auth/billing-state'
import { PlanCards } from '@/components/billing/plan-cards'

export default async function ChoosePlanPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect('/login')

  const billing = await resolveBillingState(userId)
  // Already actively subscribed, nothing to choose.
  if (billing.access === 'active') redirect('/dashboard')

  const plans = await subscriptionService.listActivePlans()

  return (
    <div>
      <h1 className="text-2xl font-bold">Pilih paket</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Mulai dari masa coba gratis, atau langsung berlangganan. Harga dan durasi dapat berubah
        sewaktu-waktu.
      </p>

      <div className="mt-8">
        <PlanCards
          plans={plans.map((plan) => ({
            id: plan.id,
            code: plan.code,
            name: plan.name,
            description: plan.description,
            interval: plan.interval,
            price: plan.price,
            trialDays: plan.trialDays,
          }))}
          hadSubscription={billing.current !== null}
        />
      </div>
    </div>
  )
}
