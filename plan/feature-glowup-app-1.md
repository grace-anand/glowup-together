---
goal: Build GlowUp Together — a full-stack self-improvement & accountability app with habit tracking, gamification, partner system, analytics, and journal
version: 1.0
date_created: 2026-06-03
last_updated: 2026-06-03
owner: GlowUp Together Team
status: 'In progress'
tags: [feature, architecture, full-stack, MVP]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

## Design Decisions (Resolved)

| Decision | Choice | Rationale |
|---|---|---|
| User identity | `clerkId` (text) as primary key in `users` | Simple, direct lookup, fully committed to Clerk |
| User sync | Lazy upsert via `getOrCreateUser()` on first server function call | No webhook infra needed |
| Partner invites | Shareable invite link (`/invite/:code`) with `inviteCode` on partnerships table | Lowest friction, works for new users |
| Partner visibility | Full mutual — both partners see all habits/completions/streaks | Maximizes accountability |
| Partner limit | Maximum 5 simultaneous partners | Quality over quantity |
| Photo storage | Cloudflare R2 from the start with presigned upload URLs | Avoids DB bloat, scalable |
| Timezone handling | Client sends local date; server stores UTC timestamp + client-reported `completedDate` | Accurate for user, pragmatic |
| Streak calculation | Calculated on-read from `habitCompletions` (no separate `streaks` table) | No cron jobs, no stale data |
| XP formula | `level = floor(sqrt(xp / 100))` | Rewarding early, harder over time |
| XP values | Fixed: completion +10, 7-day +50, 30-day +200, 100-day +1000, journal +15, challenge +25, first habit +20 | Simple, transparent |
| Default theme | Dark mode default, detect `prefers-color-scheme`, user override in settings | Gen Z preference, glow-up aesthetic |
| Onboarding | Full multi-step wizard with "skip to quick setup" option | Depth for engaged users, speed for impatient ones |
| Notifications | In-app alerts only (polling via TanStack Query `refetchInterval`) | No push notification infra for MVP |
| Streak freezes | Earned: 1 token per 30-day milestone, max 3 banked, preserves 1 missed day | Retention without being too forgiving |

GlowUp Together is a self-improvement platform for Gen Z and young millennials (ages 16–35) that combines habit tracking, accountability partnerships, gamification, progress analytics, and journaling into a single growth ecosystem. The app targets users who struggle with consistency, motivation, and managing multiple self-improvement goals across fitness, skincare, learning, mental wellness, and productivity.

This plan transforms the existing scaffolded TanStack Start project (with Clerk auth, Neon Postgres, Drizzle ORM, shadcn/ui, and Cloudflare Workers deployment) into a production-ready application across 8 implementation phases.

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: Users can create, schedule, and complete daily/weekly habits with one-tap completion
- **REQ-002**: Streak tracking with automatic calculation, reset on missed days, and freeze tokens
- **REQ-003**: XP/level gamification system with achievement badges earned through consistency
- **REQ-004**: Accountability partner system — invite friends, share streaks, send nudges, assign challenges
- **REQ-005**: Progress analytics dashboard with habit completion charts, weekly consistency graphs, and monthly reports
- **REQ-006**: Journal & progress timeline with daily reflections, photo uploads, and before/after comparisons
- **REQ-007**: Smart notification system with streak reminders, goal encouragement, and partner alerts
- **REQ-008**: Social features (share achievements, streak milestones, invite friends)
- **REQ-009**: Onboarding flow with goal selection, habit setup, and optional partner invitation
- **REQ-010**: Responsive web design — mobile-first but fully functional on desktop and tablet

### Technical Requirements

- **REQ-011**: All DB queries run server-side via `createServerFn` — never expose `DATABASE_URL` to client
- **REQ-012**: Auth via Clerk (`@clerk/tanstack-react-start`) with `clerkMiddleware` in `start.ts`
- **REQ-013**: All forms use TanStack Form with Zod validation
- **REQ-014**: Client state management via TanStack Store for UI state (theme, sidebar, modals)
- **REQ-015**: Server state via TanStack Query with SSR integration through router loaders
- **REQ-016**: UI components from shadcn/ui (style: `base-mira`, color: `olive`, icon: `lucide`)
- **REQ-017**: File-based routing in `src/routes/` — never edit `routeTree.gen.ts` manually
- **REQ-018**: Dark mode support using CSS custom properties already defined in `src/styles.css`

### Security Requirements

- **SEC-001**: All server functions must validate Clerk session via `getAuth()` before DB access
- **SEC-002**: Partner invitations must be one-way accept — no forced partnerships
- **SEC-003**: Journal photo uploads must validate file type and size server-side
- **SEC-004**: Rate limiting on nudge/notification endpoints to prevent abuse

### Constraints

- **CON-001**: Cloudflare Workers runtime — no Node.js filesystem APIs, use `import { env } from 'cloudflare:workers'` for env access inside handlers
- **CON-002**: Neon serverless Postgres — connection pooling via `@neondatabase/serverless`, no long-lived connections
- **CON-003**: No native mobile — web-only (responsive) for Phase 1
- **CON-004**: shadcn/ui `base-mira` style with olive theme — all new components must use this system
- **CON-005**: Existing Clerk integration uses `@clerk/tanstack-react-start@1.3.2` with middleware in `src/start.ts`

### Patterns

- **PAT-001**: Server functions pattern — `createServerFn({ method: 'GET' }).handler(async () => { ... })` for reads, `POST` for mutations
- **PAT-002**: Route protection pattern — `beforeLoad` hook with `redirect` to `/sign-in` if unauthenticated
- **PAT-003**: shadcn component installation — `pnpm dlx shadcn@latest add <component>`
- **PAT-004**: Drizzle schema changes require `pnpm run db:generate` then `pnpm run db:push`
- **PAT-005**: TanStack Query pattern — use `queryOptions` factory functions co-located with server functions

## 2. Implementation Steps

### Phase 1: Database Schema & Drizzle ORM Setup

- GOAL-001: Design and implement the complete database schema for all core entities (users, habits, streaks, XP, badges, partners, journals, challenges)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Replace `src/db/schema.ts` placeholder `todos` table with full schema: `users` (clerkId TEXT PRIMARY KEY, displayName, avatarUrl, xp, level, streakFreezes default 0, onboardingComplete default false, createdAt, updatedAt), `categories` (id serial PK, name, icon, color, isDefault), `habits` (id serial PK, userId FK→users, categoryId FK→categories, title, description, icon, frequency enum daily/weekly, targetDaysPerWeek, reminderTime, isArchived, createdAt), `habitCompletions` (id serial PK, habitId FK→habits, userId FK→users, completedAt timestamptz, completedDate date NOT NULL for client-reported local date, note), `userXpEvents` (id serial PK, userId FK→users, eventType, xpAmount, description, createdAt), `badges` (id serial PK, name, description, icon, category, requiredXp, requiredStreak, requiredCompletions), `userBadges` (id serial PK, userId FK→users, badgeId FK→badges, earnedAt), `partnerships` (id serial PK, userId FK→users, partnerId FK→users, inviteCode TEXT UNIQUE for shareable links, status enum pending/active/declined, createdAt), `partnerChallenges` (id serial PK, partnershipId FK→partnerships, creatorId FK→users, title, description, dueDate, status enum pending/accepted/completed/expired), `nudges` (id serial PK, partnershipId FK→partnerships, senderId FK→users, receiverId FK→users, message, readAt, createdAt), `journalEntries` (id serial PK, userId FK→users, content, mood integer 1-5, photoKeys JSONB array of R2 object keys, createdAt, updatedAt). NO separate `streaks` table — streaks calculated on-read from completions. | | |
| TASK-002 | Add Drizzle relation definitions using `relations()` for all foreign keys: users↔habits, habits↔completions, users↔partnerships (both as initiator and partner), partnerships↔challenges, partnerships↔nudges, users↔journalEntries, users↔userBadges, users↔userXpEvents | | |
| TASK-003 | Create `src/db/seed.ts` with default categories (Fitness, Skincare, Learning, Mental Wellness, Productivity, Custom) and default badges (7-Day Warrior, 30-Day Discipline, 100-Day Transformation, First Habit, First Partner, Journal Keeper, XP Milestone badges at 100/500/1000/5000) | | |
| TASK-004 | Run `pnpm run db:generate` and `pnpm run db:push` to apply schema to Neon database | | |
| TASK-005 | Update `src/db/index.ts` to use `@neondatabase/serverless` with `drizzle-orm/neon-http` adapter instead of `node-postgres` (required for Cloudflare Workers compatibility) | | |

---

### Phase 2: Server Functions & API Layer

- GOAL-002: Implement all server-side data access functions using `createServerFn` with Clerk auth validation, organized by domain

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `src/server/auth.ts` — helper `getAuthOrThrow()` wrapping `getAuth()` from `@clerk/tanstack-react-start/server` that throws redirect to `/sign-in` if no userId, and `getOrCreateUser(clerkId)` that upserts the Clerk user into the `users` table on first server function call | | |
| TASK-007 | Create `src/server/habits.ts` — server functions: `getHabits` (GET, returns user's active habits with today's completion status and streak), `createHabit` (POST, validates with Zod: title required, frequency enum, categoryId optional), `updateHabit` (POST, partial update), `archiveHabit` (POST, soft delete), `toggleHabitCompletion` (POST, creates/deletes completion for today, recalculates streak, awards XP: 10 for completion, bonus 50 for 7-day streak, 100 for 30-day) | | |
| TASK-008 | Create `src/server/streaks.ts` — helper functions (not routes): `calculateStreak(habitId, userId)` computes current streak by querying `habitCompletions` ordered by `completedDate` desc and counting consecutive days backward from today (using client-reported dates). Handles streak freezes by checking user's `streakFreezes` count. Exported `useStreakFreeze` server function (POST): deducts 1 freeze token from user, returns updated count. `getLongestStreak(userId)` returns the longest streak across all habits | | |
| TASK-009 | Create `src/server/gamification.ts` — server functions: `getUserStats` (GET, returns xp, level, badge count, total completions, longest streak across all habits), `awardXp` (internal, inserts xpEvent, updates user.xp, recalculates level using formula: `level = floor(sqrt(xp / 100))`), `checkBadgeEligibility` (internal, checks all unearned badges against user stats, awards newly earned ones), `getUserBadges` (GET, returns earned badges with earnedAt), `getLeaderboard` (GET, top 10 users by XP — future phase) | | |
| TASK-010 | Create `src/server/partners.ts` — server functions: `sendPartnerInvite` (POST, creates partnership with status pending, validates not self-invite and no existing partnership), `respondToInvite` (POST, accepts/declines), `getPartners` (GET, returns active partnerships with partner user info and shared streak data), `getPendingInvites` (GET, incoming pending invites), `sendNudge` (POST, creates nudge with message, max 3 per day per partnership), `getNudges` (GET, unread nudges for user), `markNudgeRead` (POST), `createChallenge` (POST, assigns challenge to partner with dueDate), `respondToChallenge` (POST, accept/complete), `getPartnerChallenges` (GET, active challenges for a partnership) | | |
| TASK-011 | Create `src/server/journal.ts` — server functions: `getJournalEntries` (GET, paginated, 20 per page, ordered by createdAt desc), `createJournalEntry` (POST, validates content not empty, mood 1-5), `updateJournalEntry` (POST, owner check), `deleteJournalEntry` (POST, owner check), `getJournalStats` (GET, total entries, average mood, entries this week/month) | | |
| TASK-012 | Create `src/server/analytics.ts` — server functions: `getWeeklyCompletionData` (GET, returns per-habit completion counts for last 7 days), `getMonthlyReport` (GET, completion rate %, total XP earned, badges earned, streak data for last 30 days), `getMoodTrend` (GET, average mood per day for last 30 days from journal entries), `getCategoryBreakdown` (GET, completion rates grouped by category) | | |
| TASK-013 | Create `src/server/onboarding.ts` — server functions: `getOnboardingStatus` (GET, returns user.onboardingComplete boolean), `completeOnboarding` (POST, receives selected goals/categories, creates initial habits from templates, sets onboardingComplete to true), `getHabitTemplates` (GET, returns predefined habit suggestions grouped by category: e.g., "Drink 8 glasses of water" under Fitness, "10-minute meditation" under Mental Wellness) | | |

---

### Phase 3: Layout, Navigation & App Shell

- GOAL-003: Build the authenticated app shell with responsive sidebar navigation, top bar with user controls, and route protection

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Install shadcn components needed for shell: `pnpm dlx shadcn@latest add sidebar sheet avatar dropdown-menu tooltip badge separator skeleton` | | |
| TASK-015 | Create `src/routes/_authenticated.tsx` — layout route with `beforeLoad` that calls `getAuthOrThrow()`, redirects to `/sign-in` if unauthenticated. Renders app shell: collapsible sidebar (left) with nav items (Dashboard, Habits, Partners, Analytics, Journal, Profile), top bar with logo, streak counter badge, XP level indicator, notification bell, and `UserButton` from Clerk. Mobile: sidebar becomes slide-out sheet. Use shadcn `Sidebar` component | | |
| TASK-016 | Create `src/components/layout/app-sidebar.tsx` — sidebar component with: logo at top, navigation links with icons (LayoutDashboard, CheckSquare, Users, BarChart3, BookOpen, User), active state highlighting via `useRouterState`, badge counts (pending invites on Partners, unread nudges as notification dot), footer with XP progress bar and current level | | |
| TASK-017 | Create `src/components/layout/top-bar.tsx` — top bar component with: greeting ("Good morning, {name}"), current streak fire emoji with count, XP pill badge, notification dropdown (nudges + challenge alerts), dark mode toggle using TanStack Store, Clerk `UserButton` | | |
| TASK-018 | Create `src/stores/app-store.ts` — TanStack Store for client-side UI state: `{ theme: 'light' | 'dark' | 'system', sidebarOpen: boolean, sidebarCollapsed: boolean }` with actions `toggleTheme`, `toggleSidebar`, `collapseSidebar`. Persist theme preference to localStorage | | |
| TASK-019 | Update `src/routes/__root.tsx` — apply dark mode class to `<html>` element based on `appStore.theme`, update `<title>` to "GlowUp Together", add meta description for SEO | | |

---

### Phase 4: Onboarding Flow

- GOAL-004: Build a multi-step onboarding experience for new users that selects goals, creates initial habits, and optionally invites an accountability partner

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Install shadcn components: `pnpm dlx shadcn@latest add card checkbox progress radio-group input label textarea dialog` | | |
| TASK-021 | Create `src/routes/_authenticated/onboarding.tsx` — multi-step onboarding route. Step 1 "Choose Your Goals": grid of category cards (Fitness, Skincare, Learning, Mental Wellness, Productivity) with icons and descriptions, user selects 1+ categories. Step 2 "Pick Your Habits": shows habit templates for selected categories, user can select/deselect, with ability to add custom habits. Step 3 "Set Your Schedule": for each selected habit, pick frequency (daily/weekly) and reminder time. Step 4 "Invite a Partner" (optional): email input to send partner invitation, skip button. Step 5 "You're All Set!": animated celebration with confetti effect, summary of setup, CTA to go to dashboard. Use TanStack Form for each step with Zod validation | | |
| TASK-022 | Add onboarding redirect logic to `src/routes/_authenticated.tsx` — in `beforeLoad`, after auth check, call `getOnboardingStatus()`. If `onboardingComplete` is false and current route is not `/onboarding`, redirect to `/onboarding` | | |

---

### Phase 5: Core Screens — Dashboard, Habits, Profile

- GOAL-005: Implement the three primary daily-use screens with full interactivity, animations, and real-time data

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Install shadcn components: `pnpm dlx shadcn@latest add calendar chart toggle switch select tabs scroll-area alert alert-dialog` | | |
| TASK-024 | Create `src/routes/_authenticated/dashboard.tsx` — home dashboard screen. Sections: (A) motivational greeting with time-of-day awareness ("Good morning, {name}! 🔥"), (B) today's habits checklist — list of habits with one-tap completion toggles, micro-animation on complete (confetti burst, XP +10 popup), completion progress ring showing X/Y habits done, (C) streak card — current longest streak with flame animation, days counter, (D) XP progress — current level, XP progress bar to next level, recent XP events, (E) quick stats row — total completions this week, current streak, badges earned. Use TanStack Query with `queryOptions` for data fetching, optimistic updates on habit completion via `useMutation` | | |
| TASK-025 | Create `src/routes/_authenticated/habits.tsx` — full habit management screen. Tabs: "Active" and "Archived". Active tab: list of all habits grouped by category, each showing title, streak count, completion rate (last 7 days bar), next reminder. Floating action button to create new habit. Archived tab: list of archived habits with option to restore. Click on habit → expand to show detail with weekly completion heatmap, edit button, archive button | | |
| TASK-026 | Create `src/components/habits/habit-form.tsx` — create/edit habit dialog using TanStack Form. Fields: title (required), description (optional), category (select from categories table), frequency (daily/weekly radio), target days per week (if weekly, number input 1-7), reminder time (time input), icon (emoji picker or lucide icon select). Zod schema validation. Used in both create and edit flows | | |
| TASK-027 | Create `src/components/habits/habit-card.tsx` — habit list item component. Shows: icon, title, streak fire + count, 7-day mini completion dots, completion toggle button with animated checkmark. On toggle: optimistic update via TanStack Query `useMutation`, XP gain animation (+10 floating text), streak update. On long press / right-click: context menu with Edit, Archive, View Stats | | |
| TASK-028 | Create `src/routes/_authenticated/profile.tsx` — user profile screen. Sections: (A) profile header — avatar from Clerk, display name, level badge, XP bar, member since date, (B) achievements gallery — grid of badges (earned: full color with earned date, unearned: greyed out with requirement description), (C) statistics cards — total habits completed, longest streak ever, total XP, active habits count, journal entries, days since joining, (D) settings links — notification preferences, account settings (links to Clerk user profile), (E) partner list — active partners with shared stats | | |

---

### Phase 6: Accountability Partner System

- GOAL-006: Build the partner invitation, shared challenges, nudge messaging, and partner dashboard features

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-029 | Create `src/routes/_authenticated/partners.tsx` — partner hub screen. Sections: (A) active partners grid — card for each partner showing avatar, name, their streak, shared challenges count, nudge button, (B) pending invitations — incoming invites with accept/decline buttons, outgoing invites with status, (C) invite new partner — email input with send button, invite link generator | | |
| TASK-030 | Create `src/components/partners/partner-card.tsx` — partner card component. Shows: partner avatar + name, their current top streak, shared challenges (active/completed counts), last activity timestamp, action buttons: Nudge (with daily limit indicator), Challenge, View Profile. Click to expand → shows partner's public habits and completion status for today | | |
| TASK-031 | Create `src/components/partners/challenge-dialog.tsx` — create challenge dialog using TanStack Form. Fields: title (required), description (optional), due date (date picker, min tomorrow), partner auto-filled. Assigned to specific partner. Shows in both users' partner views | | |
| TASK-032 | Create `src/components/partners/nudge-dialog.tsx` — send nudge dialog. Quick message presets ("Hey, don't forget your habits today! 💪", "Keep the streak alive! 🔥", "You got this! 🌟") plus custom message textarea. Shows remaining nudges for today (max 3) | | |
| TASK-033 | Create `src/components/notifications/notification-dropdown.tsx` — notification bell dropdown in top bar. Shows unread nudges, challenge assignments, challenge completions, partner invite acceptances. Each item: avatar, message, timestamp, click to navigate to relevant screen. Mark all as read button | | |

---

### Phase 7: Analytics & Journal

- GOAL-007: Build the progress analytics dashboard with charts and the journal/reflection feature with photo support

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-034 | Create `src/routes/_authenticated/analytics.tsx` — analytics dashboard. Sections: (A) weekly overview — bar chart showing daily completion counts for last 7 days using shadcn Chart (recharts), (B) monthly completion rate — line chart showing completion percentage trend over 30 days, (C) category breakdown — donut chart showing completions by category, (D) streak leaderboard — user's habits ranked by streak length, (E) mood vs productivity — scatter plot comparing journal mood ratings vs habit completion rate (if journal data exists), (F) monthly summary card — total completions, XP earned, badges earned, best day, worst day | | |
| TASK-035 | Create `src/routes/_authenticated/journal.tsx` — journal timeline screen. Layout: reverse-chronological list of journal entries. Each entry card shows: date, mood emoji (😢😐😊😄🤩), text content (truncated with expand), photo thumbnails (click to full-size modal), edit/delete actions. Floating action button to create new entry. Filter bar: date range picker, mood filter | | |
| TASK-036 | Create `src/components/journal/journal-form.tsx` — create/edit journal entry dialog using TanStack Form. Fields: content (textarea, required, min 10 chars), mood (1-5 emoji selector), photos (file upload, max 3, max 5MB each, image/* only). Photo preview with remove button. Zod validation | | |
| TASK-037 | Create `src/server/uploads.ts` — Cloudflare R2 photo upload handling. `getUploadUrl` server function (POST): generates a presigned R2 PUT URL with 10-minute expiry, returns { uploadUrl, objectKey }. `getPhotoUrl` server function (GET): generates a presigned R2 GET URL for a given objectKey. Client uploads directly to R2 via the presigned URL, then stores the objectKey in journal entry's `photoKeys` JSONB array. Validate: max 3 photos per entry, image/* content types only, max 5MB. Requires R2 bucket setup in `wrangler.jsonc` and `R2_BUCKET_NAME` binding | | |

---

### Phase 8: Landing Page, Polish & PWA

- GOAL-008: Create a public landing page, add micro-animations, loading states, error boundaries, and PWA support

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-038 | Redesign `src/routes/index.tsx` — public landing page (unauthenticated). Hero section: app name "GlowUp Together", tagline "Build better habits. Stay accountable. Transform together.", animated gradient background, CTA buttons (Sign Up, Sign In). Feature cards section: 6 cards for core features (Habit Tracking, Streak System, Accountability Partners, Gamification, Analytics, Journal) with icons and descriptions. Social proof section: stats counters (habits tracked, streaks maintained, etc. — can be placeholder for now). Footer with links | | |
| TASK-039 | Add loading skeletons to all data-dependent components using shadcn `Skeleton`. Dashboard: skeleton cards for stats, skeleton list for habits. Habits: skeleton list items. Analytics: skeleton chart areas. Partners: skeleton cards. Journal: skeleton entry cards | | |
| TASK-040 | Add error boundaries to route components using TanStack Router's `errorComponent`. Show friendly error messages with retry buttons using shadcn `Alert` | | |
| TASK-041 | Add micro-animations throughout the app: (A) habit completion — checkmark animation with confetti particles and XP gain floating text, (B) streak milestone — fire emoji burst at 7, 30, 100 days, (C) badge unlock — modal with badge reveal animation, (D) level up — full-screen celebration overlay, (E) page transitions — smooth fade-in using CSS `@starting-style` or `View Transitions API`. Use CSS animations and `tw-animate-css` (already installed) | | |
| TASK-042 | Update `public/manifest.json` for PWA: set app name "GlowUp Together", short_name "GlowUp", theme_color matching primary color, display "standalone". Update icons with app-branded versions. Add `<link rel="manifest">` to root route head | | |
| TASK-043 | Add `src/routes/_authenticated/settings.tsx` — user settings page. Sections: notification preferences (streak reminders on/off, partner nudges on/off, weekly summary on/off), theme selection (light/dark/system), account management (links to Clerk profile), data export (download habit data as JSON) | | |

## 3. Alternatives

- **ALT-001**: Considered using Firebase/Supabase instead of Neon+Drizzle — rejected because Neon was already scaffolded, integrates natively with Cloudflare Workers via `@neondatabase/serverless`, and Drizzle provides type-safe schema with migrations
- **ALT-002**: Considered building a separate REST API with Express — rejected in favor of TanStack Start `createServerFn` which provides type-safe server functions, automatic SSR, and eliminates the need for a separate API layer
- **ALT-003**: Considered Zustand for client state — rejected in favor of TanStack Store which is already scaffolded and is lightweight (500B) for the simple UI state we need (theme, sidebar)
- **ALT-004**: Considered base64 in JSONB for photo storage — rejected in favor of Cloudflare R2 from the start to avoid DB bloat and a painful migration later
- **ALT-005**: Considered React Native / Expo for mobile — rejected for Phase 1 per requirements. Responsive web with PWA support provides mobile-like experience without the complexity of a native app
- **ALT-006**: Considered socket-based real-time notifications — deferred. For MVP, notifications are fetched via polling (TanStack Query `refetchInterval`) and displayed in a dropdown. WebSocket/SSE can be added later

## 4. Dependencies

- **DEP-001**: `@clerk/tanstack-react-start@1.3.2` — already installed, provides `getAuth()`, `clerkMiddleware()`, `SignIn`, `SignUp`, `UserButton` components
- **DEP-002**: `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` — already installed, used for schema definition, migrations, and type-safe queries
- **DEP-003**: `@neondatabase/serverless@1.x` — already installed, Neon serverless driver for Cloudflare Workers
- **DEP-004**: `@tanstack/react-query@latest` — already installed, server state management with SSR integration
- **DEP-005**: `@tanstack/react-form@latest` — already installed, form management with Zod validation
- **DEP-006**: `@tanstack/store@latest` + `@tanstack/react-store@latest` — already installed, client-side state
- **DEP-007**: `shadcn@4.10.0` — already installed, component library (base-mira style, olive theme)
- **DEP-008**: `zod@4.x` — already installed, schema validation for forms and server function inputs
- **DEP-009**: `lucide-react@0.545.0` — already installed, icon library
- **DEP-010**: `recharts` — will be installed with shadcn Chart component (`pnpm dlx shadcn@latest add chart`)
- **DEP-011**: `date-fns` or `dayjs` — to be installed for date manipulation (streak calculation, analytics date ranges, relative timestamps)

## 5. Files

### New Files

- **FILE-001**: `src/db/schema.ts` — [MODIFY] Complete database schema with all tables and relations
- **FILE-002**: `src/db/seed.ts` — [NEW] Database seed data (default categories, badges)
- **FILE-003**: `src/server/auth.ts` — [NEW] Auth helper functions
- **FILE-004**: `src/server/habits.ts` — [NEW] Habit CRUD and completion server functions
- **FILE-005**: `src/server/streaks.ts` — [NEW] Streak calculation server functions
- **FILE-006**: `src/server/gamification.ts` — [NEW] XP, levels, and badges server functions
- **FILE-007**: `src/server/partners.ts` — [NEW] Partnership, nudges, challenges server functions
- **FILE-008**: `src/server/journal.ts` — [NEW] Journal CRUD server functions
- **FILE-009**: `src/server/analytics.ts` — [NEW] Analytics data aggregation server functions
- **FILE-010**: `src/server/onboarding.ts` — [NEW] Onboarding flow server functions
- **FILE-011**: `src/server/uploads.ts` — [NEW] Photo upload handling
- **FILE-012**: `src/stores/app-store.ts` — [NEW] TanStack Store for UI state
- **FILE-013**: `src/routes/_authenticated.tsx` — [NEW] Authenticated layout route with sidebar
- **FILE-014**: `src/routes/_authenticated/dashboard.tsx` — [NEW] Home dashboard
- **FILE-015**: `src/routes/_authenticated/habits.tsx` — [NEW] Habit management
- **FILE-016**: `src/routes/_authenticated/partners.tsx` — [NEW] Partner hub
- **FILE-017**: `src/routes/_authenticated/analytics.tsx` — [NEW] Analytics dashboard
- **FILE-018**: `src/routes/_authenticated/journal.tsx` — [NEW] Journal timeline
- **FILE-019**: `src/routes/_authenticated/profile.tsx` — [NEW] User profile
- **FILE-020**: `src/routes/_authenticated/onboarding.tsx` — [NEW] Onboarding flow
- **FILE-021**: `src/routes/_authenticated/settings.tsx` — [NEW] User settings
- **FILE-022**: `src/components/layout/app-sidebar.tsx` — [NEW] Sidebar navigation
- **FILE-023**: `src/components/layout/top-bar.tsx` — [NEW] Top bar with user controls
- **FILE-024**: `src/components/habits/habit-card.tsx` — [NEW] Habit list item
- **FILE-025**: `src/components/habits/habit-form.tsx` — [NEW] Create/edit habit form
- **FILE-026**: `src/components/partners/partner-card.tsx` — [NEW] Partner card
- **FILE-027**: `src/components/partners/challenge-dialog.tsx` — [NEW] Challenge creation
- **FILE-028**: `src/components/partners/nudge-dialog.tsx` — [NEW] Nudge sending
- **FILE-029**: `src/components/journal/journal-form.tsx` — [NEW] Journal entry form
- **FILE-030**: `src/components/notifications/notification-dropdown.tsx` — [NEW] Notification bell
- **FILE-031**: `src/components/ui/*.tsx` — [NEW] shadcn components added via CLI

### Modified Files

- **FILE-032**: `src/routes/index.tsx` — [MODIFY] Replace placeholder with landing page
- **FILE-033**: `src/routes/__root.tsx` — [MODIFY] Add dark mode class, update title/meta
- **FILE-034**: `src/db/index.ts` — [MODIFY] Switch to Neon HTTP adapter
- **FILE-035**: `public/manifest.json` — [MODIFY] Update PWA metadata

## 6. Testing

- **TEST-001**: Verify database schema pushes without errors — `pnpm run db:push` exits cleanly
- **TEST-002**: Verify seed data populates correctly — run seed script, query categories and badges tables
- **TEST-003**: Verify auth protection — unauthenticated requests to `/_authenticated/*` routes redirect to `/sign-in`
- **TEST-004**: Verify habit CRUD — create habit, complete it, verify streak increments, verify XP awards
- **TEST-005**: Verify partner flow — send invite, accept invite, send nudge, create challenge, complete challenge
- **TEST-006**: Verify onboarding flow — new user redirected to onboarding, complete all steps, redirected to dashboard
- **TEST-007**: Verify analytics data — complete habits over multiple days, verify charts show correct data
- **TEST-008**: Verify journal CRUD — create entry with mood and photos, edit entry, delete entry
- **TEST-009**: Verify dark mode — toggle theme, verify all screens render correctly in both modes
- **TEST-010**: Verify responsive layout — test all screens at 375px (mobile), 768px (tablet), 1440px (desktop) widths
- **TEST-011**: Verify dev server starts without errors — `pnpm run dev` boots cleanly
- **TEST-012**: Verify production build — `pnpm run build` completes without errors

## 7. Risks & Assumptions

### Risks

- **RISK-001**: R2 presigned URLs add complexity — mitigated by keeping the upload flow simple (client → presigned PUT → store key) and using Cloudflare's native R2 bindings
- **RISK-002**: Cloudflare Workers have a 128MB memory limit and 30s CPU time limit — mitigated by keeping server functions lightweight and paginating large queries
- **RISK-003**: TanStack Start is still evolving rapidly (using `latest` tag) — mitigated by pinning versions after initial development stabilizes
- **RISK-004**: Streak calculation on-read could be slow with many completions — mitigated by indexing `habitCompletions(habitId, completedDate)` and TanStack Query caching
- **RISK-005**: Partner system could be used for harassment via nudges — mitigated by rate limiting (3 nudges/day/partnership) and ability to end partnership

### Assumptions

- **ASSUMPTION-001**: Clerk is configured and `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
- **ASSUMPTION-002**: Neon database is provisioned and `DATABASE_URL` is set in `.env.local`
- **ASSUMPTION-003**: Users have modern browsers supporting CSS oklch(), View Transitions API (progressive enhancement)
- **ASSUMPTION-004**: shadcn CLI (`pnpm dlx shadcn@latest add`) works correctly with the existing `components.json` configuration
- **ASSUMPTION-005**: The app will initially have <1000 users — database queries can be optimized later with indexes as usage grows

## 8. Related Specifications / Further Reading

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [TanStack Router File-based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [TanStack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [TanStack Form Guide](https://tanstack.com/form/latest/docs/framework/react/guides/basic-concepts)
- [TanStack Store Guide](https://tanstack.com/store/latest/docs/overview)
- [Clerk TanStack Start Quickstart](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart)
- [Drizzle ORM PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
