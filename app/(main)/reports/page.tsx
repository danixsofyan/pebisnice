import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm font-medium">01 Okt 2023 - 31 Okt 2023</span>
            <ChevronDown className="size-4 text-slate-400" />
          </div>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md">
          <Download className="size-4" />
          Export Laporan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Laba Bersih"
          value={45200000}
          change={12.5}
          format="currency"
          className="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50"
          icon={<Wallet className="size-5 text-indigo-600 dark:text-indigo-400" />}
          iconClassName="bg-indigo-100 dark:bg-indigo-900/30"
          description="vs bulan lalu"
        />
        <KpiCard
          title="Total Pengeluaran"
          value={12800000}
          change={-5.2}
          format="currency"
          className="bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50"
          icon={<TrendingDown className="size-5 text-rose-600 dark:text-rose-400" />}
          iconClassName="bg-rose-100 dark:bg-rose-900/30"
          description="vs bulan lalu"
        />
        <KpiCard
          title="Arus Kas"
          value={32400000}
          change={8.1}
          format="currency"
          className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50"
          icon={<TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30"
          description="vs bulan lalu"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
            <h4 className="font-bold">Laporan Laba Rugi</h4>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Okt 2023</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>Pendapatan (Omzet)</span>
                  <span>{formatRupiah(85000000)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                  <span>Penjualan Marketplace</span>
                  <span>{formatRupiah(72000000)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                  <span>Penjualan Website</span>
                  <span>{formatRupiah(13000000)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold pt-2 text-rose-500">
                  <span>Harga Pokok Penjualan (HPP)</span>
                  <span>({formatRupiah(27000000)})</span>
                </div>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm font-bold border border-slate-100 dark:border-slate-700">
                <span>Laba Kotor</span>
                <span className="text-primary">{formatRupiah(58000000)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>Biaya Operasional</span>
                  <span className="text-rose-500">({formatRupiah(12800000)})</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-4 border-l-2 border-slate-100 dark:border-slate-800 leading-relaxed">
                  <span>Marketplace Fees (Admin)</span>
                  <span>{formatRupiah(4200000)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-4 border-l-2 border-slate-100 dark:border-slate-800 leading-relaxed">
                  <span>Iklan & Marketing</span>
                  <span>{formatRupiah(5500000)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-4 border-l-2 border-slate-100 dark:border-slate-800 leading-relaxed">
                  <span>Gaji & Operasional Kantor</span>
                  <span>{formatRupiah(3100000)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between p-4 bg-primary text-primary-foreground rounded-lg font-bold shadow-lg shadow-primary/20 items-center">
              <span className="text-sm">Laba Bersih</span>
              <span className="text-xl">{formatRupiah(45200000)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
            <h4 className="font-bold">Laporan Arus Kas</h4>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Breakdown Kas</span>
          </div>
          <div className="p-6 flex-1 space-y-8">
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1.5 tracking-widest">
                <ArrowDownLeft className="size-3" /> Kas Masuk
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Pencairan Dana Shopee</span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(42000000)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Pencairan Dana Tokopedia</span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(30000000)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Penjualan Direct Cash</span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(13000000)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1.5 tracking-widest">
                <ArrowUpRight className="size-3" /> Kas Keluar
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Restock Inventaris (Supplier)</span>
                  <span className="font-bold text-rose-500">-{formatRupiah(35000000)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Pembayaran Iklan FB/IG</span>
                  <span className="font-bold text-rose-500">-{formatRupiah(5500000)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Beban Operasional Lainnya</span>
                  <span className="font-bold text-rose-500">-{formatRupiah(12100000)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Saldo Awal Bulan</span>
                <span className="text-sm font-bold">{formatRupiah(150000000)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg shadow-inner">
                <span className="text-xs font-bold text-primary uppercase">Saldo Akhir</span>
                <span className="text-lg font-extrabold text-primary">{formatRupiah(182400000)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
