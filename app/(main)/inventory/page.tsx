import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { AdjustStock } from '@/components/inventory/adjust-stock'

export default async function InventoryPage() {
  const context = await getSessionContext()
  const branches = await getAccessibleBranches(context)
  const branch = branches[0]

  if (!branch) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Belum ada cabang</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Stok dicatat per cabang; buat cabang lebih dulu.
        </p>
      </div>
    )
  }

  const items = await catalogService.list(context.projectId, branch.id, context.userId)
  const canManage = hasRolePermission(context.role, 'product:manage')
  const lowStock = items.filter((i) => i.stockQty <= 5).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Inventaris</h1>
        <p className="text-muted-foreground text-sm">
          Cabang {branch.name} · {items.length} varian · {lowStock} stok menipis (≤5)
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada produk untuk dikelola stoknya.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">Stok</th>
                {canManage ? <th className="px-4 py-3 text-right font-medium">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.variantId} className="border-border border-t align-top">
                  <td className="px-4 py-3">
                    {item.name}
                    {item.variantName ? (
                      <span className="text-muted-foreground"> · {item.variantName}</span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={item.stockQty <= 5 ? 'text-destructive font-medium' : ''}>
                      {item.stockQty}
                    </span>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <AdjustStock
                        branchId={branch.id}
                        productVariantId={item.variantId}
                        stockQty={item.stockQty}
                      />
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
