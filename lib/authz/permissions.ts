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
  | 'owner'
  | 'admin'
  | 'manager'
  | 'finance'
  | 'cashier'
  | 'production'
  | 'operator'

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

/**
 * Gerbang tunggal untuk HPP. Peran yang tidak memilikinya tidak pernah
 * menerima kolom biaya dalam bentuk apa pun — bukan disembunyikan di UI,
 * melainkan tidak ikut di-select dari database.
 */
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

  // Peran warisan v1.0: pengunggah data marketplace. Sengaja TIDAK dipetakan
  // ke cashier — itu akan mencabut `data:upload` yang sudah dipakai. Nilai
  // enum lama di database tetap berfungsi apa adanya.
  operator: ['project:view', 'data:upload'],
}

export function hasRolePermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role as TeamRole]?.includes(permission) ?? false
}

/** Peran yang boleh melihat HPP. Dipakai test untuk mengunci daftarnya. */
export function canRoleViewCost(role: string): boolean {
  return hasRolePermission(role, COST_PERMISSION)
}

/**
 * Cakupan cabang seorang anggota tim. `null` berarti seluruh cabang —
 * dipakai owner, admin, dan finance.
 */
export function isBranchAllowed(memberBranchId: string | null, targetBranchId: string): boolean {
  if (memberBranchId === null) return true
  return memberBranchId === targetBranchId
}
