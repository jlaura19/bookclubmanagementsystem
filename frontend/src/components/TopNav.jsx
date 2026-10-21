import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import api from '../services/api'

const links = [
  { to: '/catalog', label: 'Discover' },
  { to: '/dashboard', label: 'Current Reads' },
  { to: '/chat', label: 'Discussions' },
  { to: '/community', label: 'Reviews' },
  { to: '/bookshelf', label: 'My Bookshelf' },
]

const SEEN_KEY = 'bookclub.notifSeen'
const ICONS = { meeting: '📅', message: '💬', reaction: '❤️' }

function timeAgo(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function TopNav() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(SEEN_KEY) || '')
  const menuRef = useRef(null)
  const bellRef = useRef(null)
  const username = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID') || 'Reader'

  const isUnread = (item) => !lastSeen || item.createdAt > lastSeen
  const unreadCount = notifications.filter(isUnread).length

  useEffect(() => {
    let active = true
    const load = () =>
      api.get('/notifications')
        .then((response) => active && setNotifications(response.data || []))
        .catch(() => {})
    load()
    const timer = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const markSeen = () => {
    const now = new Date()
    const pad = (n, size = 2) => String(n).padStart(size, '0')
    const newest = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
    localStorage.setItem(SEEN_KEY, newest)
    setLastSeen(newest)
  }

  const toggleBell = () => {
    if (bellOpen) {
      markSeen()
    }
    setBellOpen((open) => !open)
  }

  const openNotification = (item) => {
    markSeen()
    setBellOpen(false)
    navigate(item.link)
  }

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()
    const trimmed = term.trim()
    navigate(trimmed ? `/catalog?q=${encodeURIComponent(trimmed)}` : '/catalog')
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // session is cleared locally either way
    }
    localStorage.removeItem('USIU_BOOKCLUB_USERNAME')
    localStorage.removeItem('USIU_BOOKCLUB_STUDENT_ID')
    window.dispatchEvent(new Event('bookclub:logout'))
    navigate('/', { replace: true })
  }

  return (
    <nav className="topnav">
      <Link to="/dashboard" className="topnav-brand">
        <span className="brand-mark">📖</span> The Book Club
      </Link>

      <button
        type="button"
        className="topnav-burger"
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        ☰
      </button>

      <div className={`topnav-links ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}>
        {links.map((link) => (
          <NavLink key={link.label} to={link.to} className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="topnav-utils">
        <form className="topnav-search" onSubmit={handleSearch}>
          <span aria-hidden="true">🔍</span>
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search books online"
            aria-label="Search books"
          />
        </form>
        <div className="avatar-wrap" ref={bellRef}>
          <button
            type="button"
            className="icon-button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            onClick={toggleBell}
          >
            🔔{unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {bellOpen && (
            <div className="notif-panel">
              <div className="notif-head">
                <strong>Notifications</strong>
              </div>
              {notifications.length === 0 ? (
                <p className="muted-text notif-empty">You're all caught up.</p>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`notif-item ${isUnread(item) ? 'unread' : ''}`}
                    onClick={() => openNotification(item)}
                  >
                    <span className="notif-icon">{ICONS[item.type] || '🔔'}</span>
                    <span className="notif-text">
                      {item.text}
                      <small>{timeAgo(item.createdAt)}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="avatar-wrap" ref={menuRef}>
          <button type="button" className="avatar-chip" onClick={() => setMenuOpen((open) => !open)}>
            <span className="avatar">{username.charAt(0).toUpperCase()}</span>
            <span className="avatar-name">{username}</span>
          </button>
          {menuOpen && (
            <div className="avatar-menu">
              <button type="button" onClick={handleLogout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
