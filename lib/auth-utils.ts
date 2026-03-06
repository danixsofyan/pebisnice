import { auth } from '@/auth'
import { AuthError } from '@/lib/errors/app-error'

export async function getUserFromSession() {
  const session = await auth()
  const user = session?.user

  if (!user || !user.id) {
    throw new AuthError()
  }

  return user as typeof user & { id: string }
}
