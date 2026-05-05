import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/api/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function ResetPasswordPage() {
  // The URL hash contains `type=recovery` when arriving from a Supabase reset email.
  // Supabase clears the hash asynchronously, so reading it synchronously on mount is reliable.
  // If there is no recovery hash, this is not a valid recovery landing (e.g. direct navigation
  // or a page refresh after the hash was already consumed — links are single-use).
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

    // Only the PASSWORD_RECOVERY event is a reliable signal that Supabase has validated
    // the recovery token. SIGNED_IN fires for all sessions and cannot be used here.
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

  // Still waiting to determine session state
  if (isRecoverySession === null) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <p>Loading...</p>
      </div>
    )
  }

  // No valid recovery session — link expired or navigated here directly
  if (!isRecoverySession) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>Link Expired</h1>
        <p>This password reset link is invalid or has expired.</p>
        <p style={{ marginTop: '20px' }}>
          <Link to="/auth/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Confirm New Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
