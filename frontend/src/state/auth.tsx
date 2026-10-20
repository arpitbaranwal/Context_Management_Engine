import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  /** True until the first getCurrentUser() settles. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    authApi.getCurrentUser().then((u) => live && setUser(u)).catch(() => live && setUser(null)).finally(() => live && setLoading(false))
    return () => { live = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => setUser((await authApi.login(email, password)).user), [])
  const register = useCallback(async (n: string, e: string, p: string) => setUser((await authApi.register(n, e, p)).user), [])
  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { setUser(null) }
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
