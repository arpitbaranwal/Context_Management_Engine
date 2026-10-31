import { useState, useEffect, type FormEvent } from 'react'
import { RotateCw, Sparkles, Terminal } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Feedback'
import { Link } from '../lib/router'
import { ApiError } from '../api/client'
import { useAuth } from '../state/auth'
import { mockAdapter } from '../api/adapters/mock'
import { AuthLayout } from './AuthLayout'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('arpitbaranwal05@gmail.com')
  const [password, setPassword] = useState('password123')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isUnreachable, setIsUnreachable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [engineStatus, setEngineStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  // Check health on mount
  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(2500) })
        if (active) setEngineStatus(res.ok ? 'online' : 'offline')
      } catch {
        if (active) setEngineStatus('offline')
      }
    }
    void check()
    return () => { active = false }
  }, [])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const next: typeof errors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError(null)
    setIsUnreachable(false)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      if (err instanceof ApiError && err.unreachable) {
        setIsUnreachable(true)
        setEngineStatus('offline')
        setFormError('Unable to connect to the research engine (FastAPI backend on port 8000).')
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDemoSignIn = async () => {
    setBusy(true)
    try {
      const demoSession = await mockAdapter.auth.login('demo@example.com', 'password')
      // Login directly via local session
      localStorage.setItem('cme.token', demoSession.token)
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sign in">
      {/* Live Engine Connectivity Pill */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-line/60 bg-sunken/50 px-3 py-1.5 text-xs font-mono">
        <span className="text-muted">Research Engine:</span>
        <span className="flex items-center gap-1.5">
          {engineStatus === 'online' ? (
            <>
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span className="text-accent font-semibold">Online (Port 8000)</span>
            </>
          ) : engineStatus === 'offline' ? (
            <>
              <span className="size-2 rounded-full bg-warn" />
              <span className="text-warn font-semibold">Offline / Standby</span>
            </>
          ) : (
            <span className="text-muted">Probing /api/health…</span>
          )}
        </span>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <Notice
            tone={isUnreachable ? 'neutral' : 'danger'}
            action={
              isUnreachable ? (
                <Button size="sm" icon={<RotateCw className="size-3" />} onClick={() => void submit()}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            <div>
              <p className="font-medium text-ink">{formError}</p>
              {isUnreachable && (
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Start the backend by double-clicking <code className="text-accent">run_backend.bat</code> or <code className="text-accent">start.bat</code> in the repository root.
                </p>
              )}
            </div>
          </Notice>
        )}

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        
        <Button type="submit" variant="primary" loading={busy} className="h-10 w-full">
          Sign in
        </Button>

        {/* Fallback button if backend is offline */}
        {isUnreachable && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleDemoSignIn}
            className="w-full text-xs font-mono border-line-strong/80 gap-1.5"
            icon={<Sparkles className="size-3.5 text-accent" />}
          >
            Launch in Offline Demo Mode
          </Button>
        )}
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">
            Create account
          </Link>
        </p>
        <p className="text-xs text-muted/70 flex items-center justify-center gap-1">
          <Terminal className="size-3 text-muted" /> Backend auto-proxy routed via Vite
        </p>
      </div>
    </AuthLayout>
  )
}
