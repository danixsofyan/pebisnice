import { redirect } from 'next/navigation'
import { resolveSessionState } from '@/lib/auth/session-context'

/**
 * Cangkang halaman cetak: tanpa sidebar/chrome agar `window.print()` hanya
 * mencetak isinya. Tetap butuh sesi dengan project aktif.
 */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const state = await resolveSessionState()
  if (state.status === 'unauthenticated') redirect('/login')
  if (state.status !== 'ready') redirect('/dashboard')

  return <div className="mx-auto max-w-sm p-4">{children}</div>
}
