import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../state/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" onClick={toggle} aria-label={`Switch to ${next} theme`} className="rounded-control p-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
      {theme === 'dark' ? <Sun aria-hidden className="size-[18px]" /> : <Moon aria-hidden className="size-[18px]" />}
    </button>
  )
}
