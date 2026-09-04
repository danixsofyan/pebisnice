import { getSessionContext } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { readRequestMeta } from '@/lib/observability/server-context'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ReportsTabs } from '@/components/reports/reports-tabs'

const CATEGORY_LABEL: Record<string, string> = {
  rent: 'Sewa',
  salary: 'Gaji',
  utility: 'Utilitas',
  marketing: 'Pemasaran',
  shipping: 'Pengiriman',
  supply: 'Perlengkapan',
  tax: 'Pajak',
  other: 'Lainnya',
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function monthRange(now: Date) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
}

function pct(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${strong ? 'bg-muted/40 font-semibold' : ''}`}
    >
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{formatRupiahFromDecimal(value)}</span>
    </div>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'cost:view')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Laporan laba-rugi memuat data biaya yang tidak dapat diakses peran Anda.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const fallback = monthRange(new Date())
  const start = params.start && DATE.test(params.start) ? params.start : fallback.start
  const end = params.end && DATE.test(params.end) ? params.end : fallback.end

  const meta = await readRequestMeta()
  const reportCtx = { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
  const req = {
    projectId: context.projectId,
    startDate: start,
    endDate: end,
    branchId: context.branchId,
  }

  const [pl, byCategory] = await Promise.all([
    reportService.profitLoss(req, reportCtx),
    reportService.expenseBreakdown(req, reportCtx),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Laporan Laba-Rugi</h1>
        <p className="text-muted-foreground text-sm">Gabungan marketplace &amp; kasir</p>
      </div>

      <ReportsTabs />

      <form className="flex flex-wrap items-end gap-2" action="/reports">
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
        <a
          href={`/api/v1/export/report-pdf?start=${start}&end=${end}`}
          className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
        >
          Export PDF
        </a>
      </form>

      <div className="border-border divide-border overflow-hidden rounded-xl border">
        <Line label="Pendapatan marketplace" value={pl.marketplaceRevenue} />
        <Line label="Pendapatan kasir (POS)" value={pl.posRevenue} />
        <Line label="Total pendapatan" value={pl.revenue} strong />
        <Line label="Harga pokok penjualan (HPP)" value={pl.cogs} />
        <Line
          label={`Laba kotor · margin ${pct(pl.grossMarginBasisPoints)}`}
          value={pl.grossProfit}
          strong
        />
        <Line label="Biaya platform" value={pl.platformFees} />
        <Line label="Biaya operasional" value={pl.operatingExpenses} />
        <Line
          label={`Laba bersih · margin ${pct(pl.netMarginBasisPoints)}`}
          value={pl.netProfit}
          strong
        />
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Rincian biaya operasional</h2>
        {byCategory.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
            Tidak ada pengeluaran pada periode ini.
          </p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((row) => (
                  <tr key={row.category} className="border-border border-t">
                    <td className="px-4 py-3">{CATEGORY_LABEL[row.category] ?? row.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRupiahFromDecimal(row.amount)}
                    </td>
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
