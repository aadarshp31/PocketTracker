import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../../shared/api/supabaseClient'
import { apiBaseUrl } from '../../../shared/api/http'

const emailRedirectUri =
  (import.meta.env.VITE_AUTH_EMAIL_REDIRECT_TO || '').trim() || `${window.location.origin}/auth/login`

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface MfaFactor {
  id: string
  factorType: string
  status: string
  friendlyName?: string
}

interface PendingMfaState {
  factors: MfaFactor[]
  selectedFactorId: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isMfaRequired: boolean
  pendingMfaFactorLabel: string | null
  pendingMfaFactors: MfaFactor[]
  mfaFactors: MfaFactor[]
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<'authenticated' | 'mfa-required'>
  enrollMfa: (friendlyName?: string) => Promise<{ factorId: string; qrCode: string; secret: string; uri: string }>
  verifyMfaEnrollment: (factorId: string, code: string) => Promise<void>
  verifyMfaSignIn: (code: string) => Promise<void>
  removeMfaFactor: (factorId: string) => Promise<void>
  selectPendingMfaFactor: (factorId: string) => void
  refreshMfaState: () => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([])
  const [pendingMfa, setPendingMfa] = useState<PendingMfaState | null>(null)

  const mapUser = (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser => ({
    id: sessionUser.id,
    email: sessionUser.email || '',
    firstName: (sessionUser.user_metadata?.first_name as string) || '',
    lastName: (sessionUser.user_metadata?.last_name as string) || '',
  })

  const listVerifiedTotpFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error

    const verifiedFactors = (data.totp || [])
      .filter((factor) => factor.status === 'verified')
      .map((factor) => ({
        id: factor.id,
        factorType: factor.factor_type,
        status: factor.status,
        friendlyName: factor.friendly_name || 'Authenticator App',
      }))

    setMfaFactors(verifiedFactors)
    return verifiedFactors
  }

  const syncSessionState = async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  ) => {
    if (!session?.user) {
      setUser(null)
      setPendingMfa(null)
      setMfaFactors([])
      return false
    }

    const verifiedFactors = await listVerifiedTotpFactors()
    const { data: assuranceData, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) throw assuranceError

    const requiresMfa = verifiedFactors.length > 0 && assuranceData.currentLevel !== 'aal2'

    if (requiresMfa) {
      setPendingMfa({
        factors: verifiedFactors,
        selectedFactorId: verifiedFactors[0].id,
      })
      setUser(null)
      return true
    }

    setPendingMfa(null)
    setUser(mapUser(session.user))
    return false
  }

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // getSession() auto-refreshes the token if expired, unlike getUser()
        const { data: { session } } = await supabase.auth.getSession()
        await syncSessionState(session)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(() => {
          void syncSessionState(session).catch((error) => {
            console.error('Auth state sync failed:', error)
          })
        }, 0)
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

      const requiresMfa = await syncSessionState(data.session)
      return requiresMfa ? 'mfa-required' : 'authenticated'
    } finally {
      setIsLoading(false)
    }
  }

  const refreshMfaState = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await syncSessionState(session)
  }

  const selectPendingMfaFactor = (factorId: string) => {
    setPendingMfa((currentState) => {
      if (!currentState) {
        return currentState
      }

      const factorExists = currentState.factors.some((factor) => factor.id === factorId)
      if (!factorExists) {
        return currentState
      }

      return {
        ...currentState,
        selectedFactorId: factorId,
      }
    })
  }

  const enrollMfa = async (friendlyName = 'Authenticator App') => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    })

    if (error || !data?.totp?.qr_code || !data?.totp?.secret || !data?.totp?.uri) {
      throw error || new Error('Unable to start MFA enrollment')
    }

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    }
  }

  const verifyMfaEnrollment = async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error

    await supabase.auth.refreshSession()
    await refreshMfaState()
  }

  const verifyMfaSignIn = async (code: string) => {
    if (!pendingMfa) {
      throw new Error('No MFA challenge is pending')
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingMfa.selectedFactorId,
      code,
    })

    if (error) throw error

    await supabase.auth.refreshSession()
    await refreshMfaState()
  }

  const removeMfaFactor = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error

    await supabase.auth.refreshSession()
    await refreshMfaState()
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setPendingMfa(null)
      setMfaFactors([])
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
        isMfaRequired: !!pendingMfa,
        pendingMfaFactorLabel:
          pendingMfa?.factors.find((factor) => factor.id === pendingMfa.selectedFactorId)?.friendlyName || null,
        pendingMfaFactors: pendingMfa?.factors || [],
        mfaFactors,
        signUp,
        signIn,
        enrollMfa,
        verifyMfaEnrollment,
        verifyMfaSignIn,
        removeMfaFactor,
        selectPendingMfaFactor,
        refreshMfaState,
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
