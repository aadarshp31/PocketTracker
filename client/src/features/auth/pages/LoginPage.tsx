import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../../../shared/theme/ThemeToggle'

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
      sessionStorage.setItem('pt:recovery_used', '1')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Invalid or already-used recovery code'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isMfaRequired && showRecovery) {
    return (
      <div className="auth-page-container">
        <div className="auth-card table-wrap">
          <div className="auth-card-top">
            <div className="auth-logo">🎯 PocketTracker</div>
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="auth-title">Account Recovery</h1>
          <p className="muted">Enter one of your saved recovery codes to regain access.</p>
          <p className="auth-warning-box">
            ⚠️ Warning: using a recovery code will remove all authenticators from your account.
            You will need to set up a new authenticator after signing in.
          </p>

          {info ? <div className="auth-info-box">{info}</div> : null}

          <form onSubmit={handleRecoverySubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="recovery-input">Recovery Code</label>
              <input
                id="recovery-input"
                type="text"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="off"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button
              type="submit"
              className="primary-button"
              disabled={isLoading || recoveryCode.trim().length === 0}
              style={{ width: '100%' }}
            >
              {isLoading ? 'Verifying...' : 'Use Recovery Code'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setError(''); }}
              disabled={isLoading}
              className="ghost-button"
              style={{ fontSize: '0.88rem' }}
            >
              Back to authenticator code
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isMfaRequired) {
    return (
      <div className="auth-page-container">
        <div className="auth-card table-wrap">
          <div className="auth-card-top">
            <div className="auth-logo">🎯 PocketTracker</div>
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="auth-title">Verify Sign In</h1>
          <p className="muted">Enter the 6-digit code from {pendingMfaFactorLabel || 'your authenticator app'}.</p>
          {info ? <div className="auth-info-box">{info}</div> : null}

          {pendingMfaFactors.length > 1 ? (
            <div className="auth-field" style={{ marginBottom: '1rem' }}>
              <label htmlFor="mfa-device">Authenticator Device</label>
              <select
                id="mfa-device"
                disabled={isLoading}
                onChange={(e) => selectPendingMfaFactor(e.target.value)}
                defaultValue={pendingMfaFactors[0]?.id}
              >
                {pendingMfaFactors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.friendlyName || 'Authenticator App'}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <form onSubmit={handleMfaSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="mfa-code-input">Authenticator Code</label>
              <input
                id="mfa-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={isLoading}
                placeholder="123456"
                autoFocus
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button 
              type="submit" 
              className="primary-button"
              disabled={isLoading || mfaCode.length !== 6}
              style={{ width: '100%' }}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setShowRecovery(true); setError(''); setInfo(''); }}
              disabled={isLoading}
              className="ghost-button"
              style={{ fontSize: '0.88rem' }}
            >
              Lost your phone? Use a recovery code
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card table-wrap">
        <div className="auth-card-top">
          <div className="auth-logo">🎯 PocketTracker</div>
          <ThemeToggle variant="compact" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>Sign in to access your financial dashboard.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>
          
          <div className="auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link to="/auth/forgot-password" className="auth-inline-link">Forgot password?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {info ? <div className="auth-info-box">{info}</div> : null}
          {error && <div className="error">{error}</div>}

          <button 
            type="submit" 
            className="primary-button"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/auth/signup" className="auth-inline-link">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
