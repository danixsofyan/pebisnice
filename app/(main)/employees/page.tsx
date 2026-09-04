import { KpiCard } from '@/components/dashboard/kpi-card'
import { Users, UserCheck, ShieldCheck, Plus } from 'lucide-react'
import { EmployeeTable } from '@/components/dashboard/employee-table'

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">Manajemen Karyawan</h2>
          <p className="text-xs text-slate-500 md:text-sm dark:text-slate-400">
            Atur hak akses dan peran tim operasional toko Anda.
          </p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold shadow-lg transition-all md:py-2.5">
          <Plus className="size-4 md:size-5" />
          Tambah Karyawan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard
          title="Total Karyawan"
          value={5}
          change={0}
          format="number"
          className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50"
          icon={<Users className="text-primary size-5" />}
          iconClassName="bg-primary/10"
          description="Orang"
        />
        <KpiCard
          title="Karyawan Aktif"
          value={4}
          change={0}
          format="number"
          className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50"
          icon={<UserCheck className="size-5 text-emerald-500" />}
          iconClassName="bg-emerald-500/10"
          description="Orang"
        />
        <KpiCard
          title="Admin Utama"
          value={1}
          change={0}
          format="number"
          className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50"
          icon={<ShieldCheck className="size-5 text-amber-500" />}
          iconClassName="bg-amber-500/10"
          description="Orang"
        />
      </div>

      <EmployeeTable />
    </div>
  )
}
