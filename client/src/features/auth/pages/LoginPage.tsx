import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    signIn,
    isMfaRequired,
    pendingMfaFactorLabel,
    pendingMfaFactors,
    selectPendingMfaFactor,
    verifyMfaSignIn,
  } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const mfaReasonFromQuery = (searchParams.get('mfa_reason') || '').trim()
  const [info, setInfo] = useState(mfaReasonFromQuery)

  useEffect(() => {
    if (mfaReasonFromQuery) {
      setInfo(mfaReasonFromQuery)
    }
  }, [mfaReasonFromQuery])

  const requestedRedirect = searchParams.get('redirect')
  const redirectTo =
    requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    try {
      const result = await signIn(email, password)
      if (result === 'mfa-required') {
        setInfo('Your password is correct. Complete two-factor verification to finish signing in.')
        setMfaCode('')
        return
      }
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to sign in'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    try {
      await verifyMfaSignIn(mfaCode.trim())
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to verify authenticator code'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isMfaRequired) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>Verify Sign In</h1>
        <p>Enter the 6-digit code from {pendingMfaFactorLabel || 'your authenticator app'}.</p>
        {info ? <div style={{ color: '#2563eb', marginBottom: '15px' }}>{info}</div> : null}

        {pendingMfaFactors.length > 1 ? (
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="mfa-device">Use authenticator device:</label>
            <select
              id="mfa-device"
              disabled={isLoading}
              onChange={(e) => selectPendingMfaFactor(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              defaultValue={pendingMfaFactors[0]?.id}
            >
              {pendingMfaFactors.map((factor) => (
                <option key={factor.id} value={factor.id}>
                  {factor.friendlyName || 'Authenticator App'}
                </option>
              ))}
            </select>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Use a backup authenticator device if your primary phone is unavailable.
            </p>
          </div>
        ) : (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            If you might lose access to this device, add a second authenticator app from Profile settings as a backup.
          </p>
        )}

        <form onSubmit={handleMfaSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>Authenticator Code:</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={isLoading}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>

          {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading || mfaCode.length !== 6}
            style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
          <div style={{ textAlign: 'right', marginTop: '4px' }}>
            <Link to="/auth/forgot-password" style={{ fontSize: '0.875rem' }}>Forgot password?</Link>
          </div>
        </div>

  {info && <div style={{ color: '#2563eb', marginBottom: '15px' }}>{info}</div>}
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Don't have an account? <Link to="/auth/signup">Sign up</Link>
      </p>
    </div>
  )
}
