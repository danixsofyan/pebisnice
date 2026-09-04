import { getSessionContext } from '@/lib/auth/session-context'
import { projectService } from '@/lib/services/project.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { SettingsForm } from '@/components/settings/settings-form'
import { MarketplaceConnect } from '@/components/settings/marketplace-connect'
import { storeService } from '@/lib/services/store.service'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shopee?: string }>
}) {
  const context = await getSessionContext()
  const params = await searchParams
  const settings = await projectService.getSettings(context.projectId, context.userId)
  const stores = await storeService.list(context.projectId, context.userId)
  const canEdit = hasRolePermission(context.role, 'project:edit')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Pengaturan bisnis</h1>
        <p className="text-muted-foreground text-sm">Detail dan preferensi {settings.name}</p>
      </div>

      <div className="border-border bg-card grid grid-cols-2 gap-4 rounded-xl border p-6 text-sm">
        <div>
          <p className="text-muted-foreground">Mata uang</p>
          <p className="font-medium">{settings.currency}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Zona waktu</p>
          <p className="font-medium">{settings.timezone}</p>
        </div>
      </div>

      {canEdit ? (
        <SettingsForm
          initial={{
            name: settings.name,
            description: settings.description ?? '',
            defaultCalcMethod: settings.defaultCalcMethod,
          }}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Hanya pemilik dan admin yang dapat mengubah pengaturan bisnis.
        </p>
      )}

      {params.shopee === 'connected' ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          Toko Shopee berhasil dihubungkan.
        </p>
      ) : params.shopee === 'error' ? (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border p-3 text-sm">
          Gagal menghubungkan Shopee. Coba lagi.
        </p>
      ) : null}

      <MarketplaceConnect stores={stores} />
    </div>
  )
}
