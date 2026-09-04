import { getSessionContext } from '@/lib/auth/session-context'
import { onlineOrderService } from '@/lib/services/online-order.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { OrderActions } from '@/components/order/order-actions'

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default async function OrdersPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'pos:operate')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Pesanan online hanya untuk peran kasir/penjualan.
        </p>
      </div>
    )
  }

  const orders = await onlineOrderService.listPending(context.projectId, context.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Pesanan Online</h1>
        <p className="text-muted-foreground text-sm">
          {orders.length} pesanan menunggu · terima untuk jadi transaksi kasir
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada pesanan online masuk. Bagikan link order dari menu Pengaturan.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Pelanggan</th>
                <th className="px-4 py-3 font-medium">Catatan</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-border border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div>{o.customerName}</div>
                    {o.customerPhone ? (
                      <div className="text-muted-foreground text-xs">{o.customerPhone}</div>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{o.note ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(o.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderActions orderId={o.id} />
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
