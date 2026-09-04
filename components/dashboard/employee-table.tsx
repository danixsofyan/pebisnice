'use client'

import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiW07eQ1T5Jm8Q1BaUA3a7yM-F_TtqgBAs1MWBK99h-0fU8xIBSYDuc76R1Y0B0T_XTO3JVwz5yPJVvwgmCBP4hjO5TKvya5CxxeFiiBD5FFDdFEPuknheCcQOVQDDL_aCpdmMkV53Qclbs3qkj_TJeuqQwWS9u5tp_QWDC7pCWrwIqszlOlvZSyFLmjx8EdZc9i2nU5IeH3N_QuXXpG9BoSADAWbC3EM11kGvaazb3vruyqsTgXkhp15SSDBp2e_h-pGFI2aaO0RU',
    role: 'Admin',
    marketplaces: ['Semua'],
    status: 'Aktif',
  },
  {
    id: '2',
    name: 'Siti Aminah',
    email: 'siti@email.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAs9g-FTDjmhDGX7jUOPRGJym9PDRONPH2vacJ0ynAigo2pvTBnoLaXg5ZS1h_rwOnd4qhe3yl8rB7JIw7m0w4BrVnpns1iStip3oPyJoT7-x-kfWQC1rHxXfcXszWsLq4WXkw2NHtUoH4akWwXi-ngCUirBGzap11F8mP64HyKhPYvB8hekEnxl8JP_NvYvwF5DSOaZK0Q5sLb_fKbbzRhVMAkLm7hoKZ3zGw6VaZIWdTZDm86osWzsd9qsOx6k47VEkX8aV00Q9Ag',
    role: 'Staff Gudang',
    marketplaces: ['Shopee', 'TikTok Shop'],
    status: 'Aktif',
  },
  {
    id: '3',
    name: 'Andi Wijaya',
    email: 'andi@email.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHyMMEdkLmESPaC-ZMKLnQnhr8g42Ef2BQcbLlDV5nXrefmnn9SNK7i4x0k78WBqjHXBMhmb1kVeoQW8w2TcKqFgabUO615nvSC75zNY0_pHwac5Re6sT6BYzK5ZCPHslv8S3W_PKK8aEBE1qDU_--NKx0KIo_Po2Gg_Pu_-AN88I9nOyyv0WOqUmP7rSY9FW5EdLRSURk7P38fj_HqjEEdw7McYs76m-edZN6E492XR1QV1BGjcszurZoU6dQaamlsyOhQGi3iAYf',
    role: 'Akuntan',
    marketplaces: ['Tokopedia'],
    status: 'Aktif',
  },
  {
    id: '4',
    name: 'Rina Putri',
    email: 'rina@email.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMWO0QHdqfILfEpg7V9ifZvbZ9r3yGGARTmO14OpE1uYlNiXMPWlbUHoS2XfryQqqU-DqPKEGZnyRrHpbk83v0w9wVM1JKRQibcHTSRaUtD5oruwMpfeSWWE201f1UT6Zt6SXrUeYSyvJPuCfZD12xHjn4kVa30ppl5cBHkF4OXABeGWLF-JCUEwtqH5rQf7tPwPzfKdE4ldHKXCFiXXSpBpZd7hnjmabHuwlB91kvcJnMiH5Y7LjuVeTXvKcpt65GoU5vfkGarmc',
    role: 'Staff Gudang',
    marketplaces: ['Lazada'],
    status: 'Non-aktif',
  },
]

export function EmployeeTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
              <th className="min-w-[180px] border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                Nama Karyawan
              </th>
              <th className="min-w-[120px] border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                Peran
              </th>
              <th className="min-w-[140px] border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                Marketplace Akses
              </th>
              <th className="min-w-[100px] border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                Status
              </th>
              <th className="min-w-[100px] border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {mockEmployees.map((e) => (
              <tr
                key={e.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      <Image
                        src={e.avatar}
                        alt={e.name}
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs leading-tight font-semibold">{e.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{e.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                      e.role === 'Admin'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {e.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.marketplaces.map((m) => (
                      <span
                        key={m}
                        className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[8px] font-extrabold text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        e.status === 'Aktif' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase',
                        e.status === 'Aktif' ? 'text-green-500' : 'text-slate-400'
                      )}
                    >
                      {e.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="hover:text-primary hover:bg-primary/10 rounded p-1 text-slate-400 transition-all">
                      <Edit2 className="size-3.5" />
                    </button>
                    <button className="rounded p-1 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 text-[10px] font-medium dark:border-slate-800 dark:bg-slate-800/30">
        <p className="text-slate-500 dark:text-slate-400">
          Menampilkan {mockEmployees.length} dari 5 karyawan
        </p>
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-200 px-2.5 py-1 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-800">
            <ChevronLeft className="size-3.5" />
          </button>
          <button className="rounded-lg border border-slate-200 px-2.5 py-1 transition-colors hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
