import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ChangePasswordForm } from '@/components/auth/change-password-form'

// Reachable by any signed-in user; the dashboard layout redirects here when a first login still
// requires a password change. Not inside (main), so there's no redirect loop for must-change users.
export default async function ChangePasswordPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <h1 className="text-xl font-bold">Ganti password</h1>
        <p className="text-muted-foreground mt-1 mb-5 text-sm">
          Buat password baru untuk mengamankan akun Anda.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
