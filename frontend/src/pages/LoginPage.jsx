import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function LoginPage({ onAuthenticated }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState('sign-in')
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setError('Enter a username to continue.')
      return
    }

    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(trimmedUsername)) {
      setError('Username must be 3-64 chars and can include letters, numbers, ., _, -.')
      return
    }

    try {
      setIsSubmitting(true)
      console.log('Attempting login with username:', trimmedUsername)
      const endpoint = mode === 'sign-up' ? '/auth/signup' : '/auth/signin'
      const response = await api.post(endpoint, { username: trimmedUsername })
      console.log('Login response:', response)

      if (response.status === 200 && response.data) {
        console.log('Login successful, storing username and navigating to dashboard')
        localStorage.setItem('USIU_BOOKCLUB_USERNAME', trimmedUsername)
        onAuthenticated?.()
        navigate('/dashboard', { replace: true })
      } else {
        setError('Unexpected response from server. Please try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      const fallbackMessage = mode === 'sign-up'
        ? 'Unable to sign up. Please try again.'
        : 'Unable to sign in. Please try again.'
      const message = err?.response?.data?.message || err?.message || fallbackMessage
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = (nextMode) => {
    setMode(nextMode)
    setError('')
  }

  return (
    <main className="page-shell login-shell">
      <section className="login-card">
        <div className="brand-bar">
          <h1>USIU Africa Book Club</h1>
          <p>Personal Library Management</p>
        </div>

        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`mode-button ${mode === 'sign-in' ? 'active' : ''}`}
            onClick={() => toggleMode('sign-in')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`mode-button ${mode === 'sign-up' ? 'active' : ''}`}
            onClick={() => toggleMode('sign-up')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your unique username"
              disabled={isSubmitting}
              autoFocus
            />
            <span className="form-hint">Letters, numbers, dot, underscore, and hyphen are allowed.</span>
          </div>

          {error && <div className="form-error-box">{error}</div>}

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || !username.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                {mode === 'sign-up' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : mode === 'sign-up' ? (
              'Sign Up'
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </section>
    </main>
  )
}
