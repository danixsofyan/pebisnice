'use client'

import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Employee {
  id: string
  name: string
  email: string
  avatar: string
  role: 'Admin' | 'Staff Gudang' | 'Akuntan'
  marketplaces: string[]
  status: 'Aktif' | 'Non-aktif'
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Budi Santoso',
    email: 'budi@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiW07eQ1T5Jm8Q1BaUA3a7yM-F_TtqgBAs1MWBK99h-0fU8xIBSYDuc76R1Y0B0T_XTO3JVwz5yPJVvwgmCBP4hjO5TKvya5CxxeFiiBD5FFDdFEPuknheCcQOVQDDL_aCpdmMkV53Qclbs3qkj_TJeuqQwWS9u5tp_QWDC7pCWrwIqszlOlvZSyFLmjx8EdZc9i2nU5IeH3N_QuXXpG9BoSADAWbC3EM11kGvaazb3vruyqsTgXkhp15SSDBp2e_h-pGFI2aaO0RU',
    role: 'Admin',
    marketplaces: ['Semua'],
    status: 'Aktif',
  },
  {
    id: '2',
    name: 'Siti Aminah',
    email: 'siti@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs9g-FTDjmhDGX7jUOPRGJym9PDRONPH2vacJ0ynAigo2pvTBnoLaXg5ZS1h_rwOnd4qhe3yl8rB7JIw7m0w4BrVnpns1iStip3oPyJoT7-x-kfWQC1rHxXfcXszWsLq4WXkw2NHtUoH4akWwXi-ngCUirBGzap11F8mP64HyKhPYvB8hekEnxl8JP_NvYvwF5DSOaZK0Q5sLb_fKbbzRhVMAkLm7hoKZ3zGw6VaZIWdTZDm86osWzsd9qsOx6k47VEkX8aV00Q9Ag',
    role: 'Staff Gudang',
    marketplaces: ['Shopee', 'TikTok Shop'],
    status: 'Aktif',
  },
  {
    id: '3',
    name: 'Andi Wijaya',
    email: 'andi@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHyMMEdkLmESPaC-ZMKLnQnhr8g42Ef2BQcbLlDV5nXrefmnn9SNK7i4x0k78WBqjHXBMhmb1kVeoQW8w2TcKqFgabUO615nvSC75zNY0_pHwac5Re6sT6BYzK5ZCPHslv8S3W_PKK8aEBE1qDU_--NKx0KIo_Po2Gg_Pu_-AN88I9nOyyv0WOqUmP7rSY9FW5EdLRSURk7P38fj_HqjEEdw7McYs76m-edZN6E492XR1QV1BGjcszurZoU6dQaamlsyOhQGi3iAYf',
    role: 'Akuntan',
    marketplaces: ['Tokopedia'],
    status: 'Aktif',
  },
  {
    id: '4',
    name: 'Rina Putri',
    email: 'rina@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMWO0QHdqfILfEpg7V9ifZvbZ9r3yGGARTmO14OpE1uYlNiXMPWlbUHoS2XfryQqqU-DqPKEGZnyRrHpbk83v0w9wVM1JKRQibcHTSRaUtD5oruwMpfeSWWE201f1UT6Zt6SXrUeYSyvJPuCfZD12xHjn4kVa30ppl5cBHkF4OXABeGWLF-JCUEwtqH5rQf7tPwPzfKdE4ldHKXCFiXXSpBpZd7hnjmabHuwlB91kvcJnMiH5Y7LjuVeTXvKcpt65GoU5vfkGarmc',
    role: 'Staff Gudang',
    marketplaces: ['Lazada'],
    status: 'Non-aktif',
  },
]

export function EmployeeTable() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[180px]">Nama Karyawan</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[120px]">Peran</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[140px]">Marketplace Akses</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 min-w-[100px]">Status</th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-right min-w-[100px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {mockEmployees.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <Image src={e.avatar} alt={e.name} width={36} height={36} className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate leading-tight">{e.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{e.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase",
                    e.role === 'Admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}>
                    {e.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.marketplaces.map(m => (
                      <span key={m} className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", e.status === 'Aktif' ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600")} />
                    <span className={cn("text-[10px] font-bold uppercase", e.status === 'Aktif' ? "text-green-500" : "text-slate-400")}>
                      {e.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-all">
                      <Edit2 className="size-3.5" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-medium bg-slate-50/50 dark:bg-slate-800/30">
        <p className="text-slate-500 dark:text-slate-400">Menampilkan {mockEmployees.length} dari 5 karyawan</p>
        <div className="flex gap-2">
          <button className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            <ChevronLeft className="size-3.5" />
          </button>
          <button className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
