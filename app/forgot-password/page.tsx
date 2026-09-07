import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-lg">
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
    </div>
  )
}
