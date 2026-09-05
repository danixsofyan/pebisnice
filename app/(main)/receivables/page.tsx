import { getSessionContext } from '@/lib/auth/session-context'
import { receivableService } from '@/lib/services/receivable.service'
import { customerService } from '@/lib/services/customer.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ReceivableForm } from '@/components/receivables/receivable-form'
import { PayReceivableButton } from '@/components/receivables/pay-receivable-button'

function fmtDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
    : '—'
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'expense:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">Piutang hanya untuk peran keuangan.</p>
      </div>
    )
  }

  const params = await searchParams
  const status =
    params.status === 'settled' ? 'settled' : params.status === 'open' ? 'open' : undefined

  const [rows, outstanding] = await Promise.all([
    receivableService.list(context.projectId, context.userId, status ? { status } : {}),
    receivableService.outstandingTotal(context.projectId, context.userId),
  ])
  const customers = hasRolePermission(context.role, 'pos:operate')
    ? (await customerService.list(context.projectId, context.userId)).map((c) => ({
        id: c.id,
        name: c.name,
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Piutang Pelanggan</h1>
          <p className="text-muted-foreground text-sm">
            Belum tertagih: <strong>{formatRupiahFromDecimal(outstanding)}</strong>
          </p>
        </div>
        <ReceivableForm customers={customers} />
      </div>

      <form className="flex gap-2" action="/receivables">
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Semua</option>
          <option value="open">Belum lunas</option>
          <option value="settled">Lunas</option>
        </select>
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada piutang.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Pelanggan</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
                <th className="px-4 py-3 font-medium">Jatuh tempo</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3 text-right font-medium">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium">Sisa</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-border border-t align-top">
                  <td className="px-4 py-3">{r.customerName ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{r.description ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{fmtDate(r.dueDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.paid)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatRupiahFromDecimal(r.outstanding)}
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    {r.settled ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                        Lunas
                      </span>
                    ) : (
                      <PayReceivableButton id={r.id} outstanding={r.outstanding} />
                    )}
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
