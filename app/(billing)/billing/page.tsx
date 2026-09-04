import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { subscriptionService } from '@/lib/services/subscription.service'
import { subscriptionPaymentService } from '@/lib/services/subscription-payment.service'
import { resolveBillingState } from '@/lib/auth/billing-state'
import { Button } from '@/components/ui/button'
import { PlanCards } from '@/components/billing/plan-cards'

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Masa coba',
  active: 'Aktif',
  past_due: 'Menunggu pembayaran',
  expired: 'Kedaluwarsa',
  canceled: 'Dibatalkan',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date)
}

export default async function BillingPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect('/login')

  const billing = await resolveBillingState(userId)

  if (billing.access === 'active' && billing.current) {
    const { subscription, plan } = billing.current
    return (
      <div>
        <h1 className="text-2xl font-bold">Langganan</h1>
        <div className="border-border bg-card mt-6 space-y-3 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Paket</span>
            <span className="font-medium">{plan.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Status</span>
            <span className="font-medium">
              {STATUS_LABEL[subscription.status] ?? subscription.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Berlaku hingga</span>
            <span className="font-medium">
              {formatDate(subscription.currentPeriodEnd)} · sisa {billing.daysLeft} hari
            </span>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/dashboard">Masuk aplikasi</Link>
          </Button>
        </div>
      </div>
    )
  }

  // No subscription or expired: offer plans.
  const plans = await subscriptionService.listActivePlans()
  const expired = billing.access === 'expired'
  const pendingPayment = await subscriptionPaymentService.hasPendingPayment(userId)

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {expired ? 'Langganan berakhir' : 'Belum berlangganan'}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {expired
          ? 'Masa langganan Anda telah berakhir. Perpanjang untuk kembali mengakses aplikasi.'
          : 'Pilih paket untuk mulai memakai aplikasi.'}
      </p>

      {pendingPayment ? (
        <div className="border-border bg-muted/40 mt-6 rounded-xl border p-4 text-sm">
          <p className="font-medium">Pembayaran sedang diproses</p>
          <p className="text-muted-foreground mt-1">
            Jika Anda baru saja membayar, konfirmasi bisa memakan waktu sejenak. Muat ulang halaman
            ini setelah pembayaran selesai.
          </p>
        </div>
      ) : null}

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
