import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { isMock } from '../../api'
import { cn } from '../../lib/cn'
import { Link } from '../../lib/router'
import { useAuth } from '../../state/auth'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/documents', label: 'Documents' },
  { to: '/research', label: 'Research' },
]

export function AppShell({ route, children }: { route: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  const isActive = (to: string) => (to === '/' ? route === '/' : route.startsWith(to))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Context Management Engine, home" className="shrink-0 rounded-md">
            <Brand />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-current={isActive(n.to) ? 'page' : undefined}
                className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', isActive(n.to) ? 'bg-sunken font-medium text-ink' : 'text-muted hover:text-ink')}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {isMock && (
              <span title="Responses and documents come from the development mock adapter, not the backend." className="mr-1 whitespace-nowrap rounded-full border border-warn/40 bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
                Demo data
              </span>
            )}
            <ThemeToggle />
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <span className="hidden max-w-[10rem] truncate px-2 text-sm text-muted md:block">{user?.name}</span>
            <button type="button" onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="rounded-control p-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
              <LogOut aria-hidden className="size-[18px]" />
            </button>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 border-t border-line px-3 py-1.5 sm:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} aria-current={isActive(n.to) ? 'page' : undefined} className={cn('flex-1 rounded-md py-1.5 text-center text-sm', isActive(n.to) ? 'bg-sunken font-medium' : 'text-muted')}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
