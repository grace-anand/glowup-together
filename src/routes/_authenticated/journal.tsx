import { createFileRoute } from '@tanstack/react-router'
import { Plus, BookOpen } from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/_authenticated/journal')({
  component: JournalPage,
})

const moodEmojis: Record<number, string> = {
  1: '😢',
  2: '😐',
  3: '😊',
  4: '😄',
  5: '🤩',
}

const mockEntries = [
  {
    id: 1,
    date: 'Today',
    mood: 4,
    content: 'Had a great workout this morning and finally hit my 10-day streak on meditation. Feeling really motivated to keep going!',
  },
  {
    id: 2,
    date: 'Yesterday',
    mood: 3,
    content: 'Average day. Completed most of my habits but missed the evening skincare routine. Need to set a better reminder.',
  },
  {
    id: 3,
    date: '2 days ago',
    mood: 5,
    content: 'Unlocked the 7-Day Warrior badge! 🔥 Also got a nudge from Alex which was really motivating. This accountability thing works!',
  },
]

function JournalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
          <p className="text-muted-foreground">
            Reflect on your journey and track your mood
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          New Entry
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          📝 {mockEntries.length} entries
        </Badge>
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          😊 Avg mood: 4.0
        </Badge>
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          🔥 3 this week
        </Badge>
      </div>

      {/* Journal Entries */}
      <div className="space-y-3">
        {mockEntries.map((entry) => (
          <Card key={entry.id} className="transition-all hover:border-primary/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{moodEmojis[entry.mood]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {entry.date}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      Mood: {entry.mood}/5
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {mockEntries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">Start your journal</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reflect on your day, track your mood, and document your progress.
            </p>
            <Button className="mt-4 gap-2">
              <Plus className="size-4" />
              Write your first entry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
