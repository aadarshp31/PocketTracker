import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate, Link } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { ThemeToggle } from '../shared/theme/ThemeToggle'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProfilePage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.ProfilePage })))
const TransactionsPage = lazy(() => import('../pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))
const BulkImportPage = lazy(() => import('../features/transactions/pages/BulkImportPage').then((module) => ({ default: module.default })))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('../features/auth/pages/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))

function RouteLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #6b7280)' }}>Loading...</div>}>{children}</Suspense>
}

function CheckEmailScreen() {
  return (
    <div className="auth-page-container">
      <div className="auth-card table-wrap">
        <div className="auth-card-top">
          <div className="auth-logo">🎯 PocketTracker</div>
          <ThemeToggle variant="compact" />
        </div>
        <h1 className="auth-title">Check Your Email</h1>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          We have sent a verification link to your email. Please check your inbox and click the link to confirm your account.
        </p>
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/auth/login" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    children: [
      { path: 'login', element: <RouteLoader><LoginPage /></RouteLoader> },
      { path: 'signup', element: <RouteLoader><SignupPage /></RouteLoader> },
      { path: 'check-email', element: <CheckEmailScreen /> },
      { path: 'forgot-password', element: <RouteLoader><ForgotPasswordPage /></RouteLoader> },
      { path: 'reset-password', element: <RouteLoader><ResetPasswordPage /></RouteLoader> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <RouteLoader><DashboardPage /></RouteLoader> },
      { path: 'profile', element: <RouteLoader><ProfilePage /></RouteLoader> },
      { path: 'transactions', element: <RouteLoader><TransactionsPage /></RouteLoader> },
      { path: 'transactions/bulk-import', element: <RouteLoader><BulkImportPage /></RouteLoader> },
    ],
  },
])
