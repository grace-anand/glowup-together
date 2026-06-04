import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, count, desc } from 'drizzle-orm'
import { format } from 'date-fns'

import { db } from '#/db'
import { habits, habitCompletions, users } from '#/db/schema'
import { getCurrentUser } from '#/server/auth'
import { calculateStreak } from '#/server/streaks'
import { awardXp, checkBadgeEligibility } from '#/server/gamification'

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Get user's active habits with today's completion status and current streak.
 */
export const getHabits = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()
    const today = format(new Date(), 'yyyy-MM-dd')

    const userHabits = await db
      .select()
      .from(habits)
      .where(
        and(eq(habits.userId, user.clerkId), eq(habits.isArchived, false)),
      )
      .orderBy(desc(habits.createdAt))

    // Enrich each habit with today's completion status and current streak
    const enriched = await Promise.all(
      userHabits.map(async (habit) => {
        // Check today's completion
        const [todayCompletion] = await db
          .select()
          .from(habitCompletions)
          .where(
            and(
              eq(habitCompletions.habitId, habit.id),
              eq(habitCompletions.completedDate, today),
            ),
          )
          .limit(1)

        const { currentStreak } = await calculateStreak(habit.id, user.clerkId)

        return {
          ...habit,
          completedToday: !!todayCompletion,
          currentStreak,
        }
      }),
    )

    return enriched
  },
)

/**
 * Create a new habit. Awards 'first_habit' XP if this is the user's first.
 */
export const createHabit = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().min(1, 'Title is required').max(100),
      description: z.string().max(500).optional(),
      icon: z.string().optional(),
      frequency: z.enum(['daily', 'weekly']).default('daily'),
      categoryId: z.number().int().positive().optional(),
      targetDaysPerWeek: z.number().int().min(1).max(7).default(7),
      reminderTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [newHabit] = await db
      .insert(habits)
      .values({
        userId: user.clerkId,
        title: data.title,
        description: data.description,
        icon: data.icon,
        frequency: data.frequency,
        categoryId: data.categoryId,
        targetDaysPerWeek: data.targetDaysPerWeek,
        reminderTime: data.reminderTime,
      })
      .returning()

    // Check if this is the user's first habit
    const [habitCount] = await db
      .select({ total: count() })
      .from(habits)
      .where(eq(habits.userId, user.clerkId))

    if (habitCount && habitCount.total === 1) {
      await awardXp(user.clerkId, 'first_habit', 'Created your first habit!')
      await checkBadgeEligibility(user.clerkId)
    }

    return newHabit!
  })

/**
 * Update habit fields (partial update).
 */
export const updateHabit = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      habitId: z.number().int().positive(),
      title: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      icon: z.string().optional(),
      frequency: z.enum(['daily', 'weekly']).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
      targetDaysPerWeek: z.number().int().min(1).max(7).optional(),
      reminderTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .nullable()
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()
    const { habitId, ...updates } = data

    // Verify ownership
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, user.clerkId)))
      .limit(1)

    if (!habit) {
      throw new Error('Habit not found')
    }

    const [updated] = await db
      .update(habits)
      .set(updates)
      .where(eq(habits.id, habitId))
      .returning()

    return updated!
  })

/**
 * Archive a habit (soft delete).
 */
export const archiveHabit = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ habitId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, data.habitId), eq(habits.userId, user.clerkId)))
      .limit(1)

    if (!habit) {
      throw new Error('Habit not found')
    }

    const [archived] = await db
      .update(habits)
      .set({ isArchived: true })
      .where(eq(habits.id, data.habitId))
      .returning()

    return archived!
  })

/**
 * Toggle habit completion for a given date.
 * If already completed, removes the completion.
 * If not completed, creates completion and awards XP + checks streak bonuses.
 */
export const toggleHabitCompletion = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      habitId: z.number().int().positive(),
      completedDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Verify ownership
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, data.habitId), eq(habits.userId, user.clerkId)))
      .limit(1)

    if (!habit) {
      throw new Error('Habit not found')
    }

    // Check if completion exists
    const [existing] = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, data.habitId),
          eq(habitCompletions.completedDate, data.completedDate),
        ),
      )
      .limit(1)

    if (existing) {
      // Remove the completion
      await db
        .delete(habitCompletions)
        .where(eq(habitCompletions.id, existing.id))

      return { completed: false, xpAwarded: null }
    }

    // Create the completion
    await db.insert(habitCompletions).values({
      habitId: data.habitId,
      userId: user.clerkId,
      completedDate: data.completedDate,
    })

    // Award base XP
    const xpResult = await awardXp(
      user.clerkId,
      'habit_completion',
      `Completed "${habit.title}"`,
    )

    // Check for streak bonuses
    const { currentStreak } = await calculateStreak(
      data.habitId,
      user.clerkId,
    )

    const streakBonuses: Array<{ type: string; xp: number }> = []

    if (currentStreak === 7) {
      await awardXp(user.clerkId, 'streak_bonus_7', '7-day streak!')
      streakBonuses.push({ type: 'streak_bonus_7', xp: 50 })
    }
    if (currentStreak === 30) {
      await awardXp(user.clerkId, 'streak_bonus_30', '30-day streak!')
      streakBonuses.push({ type: 'streak_bonus_30', xp: 200 })

      // Award a streak freeze at 30-day milestones
      const [currentUserData] = await db
        .select({ streakFreezes: users.streakFreezes })
        .from(users)
        .where(eq(users.clerkId, user.clerkId))

      if (currentUserData && currentUserData.streakFreezes < 3) {
        await db
          .update(users)
          .set({
            streakFreezes: currentUserData.streakFreezes + 1,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, user.clerkId))
      }
    }
    if (currentStreak === 100) {
      await awardXp(user.clerkId, 'streak_bonus_100', '100-day streak!')
      streakBonuses.push({ type: 'streak_bonus_100', xp: 1000 })
    }

    // Check for newly earned badges
    const newBadges = await checkBadgeEligibility(user.clerkId)

    return {
      completed: true,
      xpAwarded: xpResult,
      currentStreak,
      streakBonuses,
      newBadges,
    }
  })

/**
 * Get the user's archived habits.
 */
export const getArchivedHabits = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    return db
      .select()
      .from(habits)
      .where(
        and(eq(habits.userId, user.clerkId), eq(habits.isArchived, true)),
      )
      .orderBy(desc(habits.createdAt))
  },
)

/**
 * Restore an archived habit.
 */
export const restoreHabit = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ habitId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, data.habitId), eq(habits.userId, user.clerkId)))
      .limit(1)

    if (!habit) {
      throw new Error('Habit not found')
    }

    const [restored] = await db
      .update(habits)
      .set({ isArchived: false })
      .where(eq(habits.id, data.habitId))
      .returning()

    return restored!
  })
