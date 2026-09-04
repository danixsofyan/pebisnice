'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addMemberAction } from '@/app/actions/team'
import { ASSIGNABLE_ROLE_OPTIONS } from './role-labels'

export function AddMemberForm({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('cashier')
  const [branchId, setBranchId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addMemberAction({ email, role, branchId: branchId || null })
      if (!result.success) return setError(result.error)
      setEmail('')
      setBranchId('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Tambah karyawan</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="m-email">Email akun Google</Label>
          <Input
            id="m-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="orang@gmail.com"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-role">Peran</Label>
          <select
            id="m-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {ASSIGNABLE_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {branches.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="m-branch">Cabang</Label>
            <select
              id="m-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Semua cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">
        Jika akunnya sudah pernah login, langsung aktif. Jika belum, otomatis aktif saat mereka
        login Google pertama kali dengan email ini.
      </p>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !email}>
          {isPending ? 'Menyimpan…' : 'Tambah'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}
