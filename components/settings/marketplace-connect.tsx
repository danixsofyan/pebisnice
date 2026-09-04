'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  startShopeeConnectAction,
  disconnectStoreAction,
  syncShopeeNowAction,
} from '@/app/actions/integrations'

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

export function MarketplaceConnect({
  stores,
  branches,
}: {
  stores: StoreRow[]
  branches: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function connectShopee() {
    setError(null)
    startTransition(async () => {
      const result = await startShopeeConnectAction({ branchId: branchId || null })
      if (!result.success) return setError(result.error)
      window.location.href = result.data.url
    })
  }

  function syncNow(id: string) {
    setError(null)
    setNotice(null)
    setBusy(id)
    startTransition(async () => {
      const result = await syncShopeeNowAction(id)
      setBusy(null)
      if (!result.success) return setError(result.error)
      setNotice(`Sinkron selesai: ${result.data.inserted} baru, ${result.data.skipped} dilewati.`)
      router.refresh()
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
      <div>
        <h2 className="font-semibold">Integrasi marketplace</h2>
        <p className="text-muted-foreground text-sm">
          Hubungkan toko Shopee untuk menarik pesanan otomatis.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {branches.length > 1 ? (
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Masuk ke cabang</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button onClick={connectShopee} disabled={isPending}>
          {isPending && !busy ? 'Memproses…' : 'Hubungkan Shopee'}
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

      {stores.length > 0 ? (
        <div className="divide-border divide-y">
          {stores.map((store) => (
            <div key={store.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium">{store.storeName}</div>
                <div className="text-muted-foreground text-xs">
                  {store.platform} · {STATUS_LABEL[store.syncStatus] ?? store.syncStatus}
                  {store.lastSyncedAt
                    ? ` · sinkron terakhir ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(store.lastSyncedAt)}`
                    : ''}
                </div>
                {store.syncStatus === 'error' && store.syncError ? (
                  <div className="text-destructive text-xs">{store.syncError}</div>
                ) : null}
              </div>
              {store.syncStatus !== 'disconnected' ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncNow(store.id)}
                    disabled={isPending}
                  >
                    {busy === store.id ? 'Menyinkron…' : 'Sinkron sekarang'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnect(store.id)}
                    disabled={isPending}
                  >
                    Putuskan
                  </Button>
                </div>
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
