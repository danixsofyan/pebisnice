import Link from 'next/link'
import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { purchasingService } from '@/lib/services/purchasing.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { PurchaseOrderForm } from '@/components/purchasing/purchase-order-form'
import { ReceiveOrderButton } from '@/components/purchasing/receive-order-button'

const STATUS: Record<string, string> = {
  ordered: 'Dipesan',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d)
}

export default async function PurchasesPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'inventory:adjust')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Pembelian hanya untuk peran yang mengelola inventaris.
        </p>
      </div>
    )
  }

  const [suppliers, branches, orders] = await Promise.all([
    purchasingService.listSuppliers(context.projectId, context.userId),
    getAccessibleBranches(context),
    purchasingService.listOrders(context.projectId, context.userId),
  ])
  const first = branches[0]
  const items = first ? await catalogService.list(context.projectId, first.id, context.userId) : []
  const productOptions = items.map((i) => ({
    variantId: i.variantId,
    label: i.variantName ? `${i.name} · ${i.variantName}` : i.name,
  }))

  const canCreate = suppliers.length > 0 && productOptions.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Pembelian (PO)</h1>
          <p className="text-muted-foreground text-sm">Pesan ke supplier &amp; terima barang</p>
        </div>
        {canCreate ? (
          <PurchaseOrderForm
            suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
            branches={branches.map((b) => ({ id: b.id, label: b.name }))}
            products={productOptions}
          />
        ) : (
          <Link
            href="/suppliers"
            className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
          >
            Tambah supplier dulu
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada purchase order.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Cabang</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-border border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(o.orderDate)}</td>
                  <td className="px-4 py-3">{o.supplier ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{o.branch ?? '—'}</td>
                  <td className="px-4 py-3">{STATUS[o.status] ?? o.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(o.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'ordered' ? <ReceiveOrderButton purchaseOrderId={o.id} /> : null}
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
