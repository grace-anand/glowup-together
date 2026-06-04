import { createFileRoute } from '@tanstack/react-router'
import {
  Flame,
  Zap,
  Trophy,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

// ─── Placeholder Data (until server functions are wired) ─────────────────────

const todaysHabits = [
  { id: 1, title: 'Morning workout', icon: '💪', completed: true, streak: 12 },
  { id: 2, title: 'Read for 20 min', icon: '📚', completed: true, streak: 5 },
  { id: 3, title: 'Drink 8 glasses of water', icon: '💧', completed: false, streak: 3 },
  { id: 4, title: 'Skincare routine', icon: '✨', completed: false, streak: 8 },
  { id: 5, title: '10-min meditation', icon: '🧘', completed: false, streak: 0 },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

function Dashboard() {
  const completedCount = todaysHabits.filter((h) => h.completed).length
  const totalCount = todaysHabits.length
  const completionPercent = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}! 🔥
        </h1>
        <p className="text-muted-foreground">
          {completedCount === totalCount
            ? "You've crushed all your habits today!"
            : `You have ${totalCount - completedCount} habits left today. Keep going!`}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Streak"
          value="12 days"
          icon={<Flame className="size-4 text-orange-500" />}
          description="Your longest active streak"
        />
        <StatCard
          title="Total XP"
          value="350"
          icon={<Zap className="size-4 text-yellow-500" />}
          description="Level 1 • 650 XP to next"
        />
        <StatCard
          title="This Week"
          value={`${completedCount}/${totalCount}`}
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          description={`${completionPercent}% completion rate`}
        />
        <StatCard
          title="Badges Earned"
          value="3"
          icon={<Trophy className="size-4 text-purple-500" />}
          description="2 more to unlock"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Habits — Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Habits</h2>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalCount} done
            </Badge>
          </div>

          {/* Completion Progress */}
          <div className="space-y-2">
            <Progress value={completionPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionPercent}% of today's habits completed
            </p>
          </div>

          {/* Habit List */}
          <div className="space-y-2">
            {todaysHabits.map((habit) => (
              <HabitCheckItem
                key={habit.id}
                title={habit.title}
                icon={habit.icon}
                completed={habit.completed}
                streak={habit.streak}
              />
            ))}
          </div>
        </div>

        {/* Right Column — Streak & XP */}
        <div className="space-y-4">
          {/* Streak Card */}
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-5 text-orange-500" />
                Streak on Fire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <span className="text-5xl font-black text-orange-500">12</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  consecutive days
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  🔥 18 more days until 30-Day Discipline badge!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* XP Progress Card */}
          <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-5 text-yellow-500" />
                Level 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={35} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                350 / 1,000 XP
              </p>
              <div className="space-y-1.5">
                <XpEvent label="Completed: Morning workout" xp={10} />
                <XpEvent label="Completed: Read for 20 min" xp={10} />
                <XpEvent label="7-Day Streak Bonus! 🔥" xp={50} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function HabitCheckItem({
  title,
  icon,
  completed,
  streak,
}: {
  title: string
  icon: string
  completed: boolean
  streak: number
}) {
  return (
    <Card
      className={`transition-all duration-200 ${
        completed
          ? 'border-primary/20 bg-primary/5'
          : 'hover:border-primary/30 hover:bg-card/80'
      }`}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 shrink-0 rounded-full ${
            completed
              ? 'text-primary hover:text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="size-5 fill-primary/20" />
          ) : (
            <Circle className="size-5" />
          )}
        </Button>

        <span className="text-lg">{icon}</span>

        <span
          className={`flex-1 text-sm font-medium ${
            completed ? 'text-muted-foreground line-through' : ''
          }`}
        >
          {title}
        </span>

        {streak > 0 && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Flame className="size-3 text-orange-500" />
            {streak}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

function XpEvent({ label, xp }: { label: string; xp: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-yellow-500">+{xp}</span>
    </div>
  )
}
