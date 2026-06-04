import { UserButton } from '@clerk/tanstack-react-start'
import { useUser } from '@clerk/react'
import { Moon, Sun, Monitor, Bell, Flame } from 'lucide-react'
import { useStore } from '@tanstack/react-store'

import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { SidebarTrigger } from '#/components/ui/sidebar'
import { Separator } from '#/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { appStore, setTheme } from '#/stores/app-store'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TopBar() {
  const { user } = useUser()
  const theme = useStore(appStore, (s) => s.theme)

  const firstName = user?.firstName || 'there'
  const greeting = getGreeting()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
      {/* Left: Sidebar trigger + Greeting */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <h2 className="text-sm font-medium text-foreground">
          {greeting},{' '}
          <span className="font-semibold">{firstName}</span> 👋
        </h2>
      </div>

      {/* Right: Actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Streak Badge */}
        <Badge
          variant="secondary"
          className="gap-1 text-xs font-semibold"
        >
          <Flame className="size-3 text-orange-500" />
          <span>0</span>
        </Badge>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon">
                {theme === 'dark' ? (
                  <Moon className="size-4" />
                ) : theme === 'light' ? (
                  <Sun className="size-4" />
                ) : (
                  <Monitor className="size-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 size-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 size-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 size-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Clerk User Button */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'size-7',
            },
          }}
        />
      </div>
    </header>
  )
}
