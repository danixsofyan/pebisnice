import { adminService } from '@/lib/services/admin.service'
import { PlanEditor } from '@/components/admin/plan-editor'

export default async function AdminPlansPage() {
  const plans = await adminService.listAllPlans()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Paket</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Perubahan berlaku untuk checkout dan trial berikutnya. Langganan yang sedang berjalan
          tidak terpengaruh.
        </p>
      </div>

      <PlanEditor
        plans={plans.map((plan) => ({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          interval: plan.interval,
          price: plan.price,
          trialDays: plan.trialDays,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        }))}
      />
    </div>
  )
}
