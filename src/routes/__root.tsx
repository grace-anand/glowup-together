import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import ClerkProvider from '../integrations/clerk/provider'
import { TooltipProvider } from '#/components/ui/tooltip'
import { initTheme } from '#/stores/app-store'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'GlowUp Together — Build Better Habits. Transform Together.' },
      {
        name: 'description',
        content:
          'Track habits, build streaks, stay accountable with friends, and level up your self-improvement journey. GlowUp Together combines habit tracking, gamification, and accountability partnerships into one powerful growth ecosystem.',
      },
      { name: 'theme-color', content: '#1a1a1a' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          <TooltipProvider delay={300}>
            {children}
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          </TooltipProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
