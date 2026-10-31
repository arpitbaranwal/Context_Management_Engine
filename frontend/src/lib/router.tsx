import { useEffect, useState, type AnchorHTMLAttributes } from 'react'

/** Tiny hash/pathname router. */
const read = () => {
  const hash = window.location.hash.replace(/^#/, '').split('?')[0]
  if (hash) return hash.startsWith('/') ? hash : `/${hash}`
  const path = window.location.pathname || '/'
  return path
}

export function useRoute(): string {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => setPath(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export const navigate = (to: string) => {
  window.location.hash = to
}

export function Link({ to, ...props }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...props} />
}
