import { auth } from '@/auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { MobileNav } from '@/components/dashboard/mobile-nav'

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user

  return (
    <SidebarProvider>
      <div className="bg-background font-display flex min-h-screen w-full text-slate-900 dark:text-slate-100">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader user={user} />
          <main className="custom-scrollbar flex-1 overflow-y-auto p-8 pb-32 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-8">{children}</div>
          </main>
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  )
}
