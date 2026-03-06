import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
