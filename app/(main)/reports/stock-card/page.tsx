import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { reportService } from '@/lib/services/report.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { ReportsTabs } from '@/components/reports/reports-tabs'

const DATE = /^\d{4}-\d{2}-\d{2}$/

const MOVEMENT_LABEL: Record<string, string> = {
  sale: 'Penjualan',
  return: 'Retur/produksi masuk',
  cancellation: 'Pembatalan',
  adjustment: 'Penyesuaian',
  opname: 'Opname',
  initial: 'Stok awal',
  transfer_out: 'Transfer keluar',
  transfer_in: 'Transfer masuk',
  purchase: 'Pembelian',
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default async function StockCardPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; variant?: string; start?: string; end?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'report:view')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Kartu stok tidak tersedia untuk peran Anda.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const branches = await getAccessibleBranches(context)
  const branchId =
    params.branch && branches.some((b) => b.id === params.branch)
      ? params.branch
      : (branches[0]?.id ?? null)

  const items = branchId
    ? await catalogService.list(context.projectId, branchId, context.userId)
    : []
  const variantId =
    params.variant && items.some((i) => i.variantId === params.variant)
      ? params.variant
      : (items[0]?.variantId ?? null)

  const start = params.start && DATE.test(params.start) ? params.start : undefined
  const end = params.end && DATE.test(params.end) ? params.end : undefined

  const rows =
    branchId && variantId
      ? await reportService.stockCard(context.projectId, context.userId, {
          branchId,
          variantId,
          ...(start ? { startDate: start } : {}),
          ...(end ? { endDate: end } : {}),
        })
      : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Kartu Stok</h1>
        <p className="text-muted-foreground text-sm">Riwayat pergerakan stok per produk</p>
      </div>

      <ReportsTabs />

      <form className="flex flex-wrap items-end gap-2" action="/reports/stock-card">
        {branches.length > 1 ? (
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Cabang</label>
            <select
              name="branch"
              defaultValue={branchId ?? ''}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="branch" value={branchId ?? ''} />
        )}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Produk</label>
          <select
            name="variant"
            defaultValue={variantId ?? ''}
            className="border-input bg-background h-9 max-w-64 rounded-md border px-3 text-sm"
          >
            {items.map((i) => (
              <option key={i.variantId} value={i.variantId}>
                {i.variantName ? `${i.name} · ${i.variantName}` : i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Dari</label>
          <input
            type="date"
            name="start"
            defaultValue={start ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Sampai</label>
          <input
            type="date"
            name="end"
            defaultValue={end ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada produk pada cabang ini.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada pergerakan stok pada filter ini.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 text-right font-medium">Perubahan</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-border border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {MOVEMENT_LABEL[r.movementType] ?? r.movementType}
                    {r.note ? (
                      <span className="text-muted-foreground block text-xs">{r.note}</span>
                    ) : null}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${r.qty < 0 ? 'text-destructive' : 'text-emerald-500'}`}
                  >
                    {r.qty > 0 ? `+${r.qty}` : r.qty}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {r.quantityAfter}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{r.actorEmail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
