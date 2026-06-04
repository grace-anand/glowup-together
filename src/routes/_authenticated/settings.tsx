import { createFileRoute } from '@tanstack/react-router'
import { Moon, Sun, Monitor, Download, User } from 'lucide-react'
import { useStore } from '@tanstack/react-store'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Separator } from '#/components/ui/separator'
import { appStore, setTheme } from '#/stores/app-store'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const theme = useStore(appStore, (s) => s.theme)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and account
        </p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'light' as const, icon: Sun, label: 'Light' },
              { value: 'dark' as const, icon: Moon, label: 'Dark' },
              { value: 'system' as const, icon: Monitor, label: 'System' },
            ]).map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={theme === value ? 'default' : 'outline'}
                className="flex-col gap-1.5 h-auto py-3"
                onClick={() => setTheme(value)}
              >
                <Icon className="size-5" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotifToggle
            label="Streak reminders"
            description="Get reminded when you're about to lose a streak"
            defaultChecked={true}
          />
          <Separator />
          <NotifToggle
            label="Partner nudges"
            description="Receive nudge notifications from partners"
            defaultChecked={true}
          />
          <Separator />
          <NotifToggle
            label="Weekly summary"
            description="Get a weekly progress summary"
            defaultChecked={false}
          />
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2">
            <User className="size-4" />
            Manage Clerk Profile
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Download className="size-4" />
            Export Data (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function NotifToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string
  description: string
  defaultChecked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}
