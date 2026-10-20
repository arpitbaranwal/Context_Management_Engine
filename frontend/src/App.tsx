import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Spinner } from './components/ui/Feedback'
import { navigate, useRoute } from './lib/router'
import DashboardPage from './pages/DashboardPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResearchPage from './pages/ResearchPage'
import { AuthProvider, useAuth } from './state/auth'
import { DocumentsProvider } from './state/documents'
import { SelectionProvider } from './state/selection'
import { ThemeProvider } from './state/theme'

function Routes() {
  const { user, loading } = useAuth()
  const route = useRoute()
  const isAuthRoute = route === '/login' || route === '/register'

  // Protected area: send signed-out users to /login, signed-in users away from it.
  useEffect(() => {
    if (loading) return
    if (!user && !isAuthRoute) navigate('/login')
    if (user && isAuthRoute) navigate('/')
  }, [user, loading, isAuthRoute])

  if (loading) {
    return <div role="status" aria-label="Loading" className="grid min-h-dvh place-items-center text-muted"><Spinner className="size-5" /></div>
  }
  if (!user) return route === '/register' ? <RegisterPage /> : <LoginPage />

  let page
  if (route === '/documents') page = <DocumentsPage />
  else if (route.startsWith('/documents/')) page = <DocumentDetailPage id={decodeURIComponent(route.slice('/documents/'.length))} />
  else if (route === '/research') page = <ResearchPage />
  else page = <DashboardPage />

  return (
    <DocumentsProvider>
      <SelectionProvider>
        <AppShell route={route}>{page}</AppShell>
      </SelectionProvider>
    </DocumentsProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </ThemeProvider>
  )
}
