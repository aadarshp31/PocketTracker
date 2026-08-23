import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../../../shared/theme/ThemeToggle'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="auth-page-container">
        <div className="auth-card table-wrap">
          <div className="auth-card-top">
            <div className="auth-logo">🎯 PocketTracker</div>
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="auth-title">Check Your Email</h1>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            If an account with that email exists, you will receive a password reset link shortly.
          </p>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link to="/auth/login" className="ghost-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Back to Sign In
            </Link>
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

        <h1 className="auth-title">Reset Password</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          Enter your email address and we will send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button 
            type="submit" 
            className="primary-button"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer-text">
          Remembered your password? <Link to="/auth/login" className="auth-inline-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
