import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

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
        <Outlet />
      </main>
    </div>
  )
}
