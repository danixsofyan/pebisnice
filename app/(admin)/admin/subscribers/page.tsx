import Link from 'next/link'
import { adminService, type SubscriberRow } from '@/lib/services/admin.service'
import { SubscriberActions } from '@/components/admin/subscriber-actions'

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Masa coba',
  active: 'Aktif',
  past_due: 'Menunggu bayar',
  expired: 'Kedaluwarsa',
  canceled: 'Dibatalkan',
}

const STATUS_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'trialing', label: 'Masa coba' },
  { value: 'active', label: 'Aktif' },
  { value: 'canceled', label: 'Dibatalkan' },
]

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const search = params.q?.trim() || undefined
  const status = params.status as SubscriberRow['status'] | undefined

  const rows = await adminService.listSubscribers({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Pelanggan</h1>

      <form className="flex flex-wrap items-center gap-2" action="/admin/subscribers">
        <input
          name="q"
          defaultValue={search ?? ''}
          placeholder="Cari email atau nama…"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
        <Link href="/admin/subscribers" className="text-muted-foreground text-sm hover:underline">
          Reset
        </Link>
      </form>

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Pelanggan</th>
              <th className="px-4 py-3 font-medium">Paket</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Berakhir</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                  Tidak ada pelanggan.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId} className="border-border border-t">
                  <td className="px-4 py-3">
                    <div>{row.name ?? '—'}</div>
                    <div className="text-muted-foreground text-xs">{row.email}</div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{row.planName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {row.status ? (STATUS_LABEL[row.status] ?? row.status) : 'Belum berlangganan'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {formatDate(row.currentPeriodEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <SubscriberActions userId={row.userId} status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
