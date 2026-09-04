'use client'

import { useState } from 'react'
import { User, Lock, ShieldCheck, Smartphone, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')

  const tabs = [
    { id: 'personal', label: 'Informasi Pribadi', icon: User },
    { id: 'security', label: 'Keamanan', icon: Lock },
    { id: 'sessions', label: 'Sesi Aktif', icon: Globe },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Edit Profil</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola informasi akun, keamanan, dan sesi aktif Anda.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-64">
          <nav className="flex flex-row gap-2 overflow-x-auto pb-2 md:flex-col md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold">Informasi Pribadi</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama Lengkap</label>
                      <input
                        type="text"
                        defaultValue="Dani Sofyan"
                        className="border-input bg-muted focus:ring-ring/20 w-full rounded-lg border px-4 py-2.5 transition-all outline-none focus:ring-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alamat Email</label>
                      <input
                        type="email"
                        defaultValue="danixsofyan@gmail.com"
                        className="border-input bg-muted focus:ring-ring/20 w-full rounded-lg border px-4 py-2.5 transition-all outline-none focus:ring-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button className="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-bold shadow-sm transition-all hover:opacity-90 active:scale-95">
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold">Ganti Password</h3>
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password Saat Ini</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="border-input bg-muted focus:ring-ring/20 w-full rounded-lg border px-4 py-2.5 transition-all outline-none focus:ring-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password Baru</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="border-input bg-muted focus:ring-ring/20 w-full rounded-lg border px-4 py-2.5 transition-all outline-none focus:ring-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="border-input bg-muted focus:ring-ring/20 w-full rounded-lg border px-4 py-2.5 transition-all outline-none focus:ring-2"
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <button className="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-bold shadow-sm transition-all hover:opacity-90 active:scale-95">
                      Update Password
                    </button>
                  </div>
                </div>
              </section>

              <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Two-Factor Authentication</h3>
                    <p className="text-muted-foreground text-sm">
                      Tambahkan lapisan keamanan ekstra pada akun Anda.
                    </p>
                  </div>
                  <ShieldCheck className="size-8 text-emerald-500" />
                </div>
                <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      2FA Saat Ini Aktif
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Akun Anda dilindungi oleh authenticator app.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-6">
                  <button className="rounded-lg border border-red-200 bg-transparent px-6 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20">
                    Nonaktifkan 2FA
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold">Sesi Perangkat</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                        <Globe className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Chrome di macOS (Sesi Ini)</p>
                        <p className="text-muted-foreground text-xs">
                          Jakarta, Indonesia • 192.168.1.1
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      AKTIF SEKARANG
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                        <Smartphone className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Safari di iPhone 15 Pro</p>
                        <p className="text-muted-foreground text-xs">
                          Jakarta, Indonesia • 2 hari yang lalu
                        </p>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-red-600 hover:underline dark:text-red-400">
                      Keluarkan
                    </button>
                  </div>

                  <div className="border-border flex items-center justify-between border-t pt-6">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      <p className="text-xs">
                        Ubah password jika Anda melihat aktivitas mencurigakan.
                      </p>
                    </div>
                    <button className="border-border hover:bg-muted rounded-lg border bg-transparent px-4 py-2 text-sm font-bold transition-all">
                      Logout dari Semua Perangkat
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
