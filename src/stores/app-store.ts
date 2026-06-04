import { Store } from '@tanstack/store'

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system'

interface AppState {
  theme: Theme
  sidebarOpen: boolean
  sidebarCollapsed: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('glowup-theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark' // Default to dark for the glow-up aesthetic
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const appStore = new Store<AppState>({
  theme: typeof window !== 'undefined' ? getInitialTheme() : 'dark',
  sidebarOpen: false,
  sidebarCollapsed: false,
})

// ─── Actions ────────────────────────────────────────────────────────────────

export function setTheme(theme: Theme) {
  appStore.setState((prev) => ({ ...prev, theme }))
  if (typeof window !== 'undefined') {
    localStorage.setItem('glowup-theme', theme)
    applyTheme(theme)
  }
}

export function toggleTheme() {
  const current = appStore.state.theme
  const next: Theme = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark'
  setTheme(next)
}

export function toggleSidebar() {
  appStore.setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))
}

export function setSidebarOpen(open: boolean) {
  appStore.setState((prev) => ({ ...prev, sidebarOpen: open }))
}

export function collapseSidebar() {
  appStore.setState((prev) => ({
    ...prev,
    sidebarCollapsed: !prev.sidebarCollapsed,
  }))
}

// ─── Theme Application ─────────────────────────────────────────────────────

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const resolved = getResolvedTheme(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/**
 * Initialize theme on app load.
 * Call this once in the root component.
 */
export function initTheme() {
  if (typeof window === 'undefined') return

  const theme = getInitialTheme()
  appStore.setState((prev) => ({ ...prev, theme }))
  applyTheme(theme)

  // Listen for system preference changes when theme is 'system'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (appStore.state.theme === 'system') {
      applyTheme('system')
    }
  })
}

export { getResolvedTheme }
