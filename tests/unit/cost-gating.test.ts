import { describe, expect, it } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import {
  ALL_PERMISSIONS,
  COST_PERMISSION,
  canRoleViewCost,
  hasRolePermission,
  type TeamRole,
} from '@/lib/authz/permissions'
import {
  COST_FIELDS,
  containsCostField,
  hasCost,
  stripCostFields,
  type VariantWithCost,
  type VariantWithoutCost,
} from '@/lib/domain/catalog/variant-view'
import { productVariants, transactionItems } from '@/lib/db/schema'

const ALL_ROLES: TeamRole[] = [
  'owner',
  'admin',
  'manager',
  'finance',
  'cashier',
  'production',
  'operator',
]

const ROLES_WITH_COST: TeamRole[] = ['owner', 'admin', 'manager', 'finance']
const ROLES_WITHOUT_COST: TeamRole[] = ['cashier', 'production', 'operator']

describe('gerbang cost:view', () => {
  it('mengunci daftar peran yang boleh melihat HPP', () => {
    expect(ALL_ROLES.filter(canRoleViewCost).sort()).toEqual([...ROLES_WITH_COST].sort())
  })

  it('menolak HPP untuk kasir, produksi, dan operator warisan', () => {
    for (const role of ROLES_WITHOUT_COST) {
      expect(canRoleViewCost(role), `${role} tidak boleh melihat HPP`).toBe(false)
      expect(hasRolePermission(role, COST_PERMISSION), role).toBe(false)
    }
  })

  it('mempertahankan data:upload milik operator warisan', () => {
    expect(hasRolePermission('operator', 'data:upload')).toBe(true)
    expect(hasRolePermission('cashier', 'data:upload')).toBe(false)
  })

  it('tidak memberi kasir kemampuan mengelola produk atau laporan', () => {
    for (const permission of ['product:manage', 'report:view', 'expense:manage'] as const) {
      expect(hasRolePermission('cashier', permission), permission).toBe(false)
    }
  })

  it('membatasi produksi hanya pada modul produksi', () => {
    expect(hasRolePermission('production', 'production:manage')).toBe(true)
    expect(hasRolePermission('production', 'pos:operate')).toBe(false)
    expect(hasRolePermission('production', 'inventory:adjust')).toBe(false)
  })

  it('memberi owner seluruh permission dan admin semua kecuali hapus project', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasRolePermission('owner', permission), permission).toBe(true)
    }
    expect(hasRolePermission('admin', 'project:delete')).toBe(false)
    expect(hasRolePermission('admin', 'cost:view')).toBe(true)
  })

  it('menolak peran yang tidak dikenal', () => {
    expect(canRoleViewCost('superadmin')).toBe(false)
    expect(canRoleViewCost('')).toBe(false)
  })
})

describe('bentuk tampilan varian', () => {
  const withoutCost: VariantWithoutCost = {
    id: 'v1',
    projectId: 'p1',
    productId: 'pr1',
    skuVariant: 'SKU-1',
    variantName: 'Merah',
  }

  const withCost: VariantWithCost = {
    ...withoutCost,
    hpp: '12500.00',
    hppUpdatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  it('membedakan kedua bentuk lewat type guard', () => {
    expect(hasCost(withCost)).toBe(true)
    expect(hasCost(withoutCost)).toBe(false)
  })

  it('tidak menyisakan field biaya pada bentuk tanpa biaya', () => {
    expect(containsCostField(withoutCost)).toBe(false)
    expect(Object.keys(withoutCost)).not.toContain('hpp')
  })

  it('membuang seluruh field biaya lewat jaring pengaman', () => {
    const stripped = stripCostFields(withCost)

    expect(containsCostField(stripped)).toBe(false)
    expect(JSON.stringify(stripped)).not.toContain('12500')
    expect(stripped).toEqual(withoutCost)
  })

  it('membuang field biaya bernama lain juga', () => {
    const leaky = { id: 'x', hpp_at_time: '100', costAmount: '200', cost: '300', name: 'aman' }

    expect(stripCostFields(leaky)).toEqual({ id: 'x', name: 'aman' })
  })
})

describe('kolom biaya di skema', () => {
  it('mencatat setiap kolom biaya yang ada agar tidak ada yang terlewat', () => {
    const variantColumns = Object.keys(getTableColumns(productVariants))
    const itemColumns = Object.keys(getTableColumns(transactionItems))

    expect(variantColumns).toContain('hpp')
    expect(itemColumns).toContain('hppAtTime')

    // Bila kolom biaya baru ditambahkan ke skema, COST_FIELDS harus menyusul.
    const knownCostColumns = ['hpp', 'hppUpdatedAt', 'hppAtTime']
    const schemaCostColumns = [...variantColumns, ...itemColumns].filter((name) =>
      name.toLowerCase().includes('hpp')
    )

    expect([...new Set(schemaCostColumns)].sort()).toEqual([...knownCostColumns].sort())
  })

  it('menutup setiap kolom biaya skema dengan entri di COST_FIELDS', () => {
    const normalize = (value: string) => value.toLowerCase().replace(/_/g, '')
    const covered = COST_FIELDS.map(normalize)

    for (const column of ['hpp', 'hppUpdatedAt', 'hppAtTime']) {
      expect(covered, `${column} belum tercakup COST_FIELDS`).toContain(normalize(column))
    }
  })
})
