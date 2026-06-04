import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

import { AppSidebar } from '#/components/layout/app-sidebar'
import { TopBar } from '#/components/layout/top-bar'
import { SidebarProvider, SidebarInset } from '#/components/ui/sidebar'

// Server function to check auth status
const getAuthStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const authObj = await auth()
  return { userId: authObj.userId }
})

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { userId } = await getAuthStatus()
    if (!userId) {
      throw redirect({ to: '/sign-in/$', params: {} })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
