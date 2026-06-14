import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

interface NavigationItem {
  label: string
  path: string
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Boards', path: '/boards' },
  { label: 'AI Generator', path: '/ai-generator' },
  { label: 'AI Assistant', path: '/ai-assistant' },
  { label: 'Telegram Inbox', path: '/telegram-inbox' },
  { label: 'Billing', path: '/billing' },
  { label: 'Settings', path: '/settings' },
]

const getNavLinkClassName = (isActive: boolean): string =>
  `flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-50'
      : 'text-surface-800 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800'
  }`

const SidebarNavigation = ({ onNavigate }: { onNavigate?: () => void }): JSX.Element => (
  <nav aria-label="Main navigation" className="space-y-1 p-3">
    {navigationItems.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={({ isActive }) => getNavLinkClassName(isActive)}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-surface-100 text-xs font-semibold text-surface-700 dark:bg-surface-700 dark:text-surface-100">
          {item.label.charAt(0)}
        </span>
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
)

export const AppSidebarLayout = (): JSX.Element => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
    }
  }, [isMobileMenuOpen])

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900 lg:block">
        <div className="px-4 py-6">
          <p className="text-lg font-semibold">AI Task Board</p>
        </div>
        <SidebarNavigation />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-surface-100 bg-white px-4 dark:border-surface-800 dark:bg-surface-900 lg:hidden">
          <button
            type="button"
            className="rounded-card border border-surface-200 px-3 py-1 text-sm font-medium text-surface-900 dark:border-surface-700 dark:text-surface-50"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            Menu
          </button>
          <p className="text-sm font-semibold">AI Task Board</p>
          <span className="w-14" />
        </header>

        <main className="min-h-screen px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-surface-900/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative h-full w-64 border-r border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between px-4 py-6">
              <p className="text-lg font-semibold">AI Task Board</p>
              <button
                type="button"
                className="rounded-card border border-surface-200 px-3 py-1 text-sm font-medium text-surface-900 dark:border-surface-700 dark:text-surface-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Close
              </button>
            </div>
            <SidebarNavigation onNavigate={() => setIsMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  )
}
