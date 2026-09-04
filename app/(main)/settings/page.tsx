import { getSessionContext } from '@/lib/auth/session-context'
import { projectService } from '@/lib/services/project.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { SettingsForm } from '@/components/settings/settings-form'

export default async function SettingsPage() {
  const context = await getSessionContext()
  const settings = await projectService.getSettings(context.projectId, context.userId)
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
    </div>
  )
}
