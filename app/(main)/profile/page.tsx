import { auth } from '@/auth'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const session = await auth()
  const user = session?.user

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Profil</h1>
      <ProfileForm initialName={user?.name ?? ''} email={user?.email ?? ''} />
    </div>
  )
}
