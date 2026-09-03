import { LoginForm } from '@/components/login-form'
import Image from 'next/image'
import { loginBackgroundUrl } from '@/lib/storage'

export default function LoginPage() {
  const backgroundUrl = loginBackgroundUrl()

  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="fixed inset-0 z-0 h-full w-full" data-unicorn="ILgOO23w4wEyPQOKyLO4">
        {backgroundUrl ? (
          <Image
            src={backgroundUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40 mix-blend-luminosity"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/90 via-[#050505]/60 to-[#050505]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-[#050505]/0 to-[#050505]/0"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
