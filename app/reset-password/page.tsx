import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-lg">
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
    </div>
  )
}
