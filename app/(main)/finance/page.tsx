import { getSessionContext } from '@/lib/auth/session-context'
import { financeService } from '@/lib/services/finance.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ImportMutations } from '@/components/finance/import-mutations'
import { ReconcileToggle } from '@/components/finance/reconcile-toggle'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function monthRange(now: Date) {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
}

function fmtDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; dir?: string; status?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'expense:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Mutasi bank hanya untuk peran keuangan.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const fallback = monthRange(new Date())
  const start = params.start && DATE.test(params.start) ? params.start : fallback.start
  const end = params.end && DATE.test(params.end) ? params.end : fallback.end
  const direction = params.dir === 'in' || params.dir === 'out' ? params.dir : undefined
  const reconciled =
    params.status === 'matched' ? true : params.status === 'unmatched' ? false : undefined

  const [summary, rows] = await Promise.all([
    financeService.summary(context.projectId, context.userId, { startDate: start, endDate: end }),
    financeService.list(context.projectId, context.userId, {
      startDate: start,
      endDate: end,
      ...(direction ? { direction } : {}),
      ...(reconciled !== undefined ? { reconciled } : {}),
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Mutasi Bank</h1>
          <p className="text-muted-foreground text-sm">Impor & rekonsiliasi mutasi rekening</p>
        </div>
        <ImportMutations />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Uang masuk (periode)</p>
          <p className="mt-1 text-lg font-bold text-emerald-500 tabular-nums">
            {formatRupiahFromDecimal(summary.totalIn)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Uang keluar (periode)</p>
          <p className="text-destructive mt-1 text-lg font-bold tabular-nums">
            {formatRupiahFromDecimal(summary.totalOut)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Belum dicocokkan</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{summary.unreconciled}</p>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/finance">
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
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Arah</label>
          <select
            name="dir"
            defaultValue={direction ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Semua</option>
            <option value="in">Masuk</option>
            <option value="out">Keluar</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Status</label>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Semua</option>
            <option value="unmatched">Belum cocok</option>
            <option value="matched">Sudah cocok</option>
          </select>
        </div>
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada mutasi pada filter ini. Impor CSV KlikBCA untuk mulai.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
                <th className="px-4 py-3 text-right font-medium">Masuk</th>
                <th className="px-4 py-3 text-right font-medium">Keluar</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-border border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(m.mutationDate)}</td>
                  <td className="max-w-md px-4 py-3">
                    <div className="truncate">{m.description}</div>
                    {m.note ? (
                      <div className="text-muted-foreground text-xs">catatan: {m.note}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-500 tabular-nums">
                    {m.direction === 'in' ? formatRupiahFromDecimal(m.amount) : ''}
                  </td>
                  <td className="text-destructive px-4 py-3 text-right tabular-nums">
                    {m.direction === 'out' ? formatRupiahFromDecimal(m.amount) : ''}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                    {m.balanceAfter ? formatRupiahFromDecimal(m.balanceAfter) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReconcileToggle id={m.id} reconciled={m.reconciled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
