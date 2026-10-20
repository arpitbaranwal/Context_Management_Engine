import { useEffect, useState, type AnchorHTMLAttributes } from 'react'

/** Tiny hash router. Three top-level routes do not justify a dependency. */
const read = () => (window.location.hash.replace(/^#/, '') || '/')

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
