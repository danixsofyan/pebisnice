'use client'

import { useState, useEffect } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Search, Bell, Moon, Sun, ChevronDown, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { User } from 'next-auth'
import Link from 'next/link'

export function DashboardHeader({ user }: { user?: User | undefined }) {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      <div className="flex flex-1 items-center gap-2 overflow-hidden md:gap-4">
        <div className="hidden md:flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-bold">P</span>
          </div>
          <span className="text-sm font-bold tracking-tight">Pebisnice</span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium">
            <span>Main Store</span>
            <ChevronDown className="size-4 opacity-50" />
          </button>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="focus:ring-primary w-64 rounded-lg border-none bg-muted py-2 pr-4 pl-10 text-sm transition-shadow outline-none focus:ring-2"
            placeholder="Search analytics..."
            type="text"
          />
        </div>

        <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Bell className="size-5" />
          <span className="sr-only">Notifications</span>
        </button>

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <div className="relative flex size-5 items-center justify-center">
                  <Sun className="h-full w-full scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-full w-full scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                </div>
                <span className="sr-only">Toggle theme</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="size-9" />
        )}

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-0.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-primary text-xs font-bold uppercase">
                      {user?.name?.[0] || 'A'}
                    </div>
                  )}
                </div>
                <div className="hidden flex-col items-start px-1 md:flex">
                  <span className="text-xs font-bold leading-none">{user?.name || 'Admin'}</span>
                  <span className="text-[10px] leading-none text-slate-500 dark:text-slate-400 mt-1">Owner</span>
                </div>
                <ChevronDown className="hidden size-3.5 text-slate-400 md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 py-1">
                  <p className="text-sm font-semibold leading-none">{user?.name || 'Admin Pebisnice'}</p>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                    {user?.email || 'admin@pebisnice.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Pengaturan</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/50"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="size-8 w-24 rounded-lg bg-muted animate-pulse" />
        )}
      </div>
    </header>
  )
}
