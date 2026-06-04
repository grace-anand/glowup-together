import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { Flame, Zap, Trophy, CheckCircle2, Calendar, BookOpen } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Progress } from '#/components/ui/progress'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

const mockBadges = [
  { name: '7-Day Warrior', icon: '🔥', earned: true, date: 'May 28' },
  { name: 'First Step', icon: '🌱', earned: true, date: 'May 20' },
  { name: 'Rising Star', icon: '⭐', earned: true, date: 'Jun 1' },
  { name: '30-Day Discipline', icon: '💎', earned: false, requirement: '30-day streak' },
  { name: 'Habit Machine', icon: '⚙️', earned: false, requirement: '100 completions' },
  { name: 'Legend', icon: '🌟', earned: false, requirement: '5,000 XP' },
]

function ProfilePage() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        <CardContent className="-mt-10 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-4 pb-6">
          <Avatar className="size-20 border-4 border-background">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{user?.fullName || 'User'}</h1>
            <p className="text-sm text-muted-foreground">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge variant="secondary" className="gap-1">
                <Zap className="size-3 text-yellow-500" />
                Level 1
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Flame className="size-3 text-orange-500" />
                12 day streak
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XP Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-yellow-500" />
            Experience Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black">350</span>
            <span className="text-sm text-muted-foreground">1,000 XP to Level 2</span>
          </div>
          <Progress value={35} className="h-2" />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniStat icon={<CheckCircle2 className="size-4 text-emerald-500" />} label="Habits Completed" value="127" />
        <MiniStat icon={<Flame className="size-4 text-orange-500" />} label="Longest Streak" value="12 days" />
        <MiniStat icon={<Trophy className="size-4 text-purple-500" />} label="Badges Earned" value="3 / 14" />
        <MiniStat icon={<Calendar className="size-4 text-blue-500" />} label="Active Habits" value="5" />
        <MiniStat icon={<BookOpen className="size-4 text-pink-500" />} label="Journal Entries" value="12" />
        <MiniStat icon={<Zap className="size-4 text-yellow-500" />} label="Total XP" value="350" />
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Achievements</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mockBadges.map((badge) => (
            <Card
              key={badge.name}
              className={`transition-all ${
                badge.earned
                  ? 'border-primary/20 bg-primary/5'
                  : 'opacity-50 grayscale'
              }`}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <span className="text-3xl">{badge.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {badge.earned
                      ? `Earned ${badge.date}`
                      : `Requires: ${badge.requirement}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
