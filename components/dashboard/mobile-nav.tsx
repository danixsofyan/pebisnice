'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Wallet,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Home',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transaksi',
    url: '/transactions',
    icon: ReceiptText,
  },
  {
    title: 'Inventaris',
    url: '/inventory',
    icon: Package,
  },
  {
    title: 'Laporan',
    url: '/reports',
    icon: Wallet,
  },
  {
    title: 'Karyawan',
    url: '/employees',
    icon: Users,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white/80 px-2 pb-safe backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))
        
        return (
          <Link
            key={item.title}
            href={item.url}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive 
                ? "text-primary font-bold" 
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <item.icon className={cn("size-5", isActive && "fill-primary/10")} />
            <span className="text-[10px] uppercase tracking-tight">{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
