import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BarChart3,
  BookOpen,
  User,
  Settings,
  Flame,
  Sparkles,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import { Progress } from '#/components/ui/progress'

// ─── Navigation Items ───────────────────────────────────────────────────────

const navItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { title: 'Habits', to: '/habits', icon: CheckSquare },
  { title: 'Partners', to: '/partners', icon: Users },
  { title: 'Analytics', to: '/analytics', icon: BarChart3 },
  { title: 'Journal', to: '/journal', icon: BookOpen },
  { title: 'Profile', to: '/profile', icon: User },
] as const

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Header / Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent active:bg-transparent"
              render={<Link to="/dashboard" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">GlowUp</span>
                <span className="truncate text-xs text-muted-foreground">
                  Together
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = currentPath.startsWith(item.to)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentPath.startsWith('/settings')}
                  tooltip="Settings"
                  render={<Link to="/settings" />}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — XP Progress */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 px-2 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Flame className="size-3.5 text-orange-500" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Level Up!
                </span>
              </div>
              <Progress
                value={35}
                className="h-1.5 group-data-[collapsible=icon]:hidden"
              />
              <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                350 / 1000 XP to next level
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
