'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createProductAction,
  discardUnsavedImageAction,
  updateProductAction,
  uploadProductImageAction,
} from '@/app/actions/catalog'
import { IMAGE_ACCEPT } from '@/lib/domain/media/image'
import { fileProxyUrl } from '@/lib/storage'

export interface EditableProduct {
  productId: string
  name: string
  type: 'finished' | 'material'
  sku: string | null
  variantName: string | null
  /** String desimal, atau null bila peran tak boleh melihat HPP. */
  hpp: string | null
  imageKey: string | null
}

interface ProductFormProps {
  branchId: string
  canViewCost: boolean
  /** Bila diisi, form berjalan dalam mode edit. */
  product?: EditableProduct
  /** Mode edit: dipanggil saat selesai atau batal, agar induk menutup form. */
  onClose?: () => void
}

/**
 * Form tambah/ubah produk.
 *
 * Field HPP hanya tampil untuk peran berhak — dan bila dikirim paksa pun,
 * service tetap mengabaikannya. Foto diunggah saat dipilih; kunci yang belum
 * jadi disimpan dibuang saat pengguna mengganti pilihan atau membatalkan, agar
 * tidak menjadi berkas yatim.
 */
export function ProductForm({ branchId, canViewCost, product, onClose }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(product)
  const savedKey = product?.imageKey ?? null

  const [open, setOpen] = useState(isEdit)
  const [name, setName] = useState(product?.name ?? '')
  const [type, setType] = useState<'finished' | 'material'>(product?.type ?? 'finished')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [variantName, setVariantName] = useState(product?.variantName ?? '')
  const [hpp, setHpp] = useState(product?.hpp ?? '')
  const [initialStock, setInitialStock] = useState('')

  const [imageKey, setImageKey] = useState<string | null>(savedKey)
  const [unsavedKey, setUnsavedKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(savedKey ? fileProxyUrl(savedKey) : null)
  const [isUploading, setUploading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function replacePreview(next: string | null) {
    setPreview((previous) => {
      if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
      return next
    })
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    try {
      // Buang unggahan sebelumnya yang belum tersimpan sebelum menaruh yang baru.
      if (unsavedKey) await discardUnsavedImageAction(unsavedKey)

      const data = new FormData()
      data.set('file', file)
      const result = await uploadProductImageAction(data)

      if (!result.success) {
        setError(result.error)
        return
      }

      setImageKey(result.data.imageKey)
      setUnsavedKey(result.data.imageKey)
      replacePreview(URL.createObjectURL(file))
    } finally {
      setUploading(false)
    }
  }

  async function removeImage() {
    if (unsavedKey) await discardUnsavedImageAction(unsavedKey)
    setUnsavedKey(null)
    setImageKey(null)
    replacePreview(null)
  }

  async function discardPending() {
    // Kunci yang diunggah sesi ini dan belum jadi foto tersimpan.
    if (unsavedKey && unsavedKey !== savedKey) {
      await discardUnsavedImageAction(unsavedKey)
    }
  }

  function resetCreateForm() {
    setName('')
    setSku('')
    setVariantName('')
    setHpp('')
    setInitialStock('')
    setImageKey(null)
    setUnsavedKey(null)
    replacePreview(null)
  }

  async function cancel() {
    await discardPending()
    if (isEdit) {
      onClose?.()
    } else {
      resetCreateForm()
      setOpen(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction({
            productId: product!.productId,
            name,
            type,
            sku: sku.trim() || undefined,
            variantName: variantName.trim() || undefined,
            hpp: Number(hpp || 0).toFixed(2),
            imageKey,
          })
        : await createProductAction({
            branchId,
            name,
            type,
            sku: sku.trim() || undefined,
            variantName: variantName.trim() || undefined,
            hpp: Number(hpp || 0).toFixed(2),
            initialStock: Number(initialStock || 0),
            imageKey: imageKey ?? undefined,
          })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Tersimpan: kunci ini bukan lagi yatim.
      setUnsavedKey(null)

      if (isEdit) {
        onClose?.()
      } else {
        resetCreateForm()
        setOpen(false)
      }
      router.refresh()
    })
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Tambah produk</Button>
  }

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Nama produk</Label>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-type">Tipe</Label>
          <select
            id="p-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'finished' | 'material')}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="finished">Produk jadi (bisa dijual)</option>
            <option value="material">Bahan (untuk produksi)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-sku">SKU (opsional)</Label>
          <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-variant">Varian (opsional)</Label>
          <Input
            id="p-variant"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="Sedang, Merah, 500gr"
          />
        </div>

        {canViewCost ? (
          <div className="space-y-2">
            <Label htmlFor="p-hpp">HPP</Label>
            <Input
              id="p-hpp"
              value={hpp}
              onChange={(e) => setHpp(e.target.value)}
              inputMode="numeric"
              placeholder="0"
            />
          </div>
        ) : null}

        {!isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="p-stock">Stok awal</Label>
            <Input
              id="p-stock"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              inputMode="numeric"
              placeholder="0"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="p-image">Foto (opsional)</Label>
        <div className="flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal / proxy dinamis, bukan aset next/image
            <img
              src={preview}
              alt="Pratinjau foto produk"
              className="border-border h-16 w-16 rounded-md border object-cover"
            />
          ) : (
            <div className="border-border text-muted-foreground flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs">
              16:9
            </div>
          )}
          <div className="space-y-1">
            <Input
              id="p-image"
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={handleFile}
              disabled={isUploading}
              className="text-sm"
            />
            {isUploading ? (
              <p className="text-muted-foreground text-xs">Mengunggah…</p>
            ) : imageKey ? (
              <button
                type="button"
                onClick={removeImage}
                className="text-muted-foreground hover:text-destructive text-xs underline"
              >
                Hapus foto
              </button>
            ) : (
              <p className="text-muted-foreground text-xs">JPG, PNG, atau WebP · maks 2 MB</p>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || isUploading || name.trim().length === 0}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={cancel} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}
