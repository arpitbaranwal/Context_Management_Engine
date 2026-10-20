import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Feedback'
import { Link } from '../lib/router'
import { ApiError } from '../api/client'
import { useAuth } from '../state/auth'
import { AuthLayout } from './AuthLayout'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice>{formError}</Notice>}
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Button type="submit" variant="primary" loading={busy} className="h-10 w-full">Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Don't have an account? <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">Create account</Link>
      </p>
    </AuthLayout>
  )
}
