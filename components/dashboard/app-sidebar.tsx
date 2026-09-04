import { Activity } from 'lucide-react'

import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar'

export async function AppSidebar() {
  return (
    <Sidebar
      className="border-sidebar-border bg-sidebar hidden border-r md:flex"
      collapsible="icon"
    >
      <SidebarHeader className="p-6 pb-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <div className="bg-primary shadow-primary/20 flex shrink-0 items-center justify-center rounded-xl p-2.5 shadow-lg group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:p-1.5">
            <Activity className="dark:text-background size-6 stroke-[2.5px] text-white group-data-[collapsible=icon]:size-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-foreground text-xl leading-tight font-bold tracking-tight">
              Pebisnice
            </h1>
            <p className="text-muted-foreground/40 pt-1 text-[9px] leading-none font-bold tracking-[0.2em] uppercase">
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
