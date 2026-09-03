import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS, hasRolePermission } from '@/lib/authz/permissions'

describe('hasRolePermission', () => {
  it('memberi owner seluruh permission', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasRolePermission('owner', permission)).toBe(true)
    }
  })

  it('melarang admin menghapus project', () => {
    expect(hasRolePermission('admin', 'project:delete')).toBe(false)
    expect(hasRolePermission('admin', 'project:edit')).toBe(true)
  })

  it('membatasi finance pada akses baca saja', () => {
    expect(hasRolePermission('finance', 'project:view')).toBe(true)
    expect(hasRolePermission('finance', 'report:view')).toBe(true)
    expect(hasRolePermission('finance', 'product:manage')).toBe(false)
    expect(hasRolePermission('finance', 'data:upload')).toBe(false)
  })

  it('membatasi operator pada lihat project dan unggah data', () => {
    expect(hasRolePermission('operator', 'project:view')).toBe(true)
    expect(hasRolePermission('operator', 'data:upload')).toBe(true)
    expect(hasRolePermission('operator', 'report:view')).toBe(false)
    expect(hasRolePermission('operator', 'team:manage')).toBe(false)
  })

  it('menolak peran yang tidak dikenal', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasRolePermission('cashier', permission)).toBe(false)
      expect(hasRolePermission('', permission)).toBe(false)
    }
  })
})
