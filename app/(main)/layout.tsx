import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { OfflineSync } from '@/components/pos/offline-sync'
import { resolveSessionState } from '@/lib/auth/session-context'
import { resolveBillingState } from '@/lib/auth/billing-state'

// Whole-app page shell. Layered gate whose order decides the redirect: not logged in -> login, no subscription -> plans, subscription expired -> billing, no business yet -> onboarding. Previously 'not logged in' threw into a 500 instead of going to the right place.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const state = await resolveSessionState()

  if (state.status === 'unauthenticated') redirect('/login')
  if (state.status === 'must-change-password') redirect('/change-password')

  // Billing is the project owner's, not the visitor's — an invited employee has no subscription of
  // their own and must inherit the owner's access instead of being sent to /billing/plans.
  const billingUserId = state.status === 'ready' ? state.context.ownerId : state.userId
  const billing = await resolveBillingState(billingUserId)

  if (billing.access === 'none') redirect('/billing/plans')
  if (billing.access === 'expired') redirect('/billing')

  if (state.status === 'no-project') redirect('/onboarding')

  return (
    <>
      <OfflineSync />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  )
}
