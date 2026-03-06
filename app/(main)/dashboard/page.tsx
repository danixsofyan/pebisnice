import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Wallet,
  BarChart3,
  PiggyBank,
  MousePointerClick,
  Store,
  CheckCircle2,
  CornerUpLeft,
  Megaphone,
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <>
      {}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Omzet"
          value={150000000}
          change={12.5}
          format="currency"
          className="border-blue-500/20 bg-slate-800/10 dark:bg-blue-950/40"
          icon={<Wallet className="size-5 text-blue-500" />}
          iconClassName="bg-blue-500/20"
        />
        <KpiCard
          title="Laba Kotor"
          value={45000000}
          change={8.3}
          format="currency"
          className="border-emerald-500/20 bg-emerald-900/10 dark:bg-emerald-950/40"
          icon={<BarChart3 className="size-5 text-emerald-500" />}
          iconClassName="bg-emerald-500/20"
        />
        <KpiCard
          title="Laba Bersih"
          value={32000000}
          change={10.1}
          format="currency"
          className="border-indigo-500/20 bg-indigo-900/10 dark:bg-indigo-950/40"
          icon={<PiggyBank className="size-5 text-indigo-500" />}
          iconClassName="bg-indigo-500/20"
        />
        <KpiCard
          title="ROAS"
          value={4.2}
          change={-2.4}
          format="number"
          description="Return on Ad Spend"
          className="border-amber-500/20 bg-amber-900/10 dark:bg-amber-950/40"
          icon={<MousePointerClick className="size-5 text-amber-500" />}
          iconClassName="bg-amber-500/20"
        />
      </div>

      {}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Biaya Platform"
          value={5500000}
          change={1.2}
          format="currency"
          className="border-rose-500/20 bg-rose-900/10 dark:bg-rose-950/40"
          icon={<Store className="size-5 text-rose-500" />}
          iconClassName="bg-rose-500/20"
        />
        <KpiCard
          title="Shopee AMS"
          value={1250000}
          change={5.4}
          format="currency"
          description="Affiliate Marketing Solution"
          className="border-orange-500/20 bg-orange-900/10 dark:bg-orange-950/40"
          icon={<Megaphone className="size-5 text-orange-500" />}
          iconClassName="bg-orange-500/20"
        />
        <KpiCard
          title="Pesanan Selesai"
          value={1240}
          change={15.0}
          format="number"
          className="border-teal-500/20 bg-teal-900/10 dark:bg-teal-950/40"
          icon={<CheckCircle2 className="size-5 text-teal-500" />}
          iconClassName="bg-teal-500/20"
        />
        <KpiCard
          title="Retur"
          value={12}
          change={-5.0}
          format="number"
          className="border-yellow-500/20 bg-yellow-900/10 dark:bg-yellow-950/30"
          icon={<CornerUpLeft className="size-5 text-yellow-500" />}
          iconClassName="bg-yellow-500/20"
        />
      </div>

      {}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Tren Pendapatan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tinjauan performa selama 30 hari terakhir
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="bg-primary text-primary-foreground rounded px-3 py-1.5 text-xs font-bold shadow-sm transition-colors hover:opacity-90">
              Harian
            </button>
            <button className="rounded bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
              Mingguan
            </button>
            <button className="rounded bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
              Bulanan
            </button>
          </div>
        </div>

        {}
        <div className="relative h-80 w-full overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            <div className="group flex flex-1 items-end gap-2">
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[40%] flex-1 rounded-t-lg transition-all"
                title="Day 1"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[65%] flex-1 rounded-t-lg transition-all"
                title="Day 2"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[55%] flex-1 rounded-t-lg transition-all"
                title="Day 3"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[85%] flex-1 rounded-t-lg transition-all"
                title="Day 4"
              ></div>
              <div
                className="bg-primary hover:bg-primary/80 h-[95%] flex-1 rounded-t-lg transition-all"
                title="Day 5"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[75%] flex-1 rounded-t-lg transition-all"
                title="Day 6"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[60%] flex-1 rounded-t-lg transition-all"
                title="Day 7"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[45%] flex-1 rounded-t-lg transition-all"
                title="Day 8"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[70%] flex-1 rounded-t-lg transition-all"
                title="Day 9"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[90%] flex-1 rounded-t-lg transition-all"
                title="Day 10"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[50%] flex-1 rounded-t-lg transition-all"
                title="Day 11"
              ></div>
              <div
                className="bg-primary/20 hover:bg-primary/40 h-[40%] flex-1 rounded-t-lg transition-all"
                title="Day 12"
              ></div>
            </div>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="custom-scrollbar mt-2 flex justify-between gap-1 overflow-x-auto pb-1 text-[8px] font-bold tracking-widest text-slate-500 uppercase sm:text-[10px]">
              <span className="shrink-0">01 Sep</span>
              <span className="hidden shrink-0 sm:inline">05 Sep</span>
              <span className="shrink-0">10 Sep</span>
              <span className="hidden shrink-0 sm:inline">15 Sep</span>
              <span className="shrink-0">20 Sep</span>
              <span className="hidden shrink-0 sm:inline">25 Sep</span>
              <span className="shrink-0">30 Sep</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
