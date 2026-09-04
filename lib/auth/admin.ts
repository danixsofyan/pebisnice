import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { AuthError, ForbiddenError } from '@/lib/errors/app-error'

/** Is this user a platform admin? */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ isAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0]?.isAdmin ?? false
}

export interface AdminState {
  isAdmin: boolean
  userId: string | null
}

/** For layouts: never throws, just says whether access is allowed. */
export async function resolveAdminState(): Promise<AdminState> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { isAdmin: false, userId: null }
  return { isAdmin: await isPlatformAdmin(userId), userId }
}

/** For server actions: throws if not admin; returns the admin userId. */
export async function requirePlatformAdmin(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new AuthError()
  if (!(await isPlatformAdmin(userId))) {
    throw new ForbiddenError('Akses khusus admin platform')
  }
  return userId
}
