import { createServerFn } from '@tanstack/react-start'

import { eq, and, desc } from 'drizzle-orm'
import { format, subDays, differenceInCalendarDays, parseISO } from 'date-fns'

import { db } from '#/db'
import { habitCompletions, habits, users } from '#/db/schema'
import { getCurrentUser } from '#/server/auth'

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Calculate the current streak and longest streak for a specific habit.
 * Walks backward from today through completedDate entries.
 * A gap of > 1 day breaks the streak (streak freezes are NOT auto-used).
 */
export async function calculateStreak(
  habitId: number,
  userId: string,
): Promise<{ currentStreak: number; longestStreak: number }> {
  const completions = await db
    .select({ completedDate: habitCompletions.completedDate })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId),
      ),
    )
    .orderBy(desc(habitCompletions.completedDate))

  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Build a Set of completed date strings for O(1) lookup
  const completedDates = new Set(completions.map((c) => c.completedDate))

  // ── Current streak: walk backward from today ──
  const today = format(new Date(), 'yyyy-MM-dd')
  let currentStreak = 0
  let checkDate = today

  // Allow starting from today or yesterday (if the user hasn't completed today yet)
  if (!completedDates.has(today)) {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    if (completedDates.has(yesterday)) {
      checkDate = yesterday
    } else {
      // No completion today or yesterday → streak is 0
      // Still compute longest below
      currentStreak = 0
      checkDate = '' // skip the while loop
    }
  }

  if (checkDate) {
    let d = parseISO(checkDate)
    while (completedDates.has(format(d, 'yyyy-MM-dd'))) {
      currentStreak++
      d = subDays(d, 1)
    }
  }

  // ── Longest streak: walk through all sorted dates ──
  let longestStreak = 1
  let runLength = 1
  const sortedDates = Array.from(completedDates).sort() // ascending

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseISO(sortedDates[i - 1]!)
    const curr = parseISO(sortedDates[i]!)
    const gap = differenceInCalendarDays(curr, prev)

    if (gap === 1) {
      runLength++
      longestStreak = Math.max(longestStreak, runLength)
    } else if (gap > 1) {
      runLength = 1
    }
    // gap === 0 (duplicate date) is ignored
  }

  longestStreak = Math.max(longestStreak, currentStreak)

  return { currentStreak, longestStreak }
}

/**
 * Get the longest streak across ALL of a user's habits.
 */
export async function getLongestStreak(userId: string): Promise<number> {
  const userHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)))

  if (userHabits.length === 0) return 0

  let longest = 0
  for (const habit of userHabits) {
    const { longestStreak } = await calculateStreak(habit.id, userId)
    longest = Math.max(longest, longestStreak)
  }

  return longest
}

/**
 * Get the current streak for a specific habit.
 */
export async function getHabitStreakInfo(
  habitId: number,
  userId: string,
): Promise<number> {
  const { currentStreak } = await calculateStreak(habitId, userId)
  return currentStreak
}

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Deducts 1 streak freeze from the user's balance.
 */
export const useStreakFreeze = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    if (user.streakFreezes <= 0) {
      throw new Error('No streak freezes available')
    }

    const [updated] = await db
      .update(users)
      .set({
        streakFreezes: user.streakFreezes - 1,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, user.clerkId))
      .returning({ streakFreezes: users.streakFreezes })

    return { streakFreezes: updated!.streakFreezes }
  },
)
