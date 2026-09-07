import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="border-border bg-background/60 rounded-xl border p-6 shadow-2xl backdrop-blur-md">
        <h1 className="text-xl font-bold">Lupa password</h1>
        <p className="text-muted-foreground mt-1 mb-5 text-sm">
          Masukkan email Anda. Jika terdaftar, kami kirim tautan untuk membuat password baru.
        </p>
        <ForgotPasswordForm />
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href="/login" className="underline underline-offset-4">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
