'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { startShopeeConnectAction, disconnectStoreAction } from '@/app/actions/integrations'

interface StoreRow {
  id: string
  storeName: string
  platform: string
  syncStatus: string
  lastSyncedAt: Date | null
  syncError: string | null
}

const STATUS_LABEL: Record<string, string> = {
  connected: 'Terhubung',
  syncing: 'Menyinkron',
  error: 'Error',
  disconnected: 'Terputus',
}

export function MarketplaceConnect({ stores }: { stores: StoreRow[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function connectShopee() {
    setError(null)
    startTransition(async () => {
      const result = await startShopeeConnectAction()
      if (!result.success) return setError(result.error)
      window.location.href = result.data.url
    })
  }

  function disconnect(id: string) {
    if (!confirm('Putuskan koneksi toko ini?')) return
    startTransition(async () => {
      await disconnectStoreAction(id)
      router.refresh()
    })
  }

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Integrasi marketplace</h2>
          <p className="text-muted-foreground text-sm">
            Hubungkan toko Shopee untuk menarik pesanan otomatis.
          </p>
        </div>
        <Button onClick={connectShopee} disabled={isPending}>
          {isPending ? 'Memproses…' : 'Hubungkan Shopee'}
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {stores.length > 0 ? (
        <div className="divide-border divide-y">
          {stores.map((store) => (
            <div key={store.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{store.storeName}</div>
                <div className="text-muted-foreground text-xs">
                  {store.platform} · {STATUS_LABEL[store.syncStatus] ?? store.syncStatus}
                  {store.lastSyncedAt
                    ? ` · sinkron terakhir ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(store.lastSyncedAt)}`
                    : ''}
                </div>
              </div>
              {store.syncStatus !== 'disconnected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect(store.id)}
                  disabled={isPending}
                >
                  Putuskan
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Belum ada toko terhubung.</p>
      )}
    </div>
  )
}
