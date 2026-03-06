import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  ShoppingCart,
  Wallet,
  ReceiptText,
  Calendar,
  Filter,
} from 'lucide-react'
import { TransactionTable } from '@/components/dashboard/transaction-table'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard
          title="Total Transaksi"
          value={1250}
          change={12.5}
          format="number"
          className="border-primary/20 bg-primary/10"
          icon={<ShoppingCart className="size-5 text-primary" />}
          iconClassName="bg-primary/20"
          description="Pesanan"
        />
        <KpiCard
          title="Pendapatan Bersih"
          value={45000000}
          change={8.2}
          format="currency"
          className="border-emerald-500/20 bg-emerald-500/10"
          icon={<Wallet className="size-5 text-emerald-500" />}
          iconClassName="bg-emerald-500/20"
        />
        <KpiCard
          title="Potongan Marketplace"
          value={5200000}
          change={-5.4}
          format="currency"
          className="border-rose-500/20 bg-rose-500/10"
          icon={<ReceiptText className="size-5 text-rose-500" />}
          iconClassName="bg-rose-500/20"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button className="whitespace-nowrap bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm">
            Semua
          </button>
          <button className="whitespace-nowrap hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors border border-slate-200 dark:border-slate-800">
            Shopee
          </button>
          <button className="whitespace-nowrap hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors border border-slate-200 dark:border-slate-800">
            TikTok Shop
          </button>
          <button className="whitespace-nowrap hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors border border-slate-200 dark:border-slate-800">
            Tokopedia
          </button>
          <button className="whitespace-nowrap hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors border border-slate-200 dark:border-slate-800">
            Lazada
          </button>
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="dark:bg-slate-800 dark:border-slate-800 flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] md:text-sm font-bold border border-slate-200">
            <Calendar className="size-3.5 md:size-4" />
            <span className="whitespace-nowrap">01 Okt - 31 Okt 2023</span>
          </div>
          <button className="hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] md:text-sm font-bold text-slate-900 transition-all">
            <Filter className="size-3.5 md:size-4" />
            Filter
          </button>
        </div>
      </div>

      <TransactionTable />
    </div>
  )
}
