import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, or, count, gte, desc } from 'drizzle-orm'
import { startOfDay } from 'date-fns'

import { db } from '#/db'
import {
  partnerships,
  nudges,
  partnerChallenges,
} from '#/db/schema'
import { getCurrentUser, getUserByClerkId } from '#/server/auth'
import { awardXp, checkBadgeEligibility } from '#/server/gamification'

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_PARTNERS = 5
const MAX_NUDGES_PER_DAY = 3

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Generate an invite link by creating a pending partnership.
 */
export const generateInviteLink = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    // Validate max partners
    const [partnerCount] = await db
      .select({ total: count() })
      .from(partnerships)
      .where(
        and(
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
          eq(partnerships.status, 'active'),
        ),
      )

    if (partnerCount && partnerCount.total >= MAX_PARTNERS) {
      throw new Error(`Maximum of ${MAX_PARTNERS} partners allowed`)
    }

    const inviteCode = crypto.randomUUID().slice(0, 8)

    const [partnership] = await db
      .insert(partnerships)
      .values({
        userId: user.clerkId,
        inviteCode,
        status: 'pending',
      })
      .returning()

    return { inviteCode, partnershipId: partnership!.id }
  },
)

/**
 * Accept a partnership invite.
 */
export const acceptInvite = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ inviteCode: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Find the pending partnership
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.inviteCode, data.inviteCode),
          eq(partnerships.status, 'pending'),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Invalid or expired invite code')
    }

    // Can't accept your own invite
    if (partnership.userId === user.clerkId) {
      throw new Error('You cannot accept your own invite')
    }

    // Check not already partnered
    const [existingPartnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          or(
            and(
              eq(partnerships.userId, user.clerkId),
              eq(partnerships.partnerId, partnership.userId),
            ),
            and(
              eq(partnerships.userId, partnership.userId),
              eq(partnerships.partnerId, user.clerkId),
            ),
          ),
          eq(partnerships.status, 'active'),
        ),
      )
      .limit(1)

    if (existingPartnership) {
      throw new Error('You are already partnered with this user')
    }

    // Validate max partners for acceptor
    const [acceptorCount] = await db
      .select({ total: count() })
      .from(partnerships)
      .where(
        and(
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
          eq(partnerships.status, 'active'),
        ),
      )

    if (acceptorCount && acceptorCount.total >= MAX_PARTNERS) {
      throw new Error(`Maximum of ${MAX_PARTNERS} partners allowed`)
    }

    // Accept the invite
    const [updated] = await db
      .update(partnerships)
      .set({
        partnerId: user.clerkId,
        status: 'active',
      })
      .where(eq(partnerships.id, partnership.id))
      .returning()

    return updated!
  })

/**
 * Decline a partnership invite.
 */
export const declineInvite = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ inviteCode: z.string().min(1) }))
  .handler(async ({ data }) => {
    await getCurrentUser()

    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.inviteCode, data.inviteCode),
          eq(partnerships.status, 'pending'),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Invalid or expired invite code')
    }

    const [declined] = await db
      .update(partnerships)
      .set({ status: 'declined' })
      .where(eq(partnerships.id, partnership.id))
      .returning()

    return declined!
  })

/**
 * Get active partnerships with partner user info.
 */
export const getPartners = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    const activePartnerships = await db
      .select()
      .from(partnerships)
      .where(
        and(
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
          eq(partnerships.status, 'active'),
        ),
      )

    // Enrich with partner user info
    const enriched = await Promise.all(
      activePartnerships.map(async (p) => {
        const partnerClerkId =
          p.userId === user.clerkId ? p.partnerId : p.userId
        const partner = partnerClerkId
          ? await getUserByClerkId(partnerClerkId)
          : null

        return {
          ...p,
          partner: partner
            ? {
                clerkId: partner.clerkId,
                displayName: partner.displayName,
                avatarUrl: partner.avatarUrl,
                level: partner.level,
              }
            : null,
        }
      }),
    )

    return enriched
  },
)

/**
 * Get incoming pending invites for the current user.
 * These are invites where partnerId is null (open invites) or
 * invites that the user has received through a link.
 */
export const getPendingInvites = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    // Pending invites created by others (user would accept via invite code)
    // Return pending invites the user created (so they can share/cancel)
    const pendingInvites = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.userId, user.clerkId),
          eq(partnerships.status, 'pending'),
        ),
      )
      .orderBy(desc(partnerships.createdAt))

    return pendingInvites
  },
)

/**
 * Remove (soft-remove) a partnership by setting status to declined.
 */
export const removePartner = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ partnershipId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, data.partnershipId),
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Partnership not found')
    }

    const [removed] = await db
      .update(partnerships)
      .set({ status: 'declined' })
      .where(eq(partnerships.id, data.partnershipId))
      .returning()

    return removed!
  })

/**
 * Send a nudge to a partner. Max 3 nudges per day per partnership.
 */
export const sendNudge = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      partnershipId: z.number().int().positive(),
      message: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Verify partnership and find the partner
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, data.partnershipId),
          eq(partnerships.status, 'active'),
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Partnership not found or not active')
    }

    const receiverId =
      partnership.userId === user.clerkId
        ? partnership.partnerId
        : partnership.userId

    if (!receiverId) {
      throw new Error('Partner not found')
    }

    // Check daily nudge limit
    const todayStart = startOfDay(new Date())
    const [nudgeCount] = await db
      .select({ total: count() })
      .from(nudges)
      .where(
        and(
          eq(nudges.partnershipId, data.partnershipId),
          eq(nudges.senderId, user.clerkId),
          gte(nudges.createdAt, todayStart),
        ),
      )

    if (nudgeCount && nudgeCount.total >= MAX_NUDGES_PER_DAY) {
      throw new Error(
        `Maximum of ${MAX_NUDGES_PER_DAY} nudges per day per partnership`,
      )
    }

    const [newNudge] = await db
      .insert(nudges)
      .values({
        partnershipId: data.partnershipId,
        senderId: user.clerkId,
        receiverId,
        message: data.message,
      })
      .returning()

    return newNudge!
  })

/**
 * Get unread nudges for the current user.
 */
export const getNudges = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { user } = await getCurrentUser()

    const unreadNudges = await db
      .select({
        id: nudges.id,
        partnershipId: nudges.partnershipId,
        senderId: nudges.senderId,
        message: nudges.message,
        createdAt: nudges.createdAt,
      })
      .from(nudges)
      .where(
        and(eq(nudges.receiverId, user.clerkId), eq(nudges.readAt, null!)),
      )
      .orderBy(desc(nudges.createdAt))

    // Enrich with sender info
    const enriched = await Promise.all(
      unreadNudges.map(async (nudge) => {
        const sender = await getUserByClerkId(nudge.senderId)
        return {
          ...nudge,
          senderName: sender?.displayName ?? 'Unknown',
          senderAvatar: sender?.avatarUrl ?? null,
        }
      }),
    )

    return enriched
  },
)

/**
 * Mark a nudge as read.
 */
export const markNudgeRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ nudgeId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    const [nudge] = await db
      .select()
      .from(nudges)
      .where(
        and(
          eq(nudges.id, data.nudgeId),
          eq(nudges.receiverId, user.clerkId),
        ),
      )
      .limit(1)

    if (!nudge) {
      throw new Error('Nudge not found')
    }

    const [updated] = await db
      .update(nudges)
      .set({ readAt: new Date() })
      .where(eq(nudges.id, data.nudgeId))
      .returning()

    return updated!
  })

/**
 * Create a challenge for a partnership.
 */
export const createChallenge = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      partnershipId: z.number().int().positive(),
      title: z.string().min(1, 'Title is required').max(200),
      description: z.string().max(500).optional(),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Verify the user is part of this partnership
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, data.partnershipId),
          eq(partnerships.status, 'active'),
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Partnership not found or not active')
    }

    const [challenge] = await db
      .insert(partnerChallenges)
      .values({
        partnershipId: data.partnershipId,
        creatorId: user.clerkId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      })
      .returning()

    return challenge!
  })

/**
 * Respond to a challenge (accept or complete).
 */
export const respondToChallenge = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      challengeId: z.number().int().positive(),
      action: z.enum(['accepted', 'completed']),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Get the challenge and verify the user is part of its partnership
    const [challenge] = await db
      .select()
      .from(partnerChallenges)
      .where(eq(partnerChallenges.id, data.challengeId))
      .limit(1)

    if (!challenge) {
      throw new Error('Challenge not found')
    }

    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, challenge.partnershipId),
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('You are not part of this challenge partnership')
    }

    const [updated] = await db
      .update(partnerChallenges)
      .set({ status: data.action })
      .where(eq(partnerChallenges.id, data.challengeId))
      .returning()

    // Award XP for completing a challenge
    if (data.action === 'completed') {
      await awardXp(
        user.clerkId,
        'challenge_completed',
        `Completed challenge: "${challenge.title}"`,
      )
      await checkBadgeEligibility(user.clerkId)
    }

    return updated!
  })

/**
 * Get active challenges for a partnership.
 */
export const getPartnerChallenges = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ partnershipId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { user } = await getCurrentUser()

    // Verify partnership membership
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, data.partnershipId),
          or(
            eq(partnerships.userId, user.clerkId),
            eq(partnerships.partnerId, user.clerkId),
          ),
        ),
      )
      .limit(1)

    if (!partnership) {
      throw new Error('Partnership not found')
    }

    const challenges = await db
      .select()
      .from(partnerChallenges)
      .where(eq(partnerChallenges.partnershipId, data.partnershipId))
      .orderBy(desc(partnerChallenges.createdAt))

    // Enrich with creator info
    const enriched = await Promise.all(
      challenges.map(async (c) => {
        const creator = await getUserByClerkId(c.creatorId)
        return {
          ...c,
          creatorName: creator?.displayName ?? 'Unknown',
        }
      }),
    )

    return enriched
  })
