import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import AppHeader from '../components/AppHeader'
import Avatar from '../components/Avatar'
import { useProfile, publishProfile, clearProfile } from '../services/profile'

const GENRES = ['Fiction', 'Non-fiction', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Biography', 'History', 'Self-help', 'Poetry', 'Business', 'Science']
const THEMES = [
  { value: 'LIGHT', label: 'Light', icon: '☀️' },
  { value: 'DARK', label: 'Dark', icon: '🌙' },
  { value: 'SYSTEM', label: 'System', icon: '💻' },
]

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const profile = useProfile()
  const fileRef = useRef(null)
  const [form, setForm] = useState(null)
  const [completed, setCompleted] = useState(0)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (profile && !form) {
      setForm({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        favoriteGenres: profile.favoriteGenres ? profile.favoriteGenres.split(',').map((g) => g.trim()).filter(Boolean) : [],
        readingGoal: profile.readingGoal || 0,
      })
    }
  }, [profile, form])

  useEffect(() => {
    api.get('/books/mine')
      .then((response) => setCompleted(response.data.filter((book) => book.readingStatus === 'Completed').length))
      .catch(() => {})
  }, [])

  const goalPercent = useMemo(() => {
    const goal = Number(form?.readingGoal) || 0
    return goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0
  }, [form, completed])

  const flash = (type, text) => setMessage({ type, text })
  const errorText = (error, fallback) => error.response?.data?.message || fallback

  const save = async (payload, success) => {
    try {
      const response = await api.put('/profile', payload)
      publishProfile(response.data)
      if (success) flash('ok', success)
      return true
    } catch (error) {
      flash('error', errorText(error, 'Could not save changes.'))
      return false
    }
  }

  const saveDetails = async (event) => {
    event.preventDefault()
    setBusy(true)
    await save(
      {
        displayName: form.displayName,
        bio: form.bio,
        favoriteGenres: form.favoriteGenres.join(', '),
        readingGoal: Number(form.readingGoal) || 0,
      },
      'Profile saved.'
    )
    setBusy(false)
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      flash('error', 'Profile picture must be 2MB or smaller.')
      return
    }
    const data = new FormData()
    data.append('avatar', file)
    setBusy(true)
    try {
      const response = await api.post('/profile/avatar', data)
      publishProfile(response.data)
      flash('ok', 'Profile picture updated.')
    } catch (error) {
      flash('error', errorText(error, 'Could not upload picture.'))
    }
    setBusy(false)
  }

  const removeAvatar = async () => {
    setBusy(true)
    try {
      const response = await api.delete('/profile/avatar')
      publishProfile(response.data)
      flash('ok', 'Profile picture removed.')
    } catch (error) {
      flash('error', errorText(error, 'Could not remove picture.'))
    }
    setBusy(false)
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // session is cleared locally either way
    }
    localStorage.removeItem('USIU_BOOKCLUB_USERNAME')
    localStorage.removeItem('USIU_BOOKCLUB_STUDENT_ID')
    clearProfile()
    window.dispatchEvent(new Event('bookclub:logout'))
    navigate('/', { replace: true })
  }

  const deleteAccount = async () => {
    setBusy(true)
    try {
      await api.delete('/profile', { params: { confirm: confirmText } })
      localStorage.removeItem('USIU_BOOKCLUB_USERNAME')
      localStorage.removeItem('USIU_BOOKCLUB_STUDENT_ID')
      clearProfile()
      window.dispatchEvent(new Event('bookclub:logout'))
      navigate('/', { replace: true })
    } catch (error) {
      flash('error', errorText(error, 'Could not delete account.'))
      setBusy(false)
    }
  }

  const toggleGenre = (genre) =>
    setForm((current) => ({
      ...current,
      favoriteGenres: current.favoriteGenres.includes(genre)
        ? current.favoriteGenres.filter((g) => g !== genre)
        : [...current.favoriteGenres, genre],
    }))

  if (!profile || !form) {
    return (
      <main className="page-shell">
        <AppHeader title="Profile & settings" subtitle="Loading…" />
      </main>
    )
  }

  return (
    <main className="page-shell profile-page">
      <AppHeader title="Profile & settings" subtitle="Make the club feel like yours." />

      {message.text && (
        <p className={message.type === 'error' ? 'form-error' : 'form-success'} role="status">{message.text}</p>
      )}

      <section className="card profile-section">
        <h3>Profile picture</h3>
        <div className="profile-photo">
          <Avatar username={profile.username} displayName={profile.displayName} avatarUrl={profile.avatarUrl} size={96} />
          <div className="profile-photo-actions">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={uploadAvatar} />
            <button type="button" className="primary-button" disabled={busy} onClick={() => fileRef.current?.click()}>
              {profile.avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {profile.avatarUrl && (
              <button type="button" className="secondary-button" disabled={busy} onClick={removeAvatar}>Remove</button>
            )}
            <small className="muted-text">JPG, PNG, GIF or WebP, up to 2MB.</small>
          </div>
        </div>
        <div>
          <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
        </div>
      </section>

      <form className="card profile-section" onSubmit={saveDetails}>
        <h3>About you</h3>
        <label className="field">
          Username
          <input value={profile.username} disabled />
        </label>
        <label className="field">
          Display name
          <input value={form.displayName} maxLength={64} placeholder={profile.username}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </label>
        <label className="field">
          Bio
          <textarea rows={3} value={form.bio} maxLength={300} placeholder="Tell the club what you love to read"
            onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          <small className="muted-text">{form.bio.length}/300</small>
        </label>

        <h3>Reading</h3>
        <div className="genre-chips">
          {GENRES.map((genre) => (
            <button key={genre} type="button" className={`genre-chip ${form.favoriteGenres.includes(genre) ? 'on' : ''}`}
              aria-pressed={form.favoriteGenres.includes(genre)} onClick={() => toggleGenre(genre)}>
              {genre}
            </button>
          ))}
        </div>
        <label className="field">
          Books to finish this year
          <input type="number" min="0" max="500" value={form.readingGoal}
            onChange={(event) => setForm({ ...form, readingGoal: event.target.value })} />
        </label>
        {Number(form.readingGoal) > 0 && (
          <div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${goalPercent}%` }} /></div>
            <small className="muted-text">{completed} of {form.readingGoal} completed ({goalPercent}%)</small>
          </div>
        )}
        <div><button type="submit" className="primary-button" disabled={busy}>Save profile</button></div>
      </form>

      <section className="card profile-section">
        <h3>Appearance</h3>
        <div className="theme-options" role="radiogroup" aria-label="Theme">
          {THEMES.map((theme) => (
            <button key={theme.value} type="button" role="radio" aria-checked={profile.themePreference === theme.value}
              className={`theme-option ${profile.themePreference === theme.value ? 'on' : ''}`}
              onClick={() => save({ themePreference: theme.value })}>
              <span>{theme.icon}</span>{theme.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card profile-section">
        <h3>Notifications</h3>
        <Toggle label="Meetings" hint="When someone schedules a meeting" checked={profile.notifyMeetings}
          onChange={(value) => save({ notifyMeetings: value })} />
        <Toggle label="Messages" hint="New chat messages" checked={profile.notifyMessages}
          onChange={(value) => save({ notifyMessages: value })} />
        <Toggle label="Reactions" hint="When someone reacts to your messages" checked={profile.notifyReactions}
          onChange={(value) => save({ notifyReactions: value })} />
      </section>

      <section className="card profile-section">
        <h3>Privacy</h3>
        <Toggle label="Show profile pictures" hint="Display other members' photos in chat and discussions"
          checked={profile.showAvatars} onChange={(value) => save({ showAvatars: value })} />
      </section>

      <section className="card profile-section danger-zone">
        <h3>Delete account</h3>
        <p className="muted-text">
          This permanently removes your account, books, reviews, messages, meetings and photo. It cannot be undone.
          Type <strong>{profile.username}</strong> to confirm.
        </p>
        <div className="danger-row">
          <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder={profile.username} />
          <button type="button" className="danger-button" disabled={busy || confirmText !== profile.username} onClick={deleteAccount}>
            Delete my account
          </button>
        </div>
      </section>
    </main>
  )
}
