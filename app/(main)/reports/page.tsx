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
          <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm font-medium">01 Okt 2023 - 31 Okt 2023</span>
            <ChevronDown className="size-4 text-slate-400" />
          </div>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all">
          <Download className="size-4" />
          Export Laporan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard
          title="Laba Bersih"
          value={45200000}
          change={12.5}
          format="currency"
          className="border-indigo-100 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-900/10"
          icon={<Wallet className="size-5 text-indigo-600 dark:text-indigo-400" />}
          iconClassName="bg-indigo-100 dark:bg-indigo-900/30"
          description="vs bulan lalu"
        />
        <KpiCard
          title="Total Pengeluaran"
          value={12800000}
          change={-5.2}
          format="currency"
          className="border-rose-100 bg-rose-50 dark:border-rose-800/50 dark:bg-rose-900/10"
          icon={<TrendingDown className="size-5 text-rose-600 dark:text-rose-400" />}
          iconClassName="bg-rose-100 dark:bg-rose-900/30"
          description="vs bulan lalu"
        />
        <KpiCard
          title="Arus Kas"
          value={32400000}
          change={8.1}
          format="currency"
          className="border-emerald-100 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
          icon={<TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30"
          description="vs bulan lalu"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="font-bold">Laporan Laba Rugi</h4>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Okt 2023
            </span>
          </div>
          <div className="space-y-6 p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>Pendapatan (Omzet)</span>
                  <span>{formatRupiah(85000000)}</span>
                </div>
                <div className="flex justify-between border-l-2 border-slate-100 pl-4 text-xs text-slate-500 dark:border-slate-800">
                  <span>Penjualan Marketplace</span>
                  <span>{formatRupiah(72000000)}</span>
                </div>
                <div className="flex justify-between border-l-2 border-slate-100 pl-4 text-xs text-slate-500 dark:border-slate-800">
                  <span>Penjualan Website</span>
                  <span>{formatRupiah(13000000)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between pt-2 text-sm font-bold text-rose-500">
                  <span>Harga Pokok Penjualan (HPP)</span>
                  <span>({formatRupiah(27000000)})</span>
                </div>
              </div>

              <div className="flex justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800/50">
                <span>Laba Kotor</span>
                <span className="text-primary">{formatRupiah(58000000)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>Biaya Operasional</span>
                  <span className="text-rose-500">({formatRupiah(12800000)})</span>
                </div>
                <div className="flex justify-between border-l-2 border-slate-100 pl-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
                  <span>Marketplace Fees (Admin)</span>
                  <span>{formatRupiah(4200000)}</span>
                </div>
                <div className="flex justify-between border-l-2 border-slate-100 pl-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
                  <span>Iklan & Marketing</span>
                  <span>{formatRupiah(5500000)}</span>
                </div>
                <div className="flex justify-between border-l-2 border-slate-100 pl-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
                  <span>Gaji & Operasional Kantor</span>
                  <span>{formatRupiah(3100000)}</span>
                </div>
              </div>
            </div>

            <div className="bg-primary text-primary-foreground shadow-primary/20 flex items-center justify-between rounded-lg p-4 font-bold shadow-lg">
              <span className="text-sm">Laba Bersih</span>
              <span className="text-xl">{formatRupiah(45200000)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="font-bold">Laporan Arus Kas</h4>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Breakdown Kas
            </span>
          </div>
          <div className="flex-1 space-y-8 p-6">
            <div className="space-y-4">
              <h5 className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-emerald-500 uppercase">
                <ArrowDownLeft className="size-3" /> Kas Masuk
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Pencairan Dana Shopee</span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(42000000)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    Pencairan Dana Tokopedia
                  </span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(30000000)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Penjualan Direct Cash</span>
                  <span className="font-bold text-emerald-500">+{formatRupiah(13000000)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-rose-500 uppercase">
                <ArrowUpRight className="size-3" /> Kas Keluar
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    Restock Inventaris (Supplier)
                  </span>
                  <span className="font-bold text-rose-500">-{formatRupiah(35000000)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Pembayaran Iklan FB/IG</span>
                  <span className="font-bold text-rose-500">-{formatRupiah(5500000)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    Beban Operasional Lainnya
                  </span>
                  <span className="font-bold text-rose-500">-{formatRupiah(12100000)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Saldo Awal Bulan
                </span>
                <span className="text-sm font-bold">{formatRupiah(150000000)}</span>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 border-primary/20 flex items-center justify-between rounded-lg border px-4 py-3 shadow-inner">
                <span className="text-primary text-xs font-bold uppercase">Saldo Akhir</span>
                <span className="text-primary text-lg font-extrabold">
                  {formatRupiah(182400000)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
