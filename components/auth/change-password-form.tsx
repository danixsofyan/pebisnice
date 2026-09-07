'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/password-input'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { changePasswordAction } from '@/app/actions/auth-password'

export function ChangePasswordForm() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword })
      if (!res.success) {
        setError(res.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">Password saat ini</Label>
        <PasswordInput
          id="current"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new">Password baru</Label>
        <PasswordInput
          id="new"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          required
        />
        <PasswordStrengthMeter password={newPassword} />
        <p className="text-muted-foreground text-xs">
          Minimal 8 karakter, memuat huruf besar, huruf kecil, dan angka.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Ulangi password baru</Label>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Menyimpan…' : 'Simpan password'}
      </Button>
    </form>
  )
}
