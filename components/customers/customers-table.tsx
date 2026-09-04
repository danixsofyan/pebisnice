'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CustomerForm, type EditableCustomer } from '@/components/customers/customer-form'

export function CustomersTable({ customers }: { customers: EditableCustomer[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Nama</th>
            <th className="px-4 py-3 font-medium">Telepon</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Catatan</th>
            <th className="px-4 py-3 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) =>
            editingId === c.id ? (
              <tr key={c.id} className="border-border border-t">
                <td colSpan={5} className="p-4">
                  <CustomerForm customer={c} onClose={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={c.id} className="border-border border-t">
                <td className="px-4 py-3">{c.name}</td>
                <td className="text-muted-foreground px-4 py-3 tabular-nums">{c.phone ?? '—'}</td>
                <td className="text-muted-foreground px-4 py-3">{c.email ?? '—'}</td>
                <td className="text-muted-foreground px-4 py-3">{c.note ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(c.id)}>
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
