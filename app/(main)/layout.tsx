import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { findSessionContext } from '@/lib/auth/session-context'

/**
 * Cangkang seluruh halaman aplikasi.
 *
 * Pengguna yang belum punya project diarahkan ke onboarding — tanpa ini,
 * setiap halaman akan gagal saat mencoba menentukan tenant aktif. Halaman
 * onboarding sengaja berada di luar grup ini supaya tidak ikut terkena
 * pengalihan dan tidak memuat sidebar yang belum berguna.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const context = await findSessionContext()
  if (!context) redirect('/onboarding')

  return <DashboardLayout>{children}</DashboardLayout>
}
