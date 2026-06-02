import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY && typeof window !== 'undefined') {
  console.warn(
    '[Clerk] VITE_CLERK_PUBLISHABLE_KEY is not set. Clerk auth is disabled. ' +
      'Add your key to .env.local to enable Clerk. ' +
      'Get it from https://dashboard.clerk.com → API Keys',
  )
}

export default function AppClerkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!PUBLISHABLE_KEY) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  )
}
