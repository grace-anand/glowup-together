import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '#/db'
import { users } from '#/db/schema'

/**
 * Get the authenticated Clerk userId or throw a redirect to /sign-in.
 * Use in `beforeLoad` hooks and server functions that require auth.
 */
export async function getAuthOrThrow() {
  const authObj = await auth()

  if (!authObj.userId) {
    throw redirect({ to: '/sign-in/$', params: {} })
  }

  return authObj
}

/**
 * Get or create the local user row for a Clerk user.
 * Called lazily on first server function invocation.
 * Upserts using the Clerk userId as the primary key.
 */
export async function getOrCreateUser(
  clerkId: string,
  clerkUser?: {
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
  },
) {
  const displayName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
    : null
  const avatarUrl = clerkUser?.imageUrl || null

  const [user] = await db
    .insert(users)
    .values({
      clerkId,
      displayName,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        ...(displayName != null ? { displayName } : {}),
        ...(avatarUrl != null ? { avatarUrl } : {}),
        updatedAt: new Date(),
      },
    })
    .returning()

  return user!
}

/**
 * Get the current authenticated user's DB row.
 * Combines auth check + user upsert in one call.
 * Most server functions should use this.
 */
export async function getCurrentUser() {
  const authObj = await getAuthOrThrow()
  const user = await getOrCreateUser(authObj.userId)
  return { auth: authObj, user }
}

/**
 * Get a user by their Clerk ID (for looking up partners, etc.)
 */
export async function getUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
  return user
}
