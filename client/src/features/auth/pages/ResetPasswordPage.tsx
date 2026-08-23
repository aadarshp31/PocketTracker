import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/api/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../../../shared/theme/ThemeToggle'

export function ResetPasswordPage() {
  const hasRecoveryHash = window.location.hash.includes('type=recovery')
  const [isRecoverySession, setIsRecoverySession] = useState<boolean | null>(
    hasRecoveryHash ? null : false
  )
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!hasRecoveryHash) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await updatePassword(newPassword)
      navigate('/auth/login', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isRecoverySession === null) {
    return (
      <div className="auth-page-container">
        <div className="auth-card table-wrap" style={{ textAlign: 'center' }}>
          <p className="muted">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!isRecoverySession) {
    return (
      <div className="auth-page-container">
        <div className="auth-card table-wrap">
          <div className="auth-card-top">
            <div className="auth-logo">🎯 PocketTracker</div>
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="auth-title">Link Expired</h1>
          <p className="muted">This password reset link is invalid or has expired.</p>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link to="/auth/forgot-password" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Request a new reset link
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

        <h1 className="auth-title">Set New Password</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>Enter and confirm your new secure password.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter new password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Re-enter new password"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="submit"
            className="primary-button"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Updating password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
