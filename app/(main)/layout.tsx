import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { resolveSessionState } from '@/lib/auth/session-context'

/**
 * Cangkang seluruh halaman aplikasi.
 *
 * Menangani ketiga keadaan sesi secara eksplisit. Sebelumnya keadaan "belum
 * login" melempar error dan berujung layar 500, bukan mengarah ke login.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const state = await resolveSessionState()

  if (state.status === 'unauthenticated') redirect('/login')
  if (state.status === 'no-project') redirect('/onboarding')

  return <DashboardLayout>{children}</DashboardLayout>
}
