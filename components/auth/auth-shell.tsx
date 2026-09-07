import Image from 'next/image'
import { LOGIN_BACKGROUND } from '@/lib/storage'

// Shared dark, image + gradient backdrop used across the auth pages (login, forgot/reset/change
// password) so they all look like one flow. Renders a centered single-column slot for the card.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="fixed inset-0 z-0 h-full w-full">
        <Image
          src={LOGIN_BACKGROUND}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/90 via-[#050505]/60 to-[#050505]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-[#050505]/0 to-[#050505]/0"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
