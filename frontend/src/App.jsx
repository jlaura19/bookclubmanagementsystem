import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CatalogPage from './pages/CatalogPage'
import BookFormPage from './pages/BookFormPage'
import CommunityPage from './pages/CommunityPage'
import ChatPage from './pages/ChatPage'
import BookshelfPage from './pages/BookshelfPage'
import ProfilePage from './pages/ProfilePage'
import api from './services/api'

export default function App() {
  const storageKey = 'USIU_BOOKCLUB_USERNAME'
  const legacyStorageKey = 'USIU_BOOKCLUB_STUDENT_ID'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await api.get('/auth/me')
        if (response.status === 200) {
          const sessionUsername = response.data.username || response.data.studentId
          if (sessionUsername) {
            localStorage.setItem(storageKey, sessionUsername)
          }
          localStorage.removeItem(legacyStorageKey)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(storageKey)
          localStorage.removeItem(legacyStorageKey)
          setIsAuthenticated(false)
        }
      } catch {
        localStorage.removeItem(storageKey)
        localStorage.removeItem(legacyStorageKey)
        setIsAuthenticated(false)
      } finally {
        setIsCheckingSession(false)
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    const handleForcedLogout = () => {
      setIsAuthenticated(false)
    }

    window.addEventListener('bookclub:logout', handleForcedLogout)
    return () => window.removeEventListener('bookclub:logout', handleForcedLogout)
  }, [])

  if (isCheckingSession) {
    return (
      <main className="page-shell">
        <p>Checking session...</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onAuthenticated={() => setIsAuthenticated(true)} />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/bookshelf"
        element={isAuthenticated ? <BookshelfPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/catalog"
        element={isAuthenticated ? <CatalogPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/books/:id"
        element={isAuthenticated ? <BookFormPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/books/new"
        element={isAuthenticated ? <BookFormPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/community"
        element={isAuthenticated ? <CommunityPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/chat"
        element={isAuthenticated ? <ChatPage /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}
