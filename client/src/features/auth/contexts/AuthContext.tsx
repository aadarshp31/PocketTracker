import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { apiBaseUrl } from '../../../shared/api/http'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '')
const emailRedirectUri =
  (import.meta.env.VITE_AUTH_EMAIL_REDIRECT_TO || '').trim() || `${window.location.origin}/auth/login`

const syncSessionCookie = async (accessToken: string | null) => {
  if (!accessToken) return

  try {
    await fetch(`${apiBaseUrl}/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    })
  } catch (error) {
    console.error('Failed to sync auth cookie:', error)
  }
}

const clearSessionCookie = async () => {
  try {
    await fetch(`${apiBaseUrl}/auth/session`, {
      method: 'DELETE',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Failed to clear auth cookie:', error)
  }
}

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser()
        const { data: { session } } = await supabase.auth.getSession()
        if (supabaseUser) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            firstName: supabaseUser.user_metadata?.first_name || '',
            lastName: supabaseUser.user_metadata?.last_name || '',
          })
          await syncSessionCookie(session?.access_token || null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            firstName: session.user.user_metadata?.first_name || '',
            lastName: session.user.user_metadata?.last_name || '',
          })
          await syncSessionCookie(session.access_token || null)
        } else {
          setUser(null)
          await clearSessionCookie()
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const getToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Failed to get token:', error)
      return null
    }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: emailRedirectUri,
        },
      })

      if (error) throw error

      // Optionally call backend signup to create user record
      if (data.user) {
        const token = await getToken()
        if (token) {
          await fetch(`${apiBaseUrl}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              first_name: firstName,
              last_name: lastName,
            }),
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.first_name || '',
          lastName: data.user.user_metadata?.last_name || '',
        })
      }

      if (data.session?.access_token) {
        await syncSessionCookie(data.session.access_token)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      await clearSessionCookie()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
