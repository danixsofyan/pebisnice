import { redirect } from 'next/navigation'
import { auth } from '@/auth'

// Billing pages shell. Requires login only, deliberately NOT behind the subscription gate, since this is exactly where users without a subscription or with an expired one must get in to pick or renew a plan.
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-3xl">{children}</div>
    </div>
  )
}
