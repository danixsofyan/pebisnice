import Link from 'next/link'
import { notFound } from 'next/navigation'
import { resolveAdminState } from '@/lib/auth/admin'

/**
 * Cangkang dashboard admin platform.
 *
 * Bukan admin → `notFound()`, bukan redirect: keberadaan area ini tidak perlu
 * dibocorkan ke pengguna biasa. Sengaja di luar gerbang langganan — admin tak
 * harus berlangganan.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await resolveAdminState()
  if (!isAdmin) notFound()

  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <span className="font-bold">Pebisnice Admin</span>
          <nav className="text-muted-foreground flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-foreground">
              Ringkasan
            </Link>
            <Link href="/admin/subscribers" className="hover:text-foreground">
              Pelanggan
            </Link>
          </nav>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground ml-auto text-sm"
          >
            ← Ke aplikasi
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
