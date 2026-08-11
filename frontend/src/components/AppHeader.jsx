import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../services/api'

export default function AppHeader({ title, subtitle, primaryAction }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout API failures and clear local state anyway.
    } finally {
      localStorage.removeItem('USIU_BOOKCLUB_USERNAME')
      localStorage.removeItem('USIU_BOOKCLUB_STUDENT_ID')
      window.dispatchEvent(new Event('bookclub:logout'))
      navigate('/', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <nav className="top-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Catalog
        </NavLink>
        <NavLink to="/community" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Community
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Chat
        </NavLink>
      </nav>

      <div className="header-actions">
        {primaryAction && (
          <Link to={primaryAction.to} className="primary-button">
            {primaryAction.label}
          </Link>
        )}
        <button type="button" className="secondary-button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </header>
  )
}
