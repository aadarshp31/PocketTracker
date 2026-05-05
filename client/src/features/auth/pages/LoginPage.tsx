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
  const [recoveryCode, setRecoveryCode] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    signIn,
    isMfaRequired,
    pendingMfaFactorLabel,
    pendingMfaFactors,
    selectPendingMfaFactor,
    verifyMfaSignIn,
    verifyRecoveryCode,
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

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    try {
      await verifyRecoveryCode(recoveryCode.trim())
      // Flag for AppShell to show re-enrollment banner
      sessionStorage.setItem('pt:recovery_used', '1')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Invalid or already-used recovery code'))
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

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setShowRecovery(true); setError(''); setInfo(''); }}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
          >
            Lost your phone? Use a recovery code
          </button>
        </div>
      </div>
    )
  }

  if (isMfaRequired && showRecovery) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>Account Recovery</h1>
        <p>Enter one of your saved recovery codes to regain access.</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          Warning: using a recovery code will remove all authenticators from your account.
          You will need to set up a new authenticator after signing in.
        </p>

        {info ? <div style={{ color: '#2563eb', marginBottom: '15px' }}>{info}</div> : null}

        <form onSubmit={handleRecoverySubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>Recovery Code:</label>
            <input
              type="text"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="off"
              style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
            />
          </div>

          {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

          <button
            type="submit"
            disabled={isLoading || recoveryCode.trim().length === 0}
            style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
          >
            {isLoading ? 'Verifying...' : 'Use Recovery Code'}
          </button>
        </form>

        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setShowRecovery(false); setError(''); }}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
          >
            Back to authenticator code
          </button>
        </div>
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
