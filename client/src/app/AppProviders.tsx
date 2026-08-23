import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../features/auth/contexts/AuthContext'
import { ThemeProvider } from '../shared/theme/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
