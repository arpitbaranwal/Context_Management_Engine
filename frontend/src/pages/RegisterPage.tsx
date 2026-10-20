import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Feedback'
import { Link } from '../lib/router'
import { ApiError } from '../api/client'
import { useAuth } from '../state/auth'
import { AuthLayout } from './AuthLayout'

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>

function validate(v: { name: string; email: string; password: string; confirm: string }): Errors {
  const e: Errors = {}
  if (!v.name.trim()) e.name = 'Enter your name.'
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email address.'
  if (v.password.length < 8) e.password = 'Use at least 8 characters.'
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match.'
  return e
}

export default function RegisterPage() {
  const { register } = useAuth()
  const [v, setV] = useState({ name: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const errors = validate(v)
  const show = (k: keyof Errors) => (submitted || touched[k] ? errors[k] : undefined)
  const bind = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }),
    onBlur: () => setTouched({ ...touched, [k]: true }),
    error: show(k),
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (Object.keys(errors).length) return
    setBusy(true)
    try {
      await register(v.name.trim(), v.email.trim(), v.password)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create the account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create account">
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice>{formError}</Notice>}
        <Field label="Name" autoComplete="name" {...bind('name')} />
        <Field label="Email" type="email" autoComplete="email" {...bind('email')} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." {...bind('password')} />
        <Field label="Confirm password" type="password" autoComplete="new-password" {...bind('confirm')} />
        <Button type="submit" variant="primary" loading={busy} className="h-10 w-full">Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
