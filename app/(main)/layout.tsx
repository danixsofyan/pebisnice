import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { resolveSessionState } from '@/lib/auth/session-context'
import { resolveBillingState } from '@/lib/auth/billing-state'

// Whole-app page shell. Layered gate whose order decides the redirect: not logged in -> login, no subscription -> plans, subscription expired -> billing, no business yet -> onboarding. Previously 'not logged in' threw into a 500 instead of going to the right place.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const state = await resolveSessionState()

  if (state.status === 'unauthenticated') redirect('/login')

  const userId = state.status === 'ready' ? state.context.userId : state.userId
  const billing = await resolveBillingState(userId)

  if (billing.access === 'none') redirect('/billing/plans')
  if (billing.access === 'expired') redirect('/billing')

  if (state.status === 'no-project') redirect('/onboarding')

  return <DashboardLayout>{children}</DashboardLayout>
}
