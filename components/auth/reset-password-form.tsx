'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/password-input'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { resetPasswordAction } from '@/app/actions/auth-password'

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    startTransition(async () => {
      const res = await resetPasswordAction({ token, newPassword })
      if (!res.success) {
        setError(res.error)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 1500)
    })
  }

  if (done) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        Password berhasil diubah. Mengarahkan ke halaman masuk…
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
          Minimal 8 karakter (ideal 12+), memuat huruf besar, huruf kecil, dan angka.
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
