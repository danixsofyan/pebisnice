'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from '@/app/actions/account'

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const result = await updateProfileAction({ name })
      if (!result.success) return setError(result.error)
      setMsg('Tersimpan')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <Label htmlFor="p-email">Email</Label>
        <Input id="p-email" value={email} disabled readOnly />
        <p className="text-muted-foreground text-xs">
          Terhubung dengan akun Google, tidak bisa diubah.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-name">Nama tampilan</Label>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        {msg ? <span className="text-muted-foreground text-sm">{msg}</span> : null}
        {error ? <span className="text-destructive text-sm">{error}</span> : null}
      </div>
    </form>
  )
}
