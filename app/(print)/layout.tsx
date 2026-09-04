import { redirect } from 'next/navigation'
import { resolveSessionState } from '@/lib/auth/session-context'

// Print page shell: no sidebar/chrome so window.print() prints only its content. Still requires a session with an active project.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const state = await resolveSessionState()
  if (state.status === 'unauthenticated') redirect('/login')
  if (state.status !== 'ready') redirect('/dashboard')

  return <div className="mx-auto max-w-sm p-4">{children}</div>
}
