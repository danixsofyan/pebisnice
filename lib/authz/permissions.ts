export type Permission =
  | 'project:view'
  | 'project:edit'
  | 'project:delete'
  | 'store:manage'
  | 'product:manage'
  | 'report:view'
  | 'team:manage'
  | 'data:upload'

export type TeamRole = 'owner' | 'admin' | 'finance' | 'operator'

export const ALL_PERMISSIONS: readonly Permission[] = [
  'project:view',
  'project:edit',
  'project:delete',
  'store:manage',
  'product:manage',
  'report:view',
  'team:manage',
  'data:upload',
]

const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: [
    'project:view',
    'project:edit',
    'store:manage',
    'product:manage',
    'report:view',
    'team:manage',
    'data:upload',
  ],
  finance: ['project:view', 'report:view'],
  operator: ['project:view', 'data:upload'],
}

export function hasRolePermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role as TeamRole]?.includes(permission) ?? false
}
