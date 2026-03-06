import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="fixed inset-0 z-0 h-full w-full" data-unicorn="ILgOO23w4wEyPQOKyLO4">
        <img
          src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/2b5079f4-4ddd-433b-a936-fc8f7dea9df0_3840w.webp"
          alt="Landscape"
          className="h-full w-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/90 via-[#050505]/60 to-[#050505]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-[#050505]/0 to-[#050505]/0"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
