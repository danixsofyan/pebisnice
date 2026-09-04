'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveCustomerAction, deleteCustomerAction } from '@/app/actions/customer'

export interface EditableCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
}

export function CustomerForm({
  customer,
  onClose,
}: {
  customer?: EditableCustomer
  onClose?: () => void
}) {
  const router = useRouter()
  const isEdit = Boolean(customer)
  const [open, setOpen] = useState(isEdit)
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [note, setNote] = useState(customer?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await saveCustomerAction({
        ...(isEdit ? { id: customer!.id } : {}),
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
      })
      if (!res.success) return setError(res.error)
      if (isEdit) {
        onClose?.()
      } else {
        setName('')
        setPhone('')
        setEmail('')
        setAddress('')
        setNote('')
        setOpen(false)
      }
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Tambah pelanggan</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-name">Nama</Label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-phone">Telepon</Label>
          <Input
            id="c-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="0812…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-address">Alamat</Label>
          <Input id="c-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="c-note">Catatan</Label>
          <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || name.trim().length === 0}>
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
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive ml-auto"
            disabled={isPending}
            onClick={() => {
              if (!confirm('Hapus pelanggan ini?')) return
              startTransition(async () => {
                const res = await deleteCustomerAction(customer!.id)
                if (!res.success) return setError(res.error)
                onClose?.()
                router.refresh()
              })
            }}
          >
            Hapus
          </Button>
        ) : null}
      </div>
    </form>
  )
}
