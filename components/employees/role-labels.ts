export const ROLE_LABEL: Record<string, string> = {
  owner: 'Pemilik',
  admin: 'Admin',
  manager: 'Manajer',
  finance: 'Keuangan',
  cashier: 'Kasir',
  production: 'Produksi',
  operator: 'Operator',
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  invited: 'Diundang',
  disabled: 'Nonaktif',
}

export const ASSIGNABLE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manajer' },
  { value: 'finance', label: 'Keuangan' },
  { value: 'cashier', label: 'Kasir' },
  { value: 'production', label: 'Produksi' },
] as const
