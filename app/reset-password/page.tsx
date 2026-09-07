import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthShell>
      <div className="border-border bg-background/60 rounded-xl border p-6 shadow-2xl backdrop-blur-md">
        <h1 className="text-xl font-bold">Buat password baru</h1>
        {token ? (
          <>
            <p className="text-muted-foreground mt-1 mb-5 text-sm">
              Masukkan password baru untuk akun Anda.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            Tautan tidak valid. Silakan{' '}
            <Link href="/forgot-password" className="underline underline-offset-4">
              minta tautan baru
            </Link>
            .
          </p>
        )}
      </div>
    </AuthShell>
  )
}
