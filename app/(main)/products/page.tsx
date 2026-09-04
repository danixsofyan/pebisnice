import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { ProductForm } from '@/components/catalog/product-form'
import { ProductsTable } from '@/components/catalog/products-table'

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
        <ProductsTable
          items={items}
          branchId={branch.id}
          canViewCost={context.canViewCost}
          canManage={canManage}
        />
      )}
    </div>
  )
}
