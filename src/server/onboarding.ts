import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { db } from '#/db'
import { habits, users, categories } from '#/db/schema'
import { getCurrentUser } from '#/server/auth'
import { awardXp, checkBadgeEligibility } from '#/server/gamification'

// ─── Habit Templates ────────────────────────────────────────────────────────

const HABIT_TEMPLATES: Record<string, string[]> = {
  Fitness: [
    'Workout for 30 min',
    'Drink 8 glasses of water',
    '10,000 steps',
    'Stretching routine',
  ],
  Skincare: [
    'Morning skincare routine',
    'Evening skincare routine',
    'Apply sunscreen',
    'Drink green tea',
  ],
  Learning: [
    'Read for 20 min',
    'Practice a new skill',
    'Watch educational content',
    'Write notes',
  ],
  'Mental Wellness': [
    '10-min meditation',
    'Gratitude journaling',
    'Digital detox hour',
    'Deep breathing',
  ],
  Productivity: [
    'Plan tomorrow today',
    'No phone first hour',
    'Complete MIT (Most Important Task)',
    'Review goals',
  ],
}

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Get onboarding status for the current user.
 */
export const getOnboardingStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    return {
      onboardingComplete: user.onboardingComplete,
      user: {
        clerkId: user.clerkId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        xp: user.xp,
        level: user.level,
      },
    }
  },
)

/**
 * Complete onboarding by creating selected habits and marking onboarding done.
 */
export const completeOnboarding = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      selectedCategoryIds: z.array(z.number().int().positive()),
      habits: z.array(
        z.object({
          title: z.string().min(1),
          categoryId: z.number().int().positive().optional(),
          frequency: z.enum(['daily', 'weekly']).default('daily'),
          targetDaysPerWeek: z.number().int().min(1).max(7).default(7),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    if (user.onboardingComplete) {
      throw new Error('Onboarding already completed')
    }

    // Create all selected habits
    const createdHabits = []
    for (const habit of data.habits) {
      const [newHabit] = await db
        .insert(habits)
        .values({
          userId: user.clerkId,
          title: habit.title,
          categoryId: habit.categoryId,
          frequency: habit.frequency,
          targetDaysPerWeek: habit.targetDaysPerWeek,
        })
        .returning()

      createdHabits.push(newHabit!)
    }

    // Award first_habit XP if habits were created
    if (createdHabits.length > 0) {
      await awardXp(user.clerkId, 'first_habit', 'Created your first habit during onboarding!')
      await checkBadgeEligibility(user.clerkId)
    }

    // Mark onboarding as complete
    await db
      .update(users)
      .set({
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, user.clerkId))

    return {
      habitsCreated: createdHabits.length,
      habits: createdHabits,
    }
  })

/**
 * Get predefined habit templates grouped by category.
 * Matches templates to actual category records in the database.
 */
export const getHabitTemplates = createServerFn({ method: 'GET' }).handler(
  async () => {
    // Fetch real categories from DB
    const allCategories = await db.select().from(categories)

    // Build a map of category name -> category record
    const categoryByName = new Map(
      allCategories.map((c) => [c.name.toLowerCase(), c]),
    )

    // Map templates to categories
    const templates = Object.entries(HABIT_TEMPLATES).map(
      ([categoryName, habitTitles]) => {
        const category = categoryByName.get(categoryName.toLowerCase())

        return {
          categoryName,
          categoryId: category?.id ?? null,
          categoryIcon: category?.icon ?? '📋',
          categoryColor: category?.color ?? '#6B7280',
          habits: habitTitles.map((title) => ({
            title,
            categoryId: category?.id ?? null,
            frequency: 'daily' as const,
            targetDaysPerWeek: 7,
          })),
        }
      },
    )

    return { categories: allCategories, templates }
  },
)
