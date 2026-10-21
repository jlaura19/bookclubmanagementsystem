import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Avatar from './Avatar'
import { useProfile, publishProfile } from '../services/profile'
import { applyTheme } from '../services/theme'

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
  const profile = useProfile()
  const [term, setTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(SEEN_KEY) || '')
  const bellRef = useRef(null)
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'

  const toggleTheme = async () => {
    const next = dark ? 'LIGHT' : 'DARK'
    applyTheme(next)
    try {
      const response = await api.put('/profile', { themePreference: next })
      publishProfile(response.data)
    } catch {
      // theme still applies locally
    }
  }
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
        <button
          type="button"
          className="icon-button"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme}
        >
          {dark ? '☀️' : '🌙'}
        </button>
        <button type="button" className="avatar-chip" title="Open profile" onClick={() => navigate('/profile')}>
          <Avatar username={username} displayName={profile?.displayName} avatarUrl={profile?.avatarUrl} size={28} />
          <span className="avatar-name">{profile?.displayName || username}</span>
        </button>
      </div>
    </nav>
  )
}
