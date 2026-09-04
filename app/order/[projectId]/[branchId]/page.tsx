import { onlineOrderService } from '@/lib/services/online-order.service'
import { OnlineOrderForm } from '@/components/order/online-order-form'

export const dynamic = 'force-dynamic'

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ projectId: string; branchId: string }>
}) {
  const { projectId, branchId } = await params

  let menu
  try {
    menu = await onlineOrderService.publicMenu(projectId, branchId)
  } catch {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-bold">Link tidak valid</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tautan pesanan tidak ditemukan atau sudah tidak aktif.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <header className="space-y-1 text-center">
        <h1 className="text-xl font-bold">{menu.projectName}</h1>
        <p className="text-muted-foreground text-sm">Pesan · {menu.branchName}</p>
      </header>

      {menu.products.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Belum ada produk yang bisa dipesan saat ini.
        </p>
      ) : (
        <OnlineOrderForm
          projectId={projectId}
          branchId={branchId}
          waNumber={menu.waNumber}
          storeName={menu.projectName}
          products={menu.products}
        />
      )}
    </main>
  )
}
