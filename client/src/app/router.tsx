import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { TransactionsPage } from '../pages/TransactionsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
    ],
  },
])
