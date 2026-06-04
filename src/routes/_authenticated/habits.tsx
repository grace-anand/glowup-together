import { createFileRoute } from '@tanstack/react-router'
import {
  Plus,
  Flame,
  CheckCircle2,
  Circle,
  Archive,
  RotateCcw,
  MoreVertical,
  Edit,
  Archive as ArchiveIcon,
} from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

export const Route = createFileRoute('/_authenticated/habits')({
  component: HabitsPage,
})

// ─── Placeholder Data ───────────────────────────────────────────────────────

const categories = [
  {
    name: 'Fitness',
    icon: '💪',
    habits: [
      { id: 1, title: 'Morning workout', streak: 12, weekCompletion: [true, true, true, false, true, true, true], frequency: 'daily' as const },
      { id: 2, title: 'Drink 8 glasses of water', streak: 3, weekCompletion: [true, false, true, true, false, true, false], frequency: 'daily' as const },
    ],
  },
  {
    name: 'Learning',
    icon: '📚',
    habits: [
      { id: 3, title: 'Read for 20 min', streak: 5, weekCompletion: [true, true, true, true, true, false, false], frequency: 'daily' as const },
    ],
  },
  {
    name: 'Skincare',
    icon: '✨',
    habits: [
      { id: 4, title: 'Skincare routine', streak: 8, weekCompletion: [true, true, true, true, true, true, true], frequency: 'daily' as const },
    ],
  },
  {
    name: 'Mental Wellness',
    icon: '🧘',
    habits: [
      { id: 5, title: '10-min meditation', streak: 0, weekCompletion: [false, false, true, false, false, false, false], frequency: 'daily' as const },
    ],
  },
]

const archivedHabits = [
  { id: 6, title: 'Evening walk', icon: '🚶', archivedAt: '2 weeks ago' },
  { id: 7, title: 'Practice guitar', icon: '🎸', archivedAt: '1 month ago' },
]

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Component ──────────────────────────────────────────────────────────────

function HabitsPage() {
  const totalHabits = categories.reduce((sum, c) => sum + c.habits.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground">
            {totalHabits} active habits across {categories.length} categories
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <Plus className="size-4" />
          New Habit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({totalHabits})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedHabits.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Habits */}
        <TabsContent value="active" className="mt-4 space-y-6">
          {categories.map((category) => (
            <div key={category.name} className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span>{category.icon}</span>
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.habits.map((habit) => (
                  <HabitRow key={habit.id} habit={habit} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Archived Habits */}
        <TabsContent value="archived" className="mt-4 space-y-2">
          {archivedHabits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Archive className="size-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                  No archived habits
                </p>
              </CardContent>
            </Card>
          ) : (
            archivedHabits.map((habit) => (
              <Card key={habit.id} className="opacity-60">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{habit.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{habit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Archived {habit.archivedAt}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <RotateCcw className="size-3.5" />
                    Restore
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Habit Row ──────────────────────────────────────────────────────────────

function HabitRow({
  habit,
}: {
  habit: {
    id: number
    title: string
    streak: number
    weekCompletion: boolean[]
    frequency: 'daily' | 'weekly'
  }
}) {
  const completionRate = Math.round(
    (habit.weekCompletion.filter(Boolean).length / habit.weekCompletion.length) *
      100,
  )

  return (
    <Card className="transition-all hover:border-primary/30">
      <CardContent className="flex items-center gap-4 py-3">
        {/* Title + Streak */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{habit.title}</p>
            {habit.streak > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                <Flame className="size-3 text-orange-500" />
                {habit.streak}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {habit.frequency === 'daily' ? 'Daily' : 'Weekly'} •{' '}
            {completionRate}% this week
          </p>
        </div>

        {/* 7-Day Completion Dots */}
        <div className="hidden sm:flex items-center gap-1">
          {habit.weekCompletion.map((completed, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-0.5"
              title={dayLabels[i]}
            >
              {completed ? (
                <CheckCircle2 className="size-4 text-primary fill-primary/20" />
              ) : (
                <Circle className="size-4 text-muted-foreground/30" />
              )}
              <span className="text-[8px] text-muted-foreground">
                {dayLabels[i]?.[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArchiveIcon className="mr-2 size-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
