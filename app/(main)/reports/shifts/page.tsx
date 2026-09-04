import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { cashSessionService } from '@/lib/services/cash-session.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ReportsTabs } from '@/components/reports/reports-tabs'

function when(value: Date | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DifferenceCell({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  const amount = Number(value)
  const tone =
    amount === 0 ? 'text-muted-foreground' : amount > 0 ? 'text-emerald-500' : 'text-destructive'
  const label = amount > 0 ? `+${formatRupiahFromDecimal(value)}` : formatRupiahFromDecimal(value)
  return <span className={`font-medium tabular-nums ${tone}`}>{label}</span>
}

export default async function ShiftReportPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'cash_session:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Laporan shift kasir hanya untuk peran yang mengelola sesi kas.
        </p>
      </div>
    )
  }

  const branchList = await getAccessibleBranches(context)
  const params = await searchParams
  const branchId =
    params.branch && branchList.some((b) => b.id === params.branch) ? params.branch : undefined

  const sessions = await cashSessionService.history(context.projectId, context.userId, {
    ...(branchId ? { branchId } : {}),
  })

  const exportHref = branchId ? `/api/v1/export/shifts?branch=${branchId}` : '/api/v1/export/shifts'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Laporan Shift Kasir</h1>
          <p className="text-muted-foreground text-sm">Riwayat buka-tutup sesi kas &amp; selisih</p>
        </div>
        <a
          href={exportHref}
          className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
        >
          Export CSV
        </a>
      </div>

      <ReportsTabs />

      {branchList.length > 1 ? (
        <form className="flex flex-wrap items-end gap-2" action="/reports/shifts">
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
          <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
            Terapkan
          </button>
        </form>
      ) : null}

      {sessions.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada sesi kasir pada cabang ini.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Buka</th>
                <th className="px-4 py-3 font-medium">Tutup</th>
                <th className="px-4 py-3 font-medium">Kasir</th>
                <th className="px-4 py-3 text-right font-medium">Modal awal</th>
                <th className="px-4 py-3 text-right font-medium">Seharusnya</th>
                <th className="px-4 py-3 text-right font-medium">Dihitung</th>
                <th className="px-4 py-3 text-right font-medium">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-border border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>{when(s.openedAt)}</div>
                    <div className="text-muted-foreground text-xs">{s.branchName ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.status === 'open' ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                        Terbuka
                      </span>
                    ) : (
                      when(s.closedAt)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{s.openedByEmail ?? '—'}</div>
                    {s.closedByEmail && s.closedByEmail !== s.openedByEmail ? (
                      <div className="text-muted-foreground text-xs">tutup: {s.closedByEmail}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(s.openingBalance)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {s.expectedBalance ? formatRupiahFromDecimal(s.expectedBalance) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {s.countedBalance ? formatRupiahFromDecimal(s.countedBalance) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DifferenceCell value={s.difference} />
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
