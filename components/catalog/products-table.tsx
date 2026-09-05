'use client'

import { useState } from 'react'
import type { ProductListItem } from '@/lib/services/catalog.service'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { fileProxyUrl } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { ProductForm } from '@/components/catalog/product-form'
import { HppHistory } from '@/components/catalog/hpp-history'

interface ProductsTableProps {
  items: ProductListItem[]
  branchId: string
  canViewCost: boolean
  canManage: boolean
}

// Product table with in-place edit. The row being edited is replaced by a full-width edit form so the list context stays visible.
export function ProductsTable({ items, branchId, canViewCost, canManage }: ProductsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const columnCount = 4 + (canViewCost ? 1 : 0) + (canManage ? 1 : 0)

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="w-14 px-4 py-3 font-medium">Foto</th>
            <th className="px-4 py-3 font-medium">Nama</th>
            <th className="px-4 py-3 font-medium">Tipe</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 text-right font-medium">Stok</th>
            {canViewCost ? <th className="px-4 py-3 text-right font-medium">HPP</th> : null}
            {canManage ? <th className="px-4 py-3 text-right font-medium">Aksi</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            editingId === item.productId ? (
              <tr key={item.variantId} className="border-border border-t">
                <td colSpan={columnCount} className="p-4">
                  <ProductForm
                    branchId={branchId}
                    canViewCost={canViewCost}
                    product={{
                      productId: item.productId,
                      name: item.name,
                      category: item.category,
                      type: item.type,
                      sku: item.sku,
                      barcode: item.barcode,
                      variantName: item.variantName,
                      hpp: item.hpp,
                      productionWage: item.productionWage,
                      price: item.price,
                      imageKey: item.imageKey,
                    }}
                    onClose={() => setEditingId(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={item.variantId} className="border-border border-t">
                <td className="px-4 py-3">
                  {item.imageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served by a same-origin dynamic proxy, not a next/image asset
                    <img
                      src={fileProxyUrl(item.imageKey)}
                      alt={item.name}
                      className="border-border h-10 w-10 rounded-md border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="bg-muted h-10 w-10 rounded-md" />
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.name}
                  {item.variantName ? (
                    <span className="text-muted-foreground"> · {item.variantName}</span>
                  ) : null}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {item.type === 'finished' ? 'Produk jadi' : 'Bahan'}
                </td>
                <td className="text-muted-foreground px-4 py-3">{item.sku ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{item.stockQty}</td>
                {canViewCost ? (
                  <td className="px-4 py-3 text-right">
                    <div className="tabular-nums">
                      {item.hpp ? formatRupiahFromDecimal(item.hpp) : '—'}
                    </div>
                    <HppHistory variantId={item.variantId} />
                  </td>
                ) : null}
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(item.productId)}
                    >
                      Edit
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}
