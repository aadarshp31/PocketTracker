import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useAuth } from '../../features/auth/contexts/AuthContext'
import { MFA_REQUIRED_EVENT, type MfaRequiredEventDetail } from '../../shared/api/http'
import { ThemeToggle } from '../../shared/theme/ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(() => {
    return sessionStorage.getItem('pt:recovery_used') === '1'
  })

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Handle escape key and body scroll lock for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-active')
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsMobileMenuOpen(false)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.classList.remove('mobile-menu-active')
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      document.body.classList.remove('mobile-menu-active')
    }
  }, [isMobileMenuOpen])

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
    setIsMobileMenuOpen(false)
    await signOut()
    navigate('/auth/login')
  }

  const handleProfileClick = () => {
    setIsMobileMenuOpen(false)
    navigate('/profile')
  }

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : ''

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand-wrap">
          <div
            className="app-title"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/dashboard')
              }
            }}
          >
            🎯 PocketTracker
          </div>

          <nav className="app-nav desktop-nav" aria-label="primary navigation">
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
        </div>

        {/* Desktop User Section */}
        <div className="nav-user-section desktop-user-actions">
          <ThemeToggle variant="segmented" />
          {user && (
            <button
              onClick={handleProfileClick}
              className="profile-button"
              title="View Profile and Settings"
            >
              <User size={15} className="profile-btn-icon" />
              <span className="profile-btn-name">{userName}</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="logout-button"
            title="Sign out of your account"
          >
            <LogOut size={15} className="logout-btn-icon" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Header Controls */}
        <div className="mobile-header-controls">
          <ThemeToggle variant="compact" />
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`mobile-nav-backdrop ${isMobileMenuOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <div
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer ${isMobileMenuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        <div className="mobile-nav-content">
          {user && (
            <div
              className="mobile-user-card"
              onClick={handleProfileClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProfileClick()
                }
              }}
            >
              <div className="mobile-user-avatar">
                <User size={20} />
              </div>
              <div className="mobile-user-info">
                <span className="mobile-user-name">{userName}</span>
                {user.email && <span className="mobile-user-email">{user.email}</span>}
              </div>
              <ChevronRight size={18} className="mobile-user-arrow" />
            </div>
          )}

          <div className="mobile-nav-section">
            <span className="mobile-section-label">Navigation</span>
            <nav className="mobile-nav-links" aria-label="mobile navigation">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? 'mobile-nav-link is-active' : 'mobile-nav-link')}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={18} className="mobile-link-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
              {user && (
                <button
                  type="button"
                  className="mobile-nav-link mobile-nav-link-btn"
                  onClick={handleProfileClick}
                >
                  <Shield size={18} className="mobile-link-icon" />
                  <span>Profile & Security</span>
                </button>
              )}
            </nav>
          </div>

          <div className="mobile-nav-section">
            <span className="mobile-section-label">Appearance</span>
            <div className="mobile-theme-wrap">
              <ThemeToggle variant="segmented" />
            </div>
          </div>

          <div className="mobile-nav-footer">
            <button
              type="button"
              onClick={handleLogout}
              className="mobile-logout-btn"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

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
