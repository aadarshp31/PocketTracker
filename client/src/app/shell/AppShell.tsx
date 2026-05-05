import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/AuthContext'
import { MFA_REQUIRED_EVENT, type MfaRequiredEventDetail } from '../../shared/api/http'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mfaBannerMessage, setMfaBannerMessage] = useState('')

  useEffect(() => {
    const handleMfaRequired = (event: Event) => {
      const customEvent = event as CustomEvent<MfaRequiredEventDetail>
      const redirectTo = customEvent.detail?.redirectTo || '/dashboard'
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard'

      setMfaBannerMessage(customEvent.detail?.message || 'Additional verification is required.')
      navigate(`/auth/login?redirect=${encodeURIComponent(safeRedirect)}`, { replace: true })
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
        <div className="app-title">🎯 PocketTracker</div>
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
          {user && (
            <button 
              onClick={handleProfileClick}
              className="profile-button"
              title="View Profile"
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
        {mfaBannerMessage ? (
          <div
            role="status"
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              border: '1px solid #93c5fd',
              background: '#eff6ff',
              color: '#1d4ed8',
            }}
          >
            {mfaBannerMessage}
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
