import { adminService } from '@/lib/services/admin.service'
import { formatRupiahFromDecimal } from '@/lib/formatters'

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  paid: 'Lunas',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  canceled: 'Dibatalkan',
  refunded: 'Dikembalikan',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default async function AdminOverviewPage() {
  const data = await adminService.overview()

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Ringkasan</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total pelanggan" value={String(data.totalSubscribers)} />
        <Stat label="Aktif" value={String(data.active)} />
        <Stat label="Masa coba" value={String(data.trialing)} />
        <Stat label="Kedaluwarsa" value={String(data.expired)} />
        <Stat label="Pendapatan bulan ini" value={formatRupiahFromDecimal(data.revenueThisMonth)} />
        <Stat label="Pendapatan total" value={formatRupiahFromDecimal(data.revenueTotal)} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Pembayaran terbaru</h2>
        {data.recentPayments.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
            Belum ada pembayaran.
          </p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Metode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.orderId} className="border-border border-t">
                    <td className="px-4 py-3">{p.email ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {p.orderId}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRupiahFromDecimal(p.amount)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{p.paymentType ?? '—'}</td>
                    <td className="px-4 py-3">{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
