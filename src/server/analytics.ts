import { createServerFn } from '@tanstack/react-start'
import { eq, and, gte, count, sql, avg } from 'drizzle-orm'
import { format, subDays, startOfDay } from 'date-fns'

import { db } from '#/db'
import {
  habitCompletions,
  habits,
  userXpEvents,
  userBadges,
  journalEntries,
  categories,
} from '#/db/schema'
import { getCurrentUser } from '#/server/auth'
import { getLongestStreak } from '#/server/streaks'

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Get per-day completion counts for the last 7 days.
 */
export const getWeeklyCompletionData = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { user } = await getCurrentUser()
  const today = new Date()

  // Generate last 7 days
  const days: Array<{ date: string; completions: number }> = []

  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd')

    const [row] = await db
      .select({ total: count() })
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, user.clerkId),
          eq(habitCompletions.completedDate, date),
        ),
      )

    days.push({
      date,
      completions: row?.total ?? 0,
    })
  }

  return days
})

/**
 * Get a monthly report: completion rate %, total XP earned, badges earned,
 * and streak data for the last 30 days.
 */
export const getMonthlyReport = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()
    const thirtyDaysAgo = subDays(new Date(), 30)
    const thirtyDaysAgoDate = format(thirtyDaysAgo, 'yyyy-MM-dd')
    const thirtyDaysAgoTs = startOfDay(thirtyDaysAgo)

    // Total completions in last 30 days
    const [completionRow] = await db
      .select({ total: count() })
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, user.clerkId),
          gte(habitCompletions.completedDate, thirtyDaysAgoDate),
        ),
      )

    // Active habits count (for completion rate calculation)
    const [habitRow] = await db
      .select({ total: count() })
      .from(habits)
      .where(
        and(eq(habits.userId, user.clerkId), eq(habits.isArchived, false)),
      )

    const totalCompletions = completionRow?.total ?? 0
    const activeHabits = habitRow?.total ?? 0
    // Completion rate = actual completions / (active habits × 30 days) × 100
    const possibleCompletions = activeHabits * 30
    const completionRate =
      possibleCompletions > 0
        ? Math.round((totalCompletions / possibleCompletions) * 100)
        : 0

    // XP earned in last 30 days
    const [xpRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${userXpEvents.xpAmount}), 0)` })
      .from(userXpEvents)
      .where(
        and(
          eq(userXpEvents.userId, user.clerkId),
          gte(userXpEvents.createdAt, thirtyDaysAgoTs),
        ),
      )

    // Badges earned in last 30 days
    const [badgeRow] = await db
      .select({ total: count() })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, user.clerkId),
          gte(userBadges.earnedAt, thirtyDaysAgoTs),
        ),
      )

    // Longest streak
    const longestStreak = await getLongestStreak(user.clerkId)

    return {
      completionRate,
      totalCompletions,
      totalXpEarned: Number(xpRow?.total ?? 0),
      badgesEarned: badgeRow?.total ?? 0,
      longestStreak,
      activeHabits,
    }
  },
)

/**
 * Get average mood per day for the last 30 days.
 */
export const getMoodTrend = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()
    const today = new Date()

    const days: Array<{ date: string; averageMood: number | null }> = []

    for (let i = 29; i >= 0; i--) {
      const dayDate = subDays(today, i)
      const dayStart = startOfDay(dayDate)
      const dayEnd = startOfDay(subDays(today, i - 1))

      const [row] = await db
        .select({ avgMood: avg(journalEntries.mood) })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.userId, user.clerkId),
            gte(journalEntries.createdAt, dayStart),
            sql`${journalEntries.createdAt} < ${dayEnd}`,
          ),
        )

      days.push({
        date: format(dayDate, 'yyyy-MM-dd'),
        averageMood: row?.avgMood ? parseFloat(String(row.avgMood)) : null,
      })
    }

    return days
  },
)

/**
 * Get completion rates grouped by category for the last 30 days.
 */
export const getCategoryBreakdown = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()
    const thirtyDaysAgoDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')

    // Get all active habits grouped by category
    const userHabits = await db
      .select({
        habitId: habits.id,
        categoryId: habits.categoryId,
      })
      .from(habits)
      .where(
        and(eq(habits.userId, user.clerkId), eq(habits.isArchived, false)),
      )

    // Get all categories
    const allCategories = await db.select().from(categories)
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]))

    // Group habits by category
    const categoryHabits = new Map<
      number | null,
      number[]
    >()
    for (const h of userHabits) {
      const key = h.categoryId
      if (!categoryHabits.has(key)) {
        categoryHabits.set(key, [])
      }
      categoryHabits.get(key)!.push(h.habitId)
    }

    // Calculate completion rate per category
    const breakdown: Array<{
      categoryId: number | null
      categoryName: string
      categoryIcon: string
      categoryColor: string
      totalHabits: number
      totalCompletions: number
      completionRate: number
    }> = []

    for (const [categoryId, habitIds] of categoryHabits) {
      // Count completions for these habits in the last 30 days
      let totalCompletions = 0
      for (const habitId of habitIds) {
        const [row] = await db
          .select({ total: count() })
          .from(habitCompletions)
          .where(
            and(
              eq(habitCompletions.habitId, habitId),
              gte(habitCompletions.completedDate, thirtyDaysAgoDate),
            ),
          )
        totalCompletions += row?.total ?? 0
      }

      const possibleCompletions = habitIds.length * 30
      const completionRate =
        possibleCompletions > 0
          ? Math.round((totalCompletions / possibleCompletions) * 100)
          : 0

      const category = categoryId ? categoryMap.get(categoryId) : null

      breakdown.push({
        categoryId,
        categoryName: category?.name ?? 'Uncategorized',
        categoryIcon: category?.icon ?? '📋',
        categoryColor: category?.color ?? '#6B7280',
        totalHabits: habitIds.length,
        totalCompletions,
        completionRate,
      })
    }

    return breakdown
  },
)
