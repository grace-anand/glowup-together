import {
  pgTable,
  pgEnum,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ──────────────────────────────────────────────────────────────────

export const habitFrequencyEnum = pgEnum('habit_frequency', ['daily', 'weekly'])

export const partnershipStatusEnum = pgEnum('partnership_status', [
  'pending',
  'active',
  'declined',
])

export const challengeStatusEnum = pgEnum('challenge_status', [
  'pending',
  'accepted',
  'completed',
  'expired',
])

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  clerkId: text('clerk_id').primaryKey(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(0).notNull(),
  streakFreezes: integer('streak_freezes').default(0).notNull(),
  onboardingComplete: boolean('onboarding_complete').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Categories ─────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
})

// ─── Habits ─────────────────────────────────────────────────────────────────

export const habits = pgTable(
  'habits',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    title: text('title').notNull(),
    description: text('description'),
    icon: text('icon'),
    frequency: habitFrequencyEnum('frequency').default('daily').notNull(),
    targetDaysPerWeek: integer('target_days_per_week').default(7),
    reminderTime: text('reminder_time'), // HH:MM format
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('habits_user_id_idx').on(table.userId),
    index('habits_category_id_idx').on(table.categoryId),
  ],
)

// ─── Habit Completions ──────────────────────────────────────────────────────

export const habitCompletions = pgTable(
  'habit_completions',
  {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id')
      .references(() => habits.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
    completedDate: date('completed_date').notNull(), // Client-reported local date (YYYY-MM-DD)
    note: text('note'),
  },
  (table) => [
    index('completions_habit_date_idx').on(table.habitId, table.completedDate),
    index('completions_user_id_idx').on(table.userId),
    uniqueIndex('completions_habit_date_unique').on(
      table.habitId,
      table.completedDate,
    ),
  ],
)

// ─── XP Events ──────────────────────────────────────────────────────────────

export const userXpEvents = pgTable(
  'user_xp_events',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    eventType: text('event_type').notNull(), // 'habit_completion', 'streak_bonus_7', 'streak_bonus_30', 'streak_bonus_100', 'journal_entry', 'challenge_completed', 'first_habit'
    xpAmount: integer('xp_amount').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('xp_events_user_id_idx').on(table.userId)],
)

// ─── Badges ─────────────────────────────────────────────────────────────────

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(), // 'streak', 'xp', 'completion', 'social', 'journal'
  requiredXp: integer('required_xp'),
  requiredStreak: integer('required_streak'),
  requiredCompletions: integer('required_completions'),
})

// ─── User Badges ────────────────────────────────────────────────────────────

export const userBadges = pgTable(
  'user_badges',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    badgeId: integer('badge_id')
      .references(() => badges.id, { onDelete: 'cascade' })
      .notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_badges_unique').on(table.userId, table.badgeId),
  ],
)

// ─── Partnerships ───────────────────────────────────────────────────────────

export const partnerships = pgTable(
  'partnerships',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    partnerId: text('partner_id').references(() => users.clerkId, {
      onDelete: 'cascade',
    }),
    inviteCode: text('invite_code').unique().notNull(),
    status: partnershipStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('partnerships_user_id_idx').on(table.userId),
    index('partnerships_partner_id_idx').on(table.partnerId),
    uniqueIndex('partnerships_invite_code_idx').on(table.inviteCode),
  ],
)

// ─── Partner Challenges ─────────────────────────────────────────────────────

export const partnerChallenges = pgTable(
  'partner_challenges',
  {
    id: serial('id').primaryKey(),
    partnershipId: integer('partnership_id')
      .references(() => partnerships.id, { onDelete: 'cascade' })
      .notNull(),
    creatorId: text('creator_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: date('due_date').notNull(),
    status: challengeStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('challenges_partnership_id_idx').on(table.partnershipId),
  ],
)

// ─── Nudges ─────────────────────────────────────────────────────────────────

export const nudges = pgTable(
  'nudges',
  {
    id: serial('id').primaryKey(),
    partnershipId: integer('partnership_id')
      .references(() => partnerships.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: text('sender_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    receiverId: text('receiver_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    message: text('message').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('nudges_receiver_id_idx').on(table.receiverId),
    index('nudges_partnership_id_idx').on(table.partnershipId),
  ],
)

// ─── Journal Entries ────────────────────────────────────────────────────────

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.clerkId, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    mood: integer('mood').notNull(), // 1-5
    photoKeys: jsonb('photo_keys').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('journal_user_id_idx').on(table.userId),
    index('journal_created_at_idx').on(table.createdAt),
  ],
)

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  habitCompletions: many(habitCompletions),
  xpEvents: many(userXpEvents),
  earnedBadges: many(userBadges),
  // Partnerships where this user is the initiator
  initiatedPartnerships: many(partnerships, { relationName: 'initiator' }),
  // Partnerships where this user is the partner
  receivedPartnerships: many(partnerships, { relationName: 'partner' }),
  journalEntries: many(journalEntries),
  sentNudges: many(nudges, { relationName: 'sender' }),
  receivedNudges: many(nudges, { relationName: 'receiver' }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  habits: many(habits),
}))

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.clerkId],
  }),
  category: one(categories, {
    fields: [habits.categoryId],
    references: [categories.id],
  }),
  completions: many(habitCompletions),
}))

export const habitCompletionsRelations = relations(habitCompletions, ({ one }) => ({
  habit: one(habits, {
    fields: [habitCompletions.habitId],
    references: [habits.id],
  }),
  user: one(users, {
    fields: [habitCompletions.userId],
    references: [users.clerkId],
  }),
}))

export const userXpEventsRelations = relations(userXpEvents, ({ one }) => ({
  user: one(users, {
    fields: [userXpEvents.userId],
    references: [users.clerkId],
  }),
}))

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}))

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.clerkId],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}))

export const partnershipsRelations = relations(partnerships, ({ one, many }) => ({
  initiator: one(users, {
    fields: [partnerships.userId],
    references: [users.clerkId],
    relationName: 'initiator',
  }),
  partner: one(users, {
    fields: [partnerships.partnerId],
    references: [users.clerkId],
    relationName: 'partner',
  }),
  challenges: many(partnerChallenges),
  nudges: many(nudges),
}))

export const partnerChallengesRelations = relations(partnerChallenges, ({ one }) => ({
  partnership: one(partnerships, {
    fields: [partnerChallenges.partnershipId],
    references: [partnerships.id],
  }),
  creator: one(users, {
    fields: [partnerChallenges.creatorId],
    references: [users.clerkId],
  }),
}))

export const nudgesRelations = relations(nudges, ({ one }) => ({
  partnership: one(partnerships, {
    fields: [nudges.partnershipId],
    references: [partnerships.id],
  }),
  sender: one(users, {
    fields: [nudges.senderId],
    references: [users.clerkId],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [nudges.receiverId],
    references: [users.clerkId],
    relationName: 'receiver',
  }),
}))

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.clerkId],
  }),
}))
