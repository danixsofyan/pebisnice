'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveSupplierAction } from '@/app/actions/purchasing'

export interface EditableSupplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  note: string | null
}

export function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: EditableSupplier
  onClose?: () => void
}) {
  const router = useRouter()
  const isEdit = Boolean(supplier)
  const [open, setOpen] = useState(isEdit)
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [note, setNote] = useState(supplier?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await saveSupplierAction({
        ...(isEdit ? { id: supplier!.id } : {}),
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        note: note.trim() || undefined,
      })
      if (!res.success) return setError(res.error)
      if (isEdit) onClose?.()
      else {
        setName('')
        setPhone('')
        setEmail('')
        setNote('')
        setOpen(false)
      }
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Tambah supplier</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sup-name">Nama</Label>
          <Input
            id="sup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup-phone">Telepon</Label>
          <Input
            id="sup-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup-email">Email</Label>
          <Input
            id="sup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup-note">Catatan</Label>
          <Input id="sup-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (isEdit ? onClose?.() : setOpen(false))}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
