import Link from 'next/link'
import { getSessionContext } from '@/lib/auth/session-context'
import { productionService } from '@/lib/services/production.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function monthRange(now: Date) {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
}

export default async function ProductionWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'report:view')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Laporan tim produksi memuat data upah yang tidak dapat diakses peran Anda.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const fallback = monthRange(new Date())
  const start = params.start && DATE.test(params.start) ? params.start : fallback.start
  const end = params.end && DATE.test(params.end) ? params.end : fallback.end

  const rows = await productionService.workerReport(context.projectId, context.userId, {
    startDate: start,
    endDate: end,
  })

  const totalWage = rows.reduce((sum, r) => sum + Number(r.totalWage), 0)
  const totalQty = rows.reduce((sum, r) => sum + r.totalQty, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Laporan Tim Produksi</h1>
          <p className="text-muted-foreground text-sm">Output, hari kerja &amp; upah borongan</p>
        </div>
        <Link
          href="/production"
          className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
        >
          ← Produksi
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/production/workers">
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
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada produksi bernama pekerja pada periode ini.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 text-right font-medium">Total unit</th>
                <th className="px-4 py-3 text-right font-medium">Jenis produk</th>
                <th className="px-4 py-3 text-right font-medium">Hari kerja</th>
                <th className="px-4 py-3 text-right font-medium">Upah</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId} className="border-border border-t">
                  <td className="px-4 py-3">
                    <div>{r.name ?? r.email}</div>
                    {r.name ? <div className="text-muted-foreground text-xs">{r.email}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.totalQty}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.productVariety}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.daysWorked}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.totalWage)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 font-semibold">
              <tr className="border-border border-t">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalQty}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatRupiahFromDecimal(String(totalWage))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
