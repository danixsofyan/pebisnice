import { getSessionContext } from '@/lib/auth/session-context'
import { purchasingService } from '@/lib/services/purchasing.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { PayPurchaseButton } from '@/components/payables/pay-purchase-button'

const STATUS: Record<string, string> = {
  ordered: 'Dipesan',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d)
}

export default async function PayablesPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'expense:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hutang supplier hanya untuk peran keuangan.
        </p>
      </div>
    )
  }

  const [rows, total] = await Promise.all([
    purchasingService.listPayables(context.projectId, context.userId),
    purchasingService.payablesTotal(context.projectId, context.userId),
  ])
  const purchaseTotal = rows.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Hutang Supplier</h1>
        <p className="text-muted-foreground text-sm">
          Belum terbayar: <strong>{formatRupiahFromDecimal(total)}</strong> · total pembelian:{' '}
          {formatRupiahFromDecimal(String(purchaseTotal))}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada pembelian. Buat PO di menu Pembelian.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium">Sisa</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-border border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(r.orderDate)}</td>
                  <td className="px-4 py-3">{r.supplier ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {STATUS[r.status] ?? r.status}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.total)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.paid)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatRupiahFromDecimal(r.outstanding)}
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    {Number(r.outstanding) > 0 ? (
                      <PayPurchaseButton id={r.id} outstanding={r.outstanding} />
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                        Lunas
                      </span>
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
