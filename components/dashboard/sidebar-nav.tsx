'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Package,
  Factory,
  Wallet,
  Coins,
  Users,
  Settings,
} from 'lucide-react'
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Kasir',
    url: '/pos',
    icon: ShoppingCart,
  },
  {
    title: 'Transaksi',
    url: '/transactions',
    icon: ReceiptText,
  },
  {
    title: 'Produk',
    url: '/products',
    icon: Boxes,
  },
  {
    title: 'Inventaris',
    url: '/inventory',
    icon: Package,
  },
  {
    title: 'Produksi',
    url: '/production',
    icon: Factory,
  },
  {
    title: 'Pengeluaran',
    url: '/expenses',
    icon: Coins,
  },
  {
    title: 'Laporan Keuangan',
    url: '/reports',
    icon: Wallet,
  },
  {
    title: 'Karyawan',
    url: '/employees',
    icon: Users,
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-8">
      <div className="px-3">
        <h2 className="text-muted-foreground/30 mb-4 px-3 text-[10px] font-bold tracking-[0.15em] uppercase group-data-[collapsible=icon]:hidden">
          Main Menu
        </h2>
        <SidebarMenu className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      'group relative flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'size-[18px] shrink-0 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/80 group-hover:text-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        isActive ? 'font-bold' : 'font-medium',
                        'group-data-[collapsible=icon]:hidden'
                      )}
                    >
                      {item.title}
                    </span>
                    {isActive && (
                      <div className="bg-primary shadow-primary/40 absolute top-1/2 -right-3 h-5 w-[3px] -translate-y-1/2 rounded-l-full group-data-[collapsible=icon]:hidden" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </div>

      <div className="px-3">
        <h2 className="text-muted-foreground/30 mb-4 px-3 text-[10px] font-bold tracking-[0.15em] uppercase group-data-[collapsible=icon]:hidden">
          Account Settings
        </h2>
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Pengaturan">
              <Link
                href="/settings"
                className={cn(
                  'group relative flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  pathname === '/settings'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                )}
              >
                <Settings
                  className={cn(
                    'size-[18px] shrink-0 transition-colors',
                    pathname === '/settings'
                      ? 'text-primary'
                      : 'text-muted-foreground/80 group-hover:text-foreground'
                  )}
                />
                <span
                  className={cn(
                    pathname === '/settings' ? 'font-bold' : 'font-medium',
                    'group-data-[collapsible=icon]:hidden'
                  )}
                >
                  Pengaturan
                </span>
                {pathname === '/settings' && (
                  <div className="bg-primary shadow-primary/40 absolute top-1/2 -right-3 h-5 w-[3px] -translate-y-1/2 rounded-l-full group-data-[collapsible=icon]:hidden" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  )
}
