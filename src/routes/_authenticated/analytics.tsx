import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/_authenticated/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your progress and identify trends
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatMini label="This Week" value="78%" sub="completion rate" />
        <StatMini label="This Month" value="234" sub="habits completed" />
        <StatMini label="XP Earned" value="1,250" sub="last 30 days" />
        <StatMini label="Best Day" value="Tuesday" sub="most productive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {[5, 8, 6, 9, 7, 4, 3].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all"
                    style={{ height: `${(val / 9) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Fitness', percent: 85, color: 'bg-red-500' },
              { name: 'Skincare', percent: 92, color: 'bg-pink-500' },
              { name: 'Learning', percent: 68, color: 'bg-blue-500' },
              { name: 'Mental Wellness', percent: 45, color: 'bg-purple-500' },
              { name: 'Productivity', percent: 73, color: 'bg-amber-500' },
            ].map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-muted-foreground">{cat.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color} transition-all`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatMini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}
