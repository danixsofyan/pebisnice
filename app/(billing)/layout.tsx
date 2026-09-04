import { redirect } from 'next/navigation'
import { auth } from '@/auth'

/**
 * Cangkang halaman tagihan. Hanya menuntut login — sengaja TIDAK di belakang
 * gerbang langganan, karena justru di sinilah pengguna tanpa langganan atau
 * yang sudah kedaluwarsa harus bisa masuk untuk memilih/memperpanjang paket.
 */
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-3xl">{children}</div>
    </div>
  )
}
