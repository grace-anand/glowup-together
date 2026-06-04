import { createServerFn } from '@tanstack/react-start'
import { eq, count, and, notInArray } from 'drizzle-orm'

import { db } from '#/db'
import {
  users,
  userXpEvents,
  badges,
  userBadges,
  habits,
  habitCompletions,
} from '#/db/schema'
import { getCurrentUser } from '#/server/auth'
import { getLongestStreak } from '#/server/streaks'

// ─── XP Constants ───────────────────────────────────────────────────────────

export const XP_VALUES = {
  habit_completion: 10,
  streak_bonus_7: 50,
  streak_bonus_30: 200,
  streak_bonus_100: 1000,
  journal_entry: 15,
  challenge_completed: 25,
  first_habit: 20,
} as const

export type XpEventType = keyof typeof XP_VALUES

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Calculate level from total XP.
 * Formula: level = floor(sqrt(xp / 100))
 */
function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100))
}

/**
 * Award XP to a user. Inserts an xpEvent, updates user.xp, and recalculates level.
 * Returns the new totals and whether the user leveled up.
 */
export async function awardXp(
  userId: string,
  eventType: XpEventType,
  description?: string,
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const xpAmount = XP_VALUES[eventType]

  // Insert the XP event
  await db.insert(userXpEvents).values({
    userId,
    eventType,
    xpAmount,
    description,
  })

  // Update user XP and recalculate level
  const [currentUser] = await db
    .select({ xp: users.xp, level: users.level })
    .from(users)
    .where(eq(users.clerkId, userId))

  const newXp = (currentUser?.xp ?? 0) + xpAmount
  const newLevel = calculateLevel(newXp)
  const leveledUp = newLevel > (currentUser?.level ?? 0)

  await db
    .update(users)
    .set({
      xp: newXp,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, userId))

  return { newXp, newLevel, leveledUp }
}

/**
 * Check all unearned badges and award any newly eligible ones.
 * Returns an array of newly earned badge records.
 */
export async function checkBadgeEligibility(userId: string) {
  // Get IDs of badges already earned
  const earnedBadgeRows = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))

  const earnedBadgeIds = earnedBadgeRows.map((r) => r.badgeId)

  // Get all badges the user hasn't earned yet
  const unearnedBadges =
    earnedBadgeIds.length > 0
      ? await db
          .select()
          .from(badges)
          .where(notInArray(badges.id, earnedBadgeIds))
      : await db.select().from(badges)

  if (unearnedBadges.length === 0) return []

  // Gather user stats for eligibility checks
  const [userRow] = await db
    .select({ xp: users.xp })
    .from(users)
    .where(eq(users.clerkId, userId))

  const userXp = userRow?.xp ?? 0

  const longestStreak = await getLongestStreak(userId)

  const [completionCount] = await db
    .select({ total: count() })
    .from(habitCompletions)
    .where(eq(habitCompletions.userId, userId))

  const totalCompletions = completionCount?.total ?? 0

  // Check each unearned badge
  const newlyEarned: typeof unearnedBadges = []

  for (const badge of unearnedBadges) {
    let eligible = true

    if (badge.requiredXp != null && userXp < badge.requiredXp) {
      eligible = false
    }
    if (badge.requiredStreak != null && longestStreak < badge.requiredStreak) {
      eligible = false
    }
    if (
      badge.requiredCompletions != null &&
      totalCompletions < badge.requiredCompletions
    ) {
      eligible = false
    }

    if (eligible) {
      newlyEarned.push(badge)
    }
  }

  // Award the newly earned badges
  if (newlyEarned.length > 0) {
    await db.insert(userBadges).values(
      newlyEarned.map((badge) => ({
        userId,
        badgeId: badge.id,
      })),
    )
  }

  return newlyEarned
}

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Get the current user's gamification stats.
 */
export const getUserStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    // Badge count
    const [badgeRow] = await db
      .select({ total: count() })
      .from(userBadges)
      .where(eq(userBadges.userId, user.clerkId))

    // Total completions
    const [completionRow] = await db
      .select({ total: count() })
      .from(habitCompletions)
      .where(eq(habitCompletions.userId, user.clerkId))

    // Active habits
    const [habitRow] = await db
      .select({ total: count() })
      .from(habits)
      .where(
        and(
          eq(habits.userId, user.clerkId),
          eq(habits.isArchived, false),
        ),
      )

    // Longest streak across all habits
    const longestStreak = await getLongestStreak(user.clerkId)

    return {
      xp: user.xp,
      level: user.level,
      badgeCount: badgeRow?.total ?? 0,
      totalCompletions: completionRow?.total ?? 0,
      longestStreak,
      activeHabits: habitRow?.total ?? 0,
    }
  },
)

/**
 * Get all badges with the user's earned status.
 */
export const getUserBadges = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    const allBadges = await db.select().from(badges)

    const earnedRows = await db
      .select({
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, user.clerkId))

    const earnedMap = new Map(
      earnedRows.map((r) => [r.badgeId, r.earnedAt]),
    )

    return allBadges.map((badge) => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }))
  },
)
