import { createFileRoute } from '@tanstack/react-router'
import { Plus, Send, MessageCircle } from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'


export const Route = createFileRoute('/_authenticated/partners')({
  component: PartnersPage,
})

const mockPartners = [
  { id: 1, name: 'Alex Chen', initials: 'AC', streak: 8, challenges: 2, lastActive: '2h ago' },
  { id: 2, name: 'Jordan Lee', initials: 'JL', streak: 15, challenges: 1, lastActive: '30m ago' },
]

function PartnersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground">
            {mockPartners.length} accountability partners
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Invite Partner
        </Button>
      </div>

      {/* Invite Link */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <Send className="size-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Share your invite link</p>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can become your accountability partner
            </p>
          </div>
          <Button variant="secondary" size="sm">
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Active Partners */}
      <div className="grid gap-4 sm:grid-cols-2">
        {mockPartners.map((partner) => (
          <Card key={partner.id} className="transition-all hover:border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {partner.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{partner.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Active {partner.lastActive}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      🔥 {partner.streak} day streak
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      🎯 {partner.challenges} challenges
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 gap-1.5">
                  <MessageCircle className="size-3.5" />
                  Nudge
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 gap-1.5">
                  🎯 Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
