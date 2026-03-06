'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Wallet,
  Users,
  Settings,
} from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const mainNavItems = [
  {
    title: 'Dashboard',
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
        <h2 className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/30 group-data-[collapsible=icon]:hidden">
          Main Menu
        </h2>
        <SidebarMenu className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "relative flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-medium transition-all group",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("size-[18px] transition-colors shrink-0", isActive ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground")} />
                    <span className={cn(isActive ? "font-bold" : "font-medium", "group-data-[collapsible=icon]:hidden")}>{item.title}</span>
                    {isActive && (
                      <div className="absolute -right-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] group-data-[collapsible=icon]:hidden" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </div>

      <div className="px-3">
        <h2 className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/30 group-data-[collapsible=icon]:hidden">
          Account Settings
        </h2>
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Pengaturan">
              <Link
                href="/settings"
                className={cn(
                  "relative flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-medium transition-all group",
                  pathname === '/settings'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <Settings className={cn("size-[18px] transition-colors shrink-0", pathname === '/settings' ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground")} />
                <span className={cn(pathname === '/settings' ? "font-bold" : "font-medium", "group-data-[collapsible=icon]:hidden")}>Pengaturan</span>
                {pathname === '/settings' && (
                  <div className="absolute -right-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] group-data-[collapsible=icon]:hidden" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  )
}
