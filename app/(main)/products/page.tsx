import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ProductForm } from '@/components/catalog/product-form'

export default async function ProductsPage() {
  const context = await getSessionContext()
  const branches = await getAccessibleBranches(context)
  const branch = branches[0]

  if (!branch) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Belum ada cabang</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Project ini belum memiliki cabang, sehingga stok tidak bisa dicatat.
        </p>
      </div>
    )
  }

  const items = await catalogService.list(context.projectId, branch.id, context.userId)
  const canManage = hasRolePermission(context.role, 'product:manage')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Produk</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} varian · stok cabang {branch.name}
          </p>
        </div>
        {canManage ? <ProductForm branchId={branch.id} canViewCost={context.canViewCost} /> : null}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada produk. Tambahkan produk jadi agar bisa dijual di kasir.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">Stok</th>
                {context.canViewCost ? (
                  <th className="px-4 py-3 text-right font-medium">HPP</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.variantId} className="border-border border-t">
                  <td className="px-4 py-3">
                    {item.name}
                    {item.variantName ? (
                      <span className="text-muted-foreground"> · {item.variantName}</span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {item.type === 'finished' ? 'Produk jadi' : 'Bahan'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.stockQty}</td>
                  {context.canViewCost ? (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.hpp ? formatRupiahFromDecimal(item.hpp) : '—'}
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
