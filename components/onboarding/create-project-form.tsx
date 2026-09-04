'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFirstProjectAction } from '@/app/actions/onboarding'

export function CreateProjectForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createFirstProjectAction({
        name,
        description: description.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Nama bisnis</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Contoh: Toko Melati"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Deskripsi (opsional)</Label>
        <Input
          id="project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Penjualan bunga online dan offline"
        />
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || name.trim().length === 0}>
        {isPending ? 'Membuat…' : 'Mulai'}
      </Button>

      <p className="text-muted-foreground text-xs">
        Cabang pertama bernama <strong>Pusat</strong> dibuat otomatis. Anda bisa menambah cabang
        lain nanti.
      </p>
    </form>
  )
}
