import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Package,
  Wallet,
  AlertTriangle,
  Plus,
  RefreshCw,
  ClipboardList,
} from 'lucide-react'
import { InventoryTable } from '@/components/dashboard/inventory-table'

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard
          title="Total Produk Aktif"
          value={1240}
          change={5}
          format="number"
          className="border-primary/20 bg-primary/10"
          icon={<Package className="size-5 text-primary" />}
          iconClassName="bg-primary/20"
          description="SKU"
        />
        <KpiCard
          title="Total Nilai Stok"
          value={450000000}
          change={2}
          format="currency"
          className="border-emerald-500/20 bg-emerald-500/10"
          icon={<Wallet className="size-5 text-emerald-500" />}
          iconClassName="bg-emerald-500/20"
        />
        <KpiCard
          title="Stok Rendah / Habis"
          value={12}
          change={0}
          format="number"
          className="border-orange-500/20 bg-orange-500/10"
          icon={<AlertTriangle className="size-5 text-orange-500" />}
          iconClassName="bg-orange-500/20"
          description="SKU (Perlu restock)"
        />
      </div>

      <div className="grid grid-cols-1 md:flex md:items-center md:justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 md:flex">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-3 text-xs font-bold transition-all shadow-lg shadow-primary/20 md:flex-row md:px-5 md:py-2.5 md:text-sm">
            <Plus className="size-4 md:size-5" />
            <span className="text-center">Tambah Produk</span>
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-white flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-3 text-xs font-bold transition-all dark:bg-slate-700 dark:hover:bg-slate-600 md:flex-row md:px-5 md:py-2.5 md:text-sm">
            <RefreshCw className="size-4" />
            <span className="text-center">Sync Market</span>
          </button>
        </div>
        <button className="hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 transition-all md:py-2.5">
          <ClipboardList className="size-5" />
          Stock Opname
        </button>
      </div>

      <InventoryTable />
    </div>
  )
}
