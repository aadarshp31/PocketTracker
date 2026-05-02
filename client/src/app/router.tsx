import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { SettingsPage } from '../pages/SettingsPage'
import { TransactionsPage } from '../pages/TransactionsPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { SignupPage } from '../features/auth/pages/SignupPage'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/auth',
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'check-email', element: <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}><h1>Check Your Email</h1><p>Please check your email to confirm your account.</p></div> },
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
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
    ],
  },
])

