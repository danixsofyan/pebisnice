import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS, hasRolePermission, isBranchAllowed } from '@/lib/authz/permissions'

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

  it('memberi finance akses laporan dan biaya, tanpa mengubah stok', () => {
    expect(hasRolePermission('finance', 'project:view')).toBe(true)
    expect(hasRolePermission('finance', 'report:view')).toBe(true)
    expect(hasRolePermission('finance', 'cost:view')).toBe(true)
    expect(hasRolePermission('finance', 'expense:manage')).toBe(true)
    expect(hasRolePermission('finance', 'product:manage')).toBe(false)
    expect(hasRolePermission('finance', 'inventory:adjust')).toBe(false)
    expect(hasRolePermission('finance', 'data:upload')).toBe(false)
  })

  it('mempertahankan permission operator warisan v1.0', () => {
    expect(hasRolePermission('operator', 'project:view')).toBe(true)
    expect(hasRolePermission('operator', 'data:upload')).toBe(true)
    expect(hasRolePermission('operator', 'report:view')).toBe(false)
    expect(hasRolePermission('operator', 'team:manage')).toBe(false)
    expect(hasRolePermission('operator', 'cost:view')).toBe(false)
  })

  it('menolak peran yang tidak dikenal', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasRolePermission('superadmin', permission)).toBe(false)
      expect(hasRolePermission('', permission)).toBe(false)
    }
  })
})

describe('isBranchAllowed', () => {
  const bandung = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
  const jakarta = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

  it('mengizinkan seluruh cabang saat cakupan anggota null', () => {
    expect(isBranchAllowed(null, bandung)).toBe(true)
    expect(isBranchAllowed(null, jakarta)).toBe(true)
  })

  it('mengizinkan hanya cabang yang cocok', () => {
    expect(isBranchAllowed(bandung, bandung)).toBe(true)
  })

  it('menolak cabang lain', () => {
    expect(isBranchAllowed(bandung, jakarta)).toBe(false)
    expect(isBranchAllowed(jakarta, bandung)).toBe(false)
  })
})
