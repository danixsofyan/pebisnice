export type Permission =
  | 'project:view'
  | 'project:edit'
  | 'project:delete'
  | 'branch:manage'
  | 'store:manage'
  | 'product:manage'
  | 'cost:view'
  | 'inventory:adjust'
  | 'production:manage'
  | 'pos:operate'
  | 'pos:void'
  | 'cash_session:manage'
  | 'expense:manage'
  | 'report:view'
  | 'team:manage'
  | 'audit:view'
  | 'data:upload'

export type TeamRole =
  'owner' | 'admin' | 'manager' | 'finance' | 'cashier' | 'production' | 'operator'

export const ALL_PERMISSIONS: readonly Permission[] = [
  'project:view',
  'project:edit',
  'project:delete',
  'branch:manage',
  'store:manage',
  'product:manage',
  'cost:view',
  'inventory:adjust',
  'production:manage',
  'pos:operate',
  'pos:void',
  'cash_session:manage',
  'expense:manage',
  'report:view',
  'team:manage',
  'audit:view',
  'data:upload',
]

// The single gate for HPP. Roles without it never receive cost columns in any form; not hidden in the UI, but not selected from the database.
export const COST_PERMISSION: Permission = 'cost:view'

const CASHIER_PERMISSIONS: readonly Permission[] = [
  'project:view',
  'pos:operate',
  'cash_session:manage',
]

const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,

  admin: ALL_PERMISSIONS.filter((permission) => permission !== 'project:delete'),

  manager: [
    'project:view',
    'store:manage',
    'product:manage',
    'cost:view',
    'inventory:adjust',
    'production:manage',
    'pos:operate',
    'pos:void',
    'cash_session:manage',
    'expense:manage',
    'report:view',
    'data:upload',
  ],

  finance: ['project:view', 'cost:view', 'expense:manage', 'report:view'],

  cashier: CASHIER_PERMISSIONS,

  production: ['project:view', 'production:manage'],

  // Legacy v1.0 role: marketplace data uploader. Deliberately NOT mapped to cashier, which would remove data:upload; old enum rows keep working as-is.
  operator: ['project:view', 'data:upload'],
}

export function hasRolePermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role as TeamRole]?.includes(permission) ?? false
}

/** Roles allowed to view HPP; tests lock the list. */
export function canRoleViewCost(role: string): boolean {
  return hasRolePermission(role, COST_PERMISSION)
}

// A member's branch scope. null means all branches, used by owner, admin, and finance.
export function isBranchAllowed(memberBranchId: string | null, targetBranchId: string): boolean {
  if (memberBranchId === null) return true
  return memberBranchId === targetBranchId
}
