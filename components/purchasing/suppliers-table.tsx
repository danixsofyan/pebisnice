'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SupplierForm, type EditableSupplier } from '@/components/purchasing/supplier-form'

export function SuppliersTable({ suppliers }: { suppliers: EditableSupplier[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Nama</th>
            <th className="px-4 py-3 font-medium">Telepon</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) =>
            editingId === s.id ? (
              <tr key={s.id} className="border-border border-t">
                <td colSpan={4} className="p-4">
                  <SupplierForm supplier={s} onClose={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={s.id} className="border-border border-t">
                <td className="px-4 py-3">{s.name}</td>
                <td className="text-muted-foreground px-4 py-3">{s.phone ?? '—'}</td>
                <td className="text-muted-foreground px-4 py-3">{s.email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(s.id)}>
                    Edit
                  </Button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}
