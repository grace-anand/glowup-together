import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, desc, count, avg, gte } from 'drizzle-orm'
import { startOfWeek, startOfMonth } from 'date-fns'

import { db } from '#/db'
import { journalEntries } from '#/db/schema'
import { getCurrentUser } from '#/server/auth'
import { awardXp, checkBadgeEligibility } from '#/server/gamification'

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Get paginated journal entries with optional mood filter.
 */
export const getJournalEntries = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      page: z.number().int().min(1).default(1),
      mood: z.number().int().min(1).max(5).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const conditions = [eq(journalEntries.userId, user.clerkId)]
    if (data.mood) {
      conditions.push(eq(journalEntries.mood, data.mood))
    }

    const offset = (data.page - 1) * PAGE_SIZE

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset)

    // Get total count for pagination
    const [totalRow] = await db
      .select({ total: count() })
      .from(journalEntries)
      .where(and(...conditions))

    const total = totalRow?.total ?? 0

    return {
      entries,
      pagination: {
        page: data.page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    }
  })

/**
 * Create a new journal entry. Awards journal XP.
 */
export const createJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      content: z.string().min(1, 'Content is required'),
      mood: z.number().int().min(1).max(5),
      photoKeys: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [entry] = await db
      .insert(journalEntries)
      .values({
        userId: user.clerkId,
        content: data.content,
        mood: data.mood,
        photoKeys: data.photoKeys,
      })
      .returning()

    // Award XP for journaling
    const xpResult = await awardXp(
      user.clerkId,
      'journal_entry',
      'Wrote a journal entry',
    )
    await checkBadgeEligibility(user.clerkId)

    return { entry: entry!, xpAwarded: xpResult }
  })

/**
 * Update a journal entry (owner check).
 */
export const updateJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      entryId: z.number().int().positive(),
      content: z.string().min(1).optional(),
      mood: z.number().int().min(1).max(5).optional(),
      photoKeys: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()
    const { entryId, ...updates } = data

    // Verify ownership
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.id, entryId),
          eq(journalEntries.userId, user.clerkId),
        ),
      )
      .limit(1)

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    const [updated] = await db
      .update(journalEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(journalEntries.id, entryId))
      .returning()

    return updated!
  })

/**
 * Delete a journal entry (owner check).
 */
export const deleteJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ entryId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Verify ownership
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.id, data.entryId),
          eq(journalEntries.userId, user.clerkId),
        ),
      )
      .limit(1)

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, data.entryId))

    return { deleted: true }
  })

/**
 * Get journal statistics: total entries, average mood, entries this week/month.
 */
export const getJournalStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    // Total entries
    const [totalRow] = await db
      .select({ total: count() })
      .from(journalEntries)
      .where(eq(journalEntries.userId, user.clerkId))

    // Average mood
    const [avgRow] = await db
      .select({ avgMood: avg(journalEntries.mood) })
      .from(journalEntries)
      .where(eq(journalEntries.userId, user.clerkId))

    // Entries this week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const [weekRow] = await db
      .select({ total: count() })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, user.clerkId),
          gte(journalEntries.createdAt, weekStart),
        ),
      )

    // Entries this month
    const monthStart = startOfMonth(new Date())
    const [monthRow] = await db
      .select({ total: count() })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, user.clerkId),
          gte(journalEntries.createdAt, monthStart),
        ),
      )

    return {
      totalEntries: totalRow?.total ?? 0,
      averageMood: avgRow?.avgMood ? parseFloat(String(avgRow.avgMood)) : null,
      entriesThisWeek: weekRow?.total ?? 0,
      entriesThisMonth: monthRow?.total ?? 0,
    }
  },
)
