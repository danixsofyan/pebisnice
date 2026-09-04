import { describe, expect, it } from 'vitest'
import { getTableColumns, type Table } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'

type ColumnMeta = {
  name: string
  columnType: string
  precision?: number
  scale?: number
  withTimezone?: boolean
}

const TABLES: Array<[string, Table]> = Object.entries(schema)
  .filter(([, value]) => typeof value === 'object' && value !== null && 'getSQL' in value)
  .map(([name, value]) => [name, value as unknown as Table])

function columnsOf(table: Table): ColumnMeta[] {
  return Object.values(getTableColumns(table)) as unknown as ColumnMeta[]
}

function tableByName(name: string): Table {
  const found = TABLES.find(([tableName]) => tableName === name)
  if (!found) throw new Error(`Tabel ${name} tidak ada di schema`)
  return found[1]
}

// Tabel milik Auth.js; bentuknya ditentukan adapter, bukan standar kita.
const AUTH_TABLES = ['users', 'accounts', 'sessions', 'verificationTokens']

// Ledger append-only: sengaja tanpa updated_at / deleted_at (db-standards.md §9).
const IMMUTABLE_TABLES = ['auditLogs', 'inventoryMovements', 'productCostHistory']

// Baris anak yang ikut terhapus bersama induknya lewat ON DELETE CASCADE.
const CHILD_TABLES = [
  'transactionFees',
  'transactionItems',
  'productionMaterials',
  'saleReturnItems',
  'stockTransferItems',
  'purchaseOrderItems',
  'onlineOrderItems',
]

describe('kepatuhan skema terhadap db-standards.md', () => {
  it('menemukan seluruh tabel yang diharapkan', () => {
    expect(TABLES.map(([name]) => name).sort()).toEqual([
      'accounts',
      'auditLogs',
      'branches',
      'cashSessions',
      'customers',
      'expenses',
      'fileUploads',
      'financialMutations',
      'inventory',
      'inventoryMovements',
      'onlineOrderItems',
      'onlineOrders',
      'plans',
      'productCostHistory',
      'productVariants',
      'productionLogs',
      'productionMaterials',
      'products',
      'projects',
      'purchaseOrderItems',
      'purchaseOrders',
      'saleReturnItems',
      'saleReturns',
      'sessions',
      'stockTransferItems',
      'stockTransfers',
      'stores',
      'subscriptionPayments',
      'subscriptions',
      'suppliers',
      'teamMembers',
      'transactionFees',
      'transactionItems',
      'transactions',
      'users',
      'verificationTokens',
    ])
  })

  it('memakai NUMERIC(18,2) untuk setiap kolom uang (§2)', () => {
    for (const [tableName, table] of TABLES) {
      for (const column of columnsOf(table)) {
        if (column.columnType !== 'PgNumeric') continue
        expect(
          {
            table: tableName,
            column: column.name,
            precision: column.precision,
            scale: column.scale,
          },
          `${tableName}.${column.name}`
        ).toEqual({ table: tableName, column: column.name, precision: 18, scale: 2 })
      }
    }
  })

  it('memakai TIMESTAMPTZ untuk setiap kolom waktu (§2)', () => {
    for (const [tableName, table] of TABLES) {
      for (const column of columnsOf(table)) {
        if (column.columnType !== 'PgTimestamp') continue
        expect(column.withTimezone, `${tableName}.${column.name} harus withTimezone`).toBe(true)
      }
    }
  })

  it('tidak memakai FLOAT atau DOUBLE untuk angka (§2)', () => {
    for (const [tableName, table] of TABLES) {
      for (const column of columnsOf(table)) {
        expect(['PgReal', 'PgDoublePrecision'], `${tableName}.${column.name}`).not.toContain(
          column.columnType
        )
      }
    }
  })

  it('memberi tabel bisnis kolom siklus hidup wajib (§3)', () => {
    const skip = new Set([...AUTH_TABLES, ...IMMUTABLE_TABLES, ...CHILD_TABLES])

    for (const [tableName, table] of TABLES) {
      if (skip.has(tableName)) continue

      const names = columnsOf(table).map((c) => c.name)
      for (const required of ['is_active', 'created_at', 'updated_at', 'deleted_at']) {
        expect(names, `${tableName} kurang kolom ${required}`).toContain(required)
      }
    }
  })

  it('menjaga tabel immutable tanpa updated_at dan deleted_at (§9)', () => {
    for (const tableName of IMMUTABLE_TABLES) {
      const names = columnsOf(tableByName(tableName)).map((c) => c.name)

      expect(names, `${tableName} tidak boleh punya updated_at`).not.toContain('updated_at')
      expect(names, `${tableName} tidak boleh punya deleted_at`).not.toContain('deleted_at')
    }
  })

  it('menyematkan branch_id di tabel yang ter-scope cabang', () => {
    for (const tableName of ['inventory', 'inventoryMovements']) {
      const names = columnsOf(tableByName(tableName)).map((c) => c.name)
      expect(names, `${tableName} butuh branch_id`).toContain('branch_id')
    }
  })

  it('menyematkan project_id di setiap tabel bisnis ter-scope tenant', () => {
    const tenantScoped = [
      'branches',
      'cashSessions',
      'customers',
      'expenses',
      'stores',
      'products',
      'productVariants',
      'productCostHistory',
      'transactions',
      'transactionFees',
      'transactionItems',
      'inventory',
      'inventoryMovements',
      'productionLogs',
      'productionMaterials',
      'teamMembers',
      'fileUploads',
      'financialMutations',
      'saleReturns',
      'saleReturnItems',
      'stockTransfers',
      'stockTransferItems',
      'suppliers',
      'purchaseOrders',
      'purchaseOrderItems',
      'onlineOrders',
      'onlineOrderItems',
    ]

    for (const tableName of tenantScoped) {
      const names = columnsOf(tableByName(tableName)).map((c) => c.name)
      expect(names, `${tableName} butuh project_id untuk RLS`).toContain('project_id')
    }
  })
})
