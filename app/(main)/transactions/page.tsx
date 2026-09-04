import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { posService } from '@/lib/services/pos.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { VoidSaleButton } from '@/components/transactions/void-sale-button'

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  card: 'Kartu',
  other: 'Lainnya',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  returned: 'Retur',
  processing: 'Diproses',
  shipped: 'Dikirim',
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function TransactionsPage() {
  const context = await getSessionContext()
  const branches = await getAccessibleBranches(context)
  const branchName = new Map(branches.map((b) => [b.id, b.name]))

  const sales = await posService.listSales(context.projectId, context.userId, {
    branchId: context.branchId,
  })

  const canVoid = hasRolePermission(context.role, 'pos:void')
  const completed = sales.filter((s) => s.status === 'completed')
  const totalNet = completed.reduce((sum, s) => sum + Number(s.netAmount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Transaksi Kasir</h1>
          <p className="text-muted-foreground text-sm">
            {completed.length} transaksi selesai · {formatRupiahFromDecimal(String(totalNet))}
          </p>
        </div>
        {sales.length > 0 ? (
          <a
            href="/api/v1/export/transactions"
            className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
          >
            Export CSV
          </a>
        ) : null}
      </div>

      {sales.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada transaksi kasir. Catat penjualan di menu Kasir.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Cabang</th>
                <th className="px-4 py-3 font-medium">Metode</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                {canVoid ? <th className="px-4 py-3 text-right font-medium">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-border border-t">
                  <td className="px-4 py-3 font-mono text-xs">{s.orderId}</td>
                  <td className="text-muted-foreground px-4 py-3">{formatDateTime(s.orderDate)}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {s.branchId ? (branchName.get(s.branchId) ?? '—') : '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {PAYMENT_LABEL[s.paymentMethod ?? ''] ?? s.paymentMethod ?? '—'}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABEL[s.status] ?? s.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(s.netAmount)}
                  </td>
                  {canVoid ? (
                    <td className="px-4 py-3 text-right">
                      {s.status === 'completed' ? <VoidSaleButton transactionId={s.id} /> : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
