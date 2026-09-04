'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/reports', label: 'Laba-Rugi' },
  { href: '/reports/shifts', label: 'Shift Kasir' },
  { href: '/reports/products', label: 'Produk Terlaris' },
]

export function ReportsTabs() {
  const pathname = usePathname()
  return (
    <div className="border-border flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
