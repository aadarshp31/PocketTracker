import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/AuthContext'
import { MFA_REQUIRED_EVENT, type MfaRequiredEventDetail } from '../../shared/api/http'
import { ThemeToggle } from '../../shared/theme/ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(() => {
    return sessionStorage.getItem('pt:recovery_used') === '1'
  })

  useEffect(() => {
    const handleMfaRequired = (event: Event) => {
      const customEvent = event as CustomEvent<MfaRequiredEventDetail>
      const redirectTo = customEvent.detail?.redirectTo || '/dashboard'
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard'
      const message = customEvent.detail?.message || 'Additional verification is required.'

      navigate(
        `/auth/login?redirect=${encodeURIComponent(safeRedirect)}&mfa_reason=${encodeURIComponent(message)}`,
        { replace: true }
      )
    }

    window.addEventListener(MFA_REQUIRED_EVENT, handleMfaRequired)
    return () => window.removeEventListener(MFA_REQUIRED_EVENT, handleMfaRequired)
  }, [navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const handleProfileClick = () => {
    navigate('/profile')
  }

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : ''

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          🎯 PocketTracker
        </div>
        <nav className="app-nav" aria-label="primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-user-section">
          <ThemeToggle variant="segmented" />
          {user && (
            <button 
              onClick={handleProfileClick}
              className="profile-button"
              title="View Profile & Settings"
            >
              👤 {userName}
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="app-main">
        {showRecoveryBanner ? (
          <div role="alert" className="recovery-alert-banner">
            <span>
              <strong>Action required:</strong> You signed in with a recovery code. Your previous authenticator has been
              removed. <button
                type="button"
                onClick={() => navigate('/profile')}
                className="recovery-alert-link"
              >Set up a new authenticator</button> to re-enable two-factor authentication.
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => { sessionStorage.removeItem('pt:recovery_used'); setShowRecoveryBanner(false); }}
              className="recovery-alert-close"
            >
              &times;
            </button>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
