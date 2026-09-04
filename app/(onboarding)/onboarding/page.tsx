import { redirect } from 'next/navigation'
import { resolveSessionState } from '@/lib/auth/session-context'
import { resolveBillingState } from '@/lib/auth/billing-state'
import { CreateProjectForm } from '@/components/onboarding/create-project-form'

export default async function OnboardingPage() {
  const state = await resolveSessionState()

  if (state.status === 'unauthenticated') redirect('/login')

  // Tak boleh onboarding tanpa langganan aktif — pilih/atur paket lebih dulu.
  const userId = state.status === 'ready' ? state.context.userId : state.userId
  const billing = await resolveBillingState(userId)
  if (billing.access === 'none') redirect('/billing/plans')
  if (billing.access === 'expired') redirect('/billing')

  if (state.status === 'ready') redirect('/dashboard')

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Selamat datang di Pebisnice</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Buat bisnis pertama Anda untuk mulai mencatat penjualan marketplace dan kasir dalam satu
          laporan.
        </p>

        <div className="border-border bg-card mt-8 rounded-xl border p-6">
          <CreateProjectForm />
        </div>
      </div>
    </div>
  )
}
