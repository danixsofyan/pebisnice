import {
  Activity,
} from 'lucide-react'

import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar'

export async function AppSidebar() {

  return (
    <Sidebar className="hidden md:flex border-r border-sidebar-border bg-sidebar" collapsible="icon">
      <SidebarHeader className="p-6 pb-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3.5 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
          <div className="bg-primary flex items-center justify-center rounded-xl p-2.5 shadow-lg shadow-primary/20 shrink-0 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:rounded-lg">
            <Activity className="size-6 group-data-[collapsible=icon]:size-5 text-white dark:text-background stroke-[2.5px]" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              Pebisnice
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 leading-none pt-1">
              Laporan Keuangan
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-6">
        <SidebarNav />
      </SidebarContent>
    </Sidebar>
  )
}
