import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../../../shared/theme/ThemeToggle'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signUp(email, password, firstName, lastName)
      navigate('/auth/check-email')
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card table-wrap">
        <div className="auth-card-top">
          <div className="auth-logo">🎯 PocketTracker</div>
          <ThemeToggle variant="compact" />
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>Track expenses, budgets, and unlock deep insights.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-grid-2">
            <div className="auth-field">
              <label htmlFor="first-name">First Name</label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="John"
              />
            </div>
            
            <div className="auth-field">
              <label htmlFor="last-name">Last Name</label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Doe"
              />
            </div>
          </div>

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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Create a strong password"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button 
            type="submit" 
            className="primary-button"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/auth/login" className="auth-inline-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
