import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { resolveSessionState } from '@/lib/auth/session-context'
import { resolveBillingState } from '@/lib/auth/billing-state'

/**
 * Cangkang seluruh halaman aplikasi.
 *
 * Gerbang berlapis, urutannya menentukan ke mana pengunjung diarahkan: belum
 * login → login, belum berlangganan → pilih paket, langganan habis → halaman
 * tagihan, belum punya bisnis → onboarding. Sebelumnya "belum login" melempar
 * error dan berujung layar 500, bukan mengarah ke tempat yang benar.
 */
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
