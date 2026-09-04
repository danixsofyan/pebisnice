import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { readRequestMeta } from '@/lib/observability/server-context'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ReportsTabs } from '@/components/reports/reports-tabs'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function monthRange(now: Date) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
}

export default async function SalesByProductPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; branch?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'report:view')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Laporan produk terlaris tidak tersedia untuk peran Anda.
        </p>
      </div>
    )
  }

  const branchList = await getAccessibleBranches(context)
  const params = await searchParams
  const fallback = monthRange(new Date())
  const start = params.start && DATE.test(params.start) ? params.start : fallback.start
  const end = params.end && DATE.test(params.end) ? params.end : fallback.end
  const branchId =
    params.branch && branchList.some((b) => b.id === params.branch) ? params.branch : null

  const meta = await readRequestMeta()
  const rows = await reportService.salesByProduct(
    { projectId: context.projectId, startDate: start, endDate: end, branchId },
    { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
  )

  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0)
  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Produk Terlaris</h1>
        <p className="text-muted-foreground text-sm">Peringkat penjualan per produk</p>
      </div>

      <ReportsTabs />

      <form className="flex flex-wrap items-end gap-2" action="/reports/products">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Dari</label>
          <input
            type="date"
            name="start"
            defaultValue={start}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Sampai</label>
          <input
            type="date"
            name="end"
            defaultValue={end}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        {branchList.length > 1 ? (
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Cabang</label>
            <select
              name="branch"
              defaultValue={branchId ?? ''}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">Semua cabang</option>
              {branchList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
        <a
          href={`/api/v1/export/sales-by-product?start=${start}&end=${end}${branchId ? `&branch=${branchId}` : ''}`}
          className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
        >
          Export CSV
        </a>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada penjualan pada periode ini.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Transaksi</th>
                <th className="px-4 py-3 text-right font-medium">Omzet</th>
                <th className="px-4 py-3 text-right font-medium">Porsi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const share = totalRevenue > 0 ? (Number(row.revenue) / totalRevenue) * 100 : 0
                return (
                  <tr key={row.name} className="border-border border-t">
                    <td className="text-muted-foreground px-4 py-3 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.orders}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRupiahFromDecimal(row.revenue)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted/40 font-semibold">
              <tr className="border-border border-t">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{totalQty}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatRupiahFromDecimal(String(totalRevenue))}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
