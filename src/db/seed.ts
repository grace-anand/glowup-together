import { db } from './index'
import { categories, badges } from './schema'

/**
 * Seed the database with default categories and achievement badges.
 * Run with: pnpm tsx src/db/seed.ts
 */
async function seed() {
  console.log('🌱 Seeding database...')

  // ─── Default Categories ─────────────────────────────────────────────────
  const defaultCategories = [
    { name: 'Fitness', icon: '💪', color: '#ef4444', isDefault: true },
    { name: 'Skincare', icon: '✨', color: '#ec4899', isDefault: true },
    { name: 'Learning', icon: '📚', color: '#3b82f6', isDefault: true },
    { name: 'Mental Wellness', icon: '🧘', color: '#8b5cf6', isDefault: true },
    { name: 'Productivity', icon: '⚡', color: '#f59e0b', isDefault: true },
    { name: 'Custom', icon: '🎯', color: '#6b7280', isDefault: true },
  ]

  console.log('  📂 Inserting categories...')
  await db
    .insert(categories)
    .values(defaultCategories)
    .onConflictDoNothing()

  // ─── Achievement Badges ─────────────────────────────────────────────────
  const defaultBadges = [
    // Streak badges
    {
      name: '7-Day Warrior',
      description: 'Maintain a 7-day streak on any habit',
      icon: '🔥',
      category: 'streak',
      requiredStreak: 7,
    },
    {
      name: '30-Day Discipline',
      description: 'Maintain a 30-day streak on any habit',
      icon: '💎',
      category: 'streak',
      requiredStreak: 30,
    },
    {
      name: '100-Day Transformation',
      description: 'Maintain a 100-day streak on any habit',
      icon: '👑',
      category: 'streak',
      requiredStreak: 100,
    },
    // Completion badges
    {
      name: 'First Step',
      description: 'Create your first habit',
      icon: '🌱',
      category: 'completion',
      requiredCompletions: 0,
    },
    {
      name: 'Getting Started',
      description: 'Complete 10 habit check-ins',
      icon: '🚀',
      category: 'completion',
      requiredCompletions: 10,
    },
    {
      name: 'Habit Machine',
      description: 'Complete 100 habit check-ins',
      icon: '⚙️',
      category: 'completion',
      requiredCompletions: 100,
    },
    {
      name: 'Unstoppable',
      description: 'Complete 500 habit check-ins',
      icon: '🏆',
      category: 'completion',
      requiredCompletions: 500,
    },
    // Social badges
    {
      name: 'First Partner',
      description: 'Add your first accountability partner',
      icon: '🤝',
      category: 'social',
    },
    // Journal badges
    {
      name: 'Journal Keeper',
      description: 'Write your first journal entry',
      icon: '📝',
      category: 'journal',
    },
    {
      name: 'Reflective Mind',
      description: 'Write 30 journal entries',
      icon: '🪞',
      category: 'journal',
      requiredCompletions: 30,
    },
    // XP badges
    {
      name: 'Rising Star',
      description: 'Earn 100 XP',
      icon: '⭐',
      category: 'xp',
      requiredXp: 100,
    },
    {
      name: 'On Fire',
      description: 'Earn 500 XP',
      icon: '🔥',
      category: 'xp',
      requiredXp: 500,
    },
    {
      name: 'XP Collector',
      description: 'Earn 1,000 XP',
      icon: '💰',
      category: 'xp',
      requiredXp: 1000,
    },
    {
      name: 'Legend',
      description: 'Earn 5,000 XP',
      icon: '🌟',
      category: 'xp',
      requiredXp: 5000,
    },
  ]

  console.log('  🏅 Inserting badges...')
  await db
    .insert(badges)
    .values(defaultBadges)
    .onConflictDoNothing()

  console.log('✅ Seeding complete!')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
