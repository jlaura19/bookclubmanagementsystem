import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { resolveMediaUrl } from '../services/media'
import TopNav from '../components/TopNav'

const PROGRESS_KEY = 'bookclub.progress'
const VOTES_KEY = 'bookclub.votes'

const PROMPTS = [
  { id: 'p1', tag: 'Chapters 1–5', title: 'Which character did you connect with first, and why?' },
  { id: 'p2', tag: 'Chapter 8', title: 'Was that twist earned, or did it come out of nowhere?' },
  { id: 'p3', tag: 'Open prompt', title: 'Share a line that made you stop and re-read.' },
]

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function formatWhen(value) {
  const date = new Date(value)
  return `${date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  const diff = Math.max(0, target.getTime() - now)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
}

function Cover({ book, className = '' }) {
  return (
    <div className={`cover ${className}`}>
      {book?.coverImageUrl ? (
        <img src={resolveMediaUrl(book.coverImageUrl)} alt={`${book.title} cover`} />
      ) : (
        <span>{book?.title?.slice(0, 1) || '📚'}</span>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [myBooks, setMyBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [progressMap, setProgressMap] = useState(() => readJson(PROGRESS_KEY, {}))
  const [editingProgress, setEditingProgress] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const [totalInput, setTotalInput] = useState('')
  const [meetings, setMeetings] = useState([])
  const [showScheduler, setShowScheduler] = useState(false)
  const [meetingForm, setMeetingForm] = useState({ title: '', startsAt: '', location: '', notes: '' })
  const [meetingError, setMeetingError] = useState('')
  const [votes, setVotes] = useState(() => readJson(VOTES_KEY, { tally: {}, mine: null }))
  const [thought, setThought] = useState('')
  const [shareError, setShareError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/books/mine').then((r) => r.data).catch(() => []),
      api.get('/books').then((r) => r.data).catch(() => []),
      api.get('/chat').then((r) => r.data).catch(() => []),
      api.get('/meetings').then((r) => r.data).catch(() => []),
    ]).then(([mine, all, chat, upcoming]) => {
      setMyBooks(mine)
      setAllBooks(all)
      setMessages(chat.slice(0, 5))
      setMeetings(upcoming)
      setLoading(false)
    })
  }, [])

  const currentRead = useMemo(
    () => myBooks.find((b) => b.readingStatus === 'Reading') || myBooks[0] || allBooks[0] || null,
    [myBooks, allBooks],
  )
  const nominees = useMemo(
    () => allBooks.filter((b) => b.id !== currentRead?.id).slice(0, 8),
    [allBooks, currentRead],
  )

  const progress = currentRead ? progressMap[currentRead.id] || { page: 0, total: 300 } : { page: 0, total: 300 }
  const percent = Math.min(100, Math.round((progress.page / Math.max(1, progress.total)) * 100))

  const nextMeeting = meetings[0]
  const countdown = useCountdown(nextMeeting ? new Date(nextMeeting.startsAt) : new Date())

  const saveProgress = (event) => {
    event.preventDefault()
    if (!currentRead) {
      return
    }
    const total = Math.max(1, Number(totalInput) || progress.total)
    const page = Math.min(total, Math.max(0, Number(pageInput) || 0))
    const next = { ...progressMap, [currentRead.id]: { page, total } }
    setProgressMap(next)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
    setEditingProgress(false)
  }

  const openProgressEditor = () => {
    setPageInput(String(progress.page))
    setTotalInput(String(progress.total))
    setEditingProgress(true)
  }

  const toggleRsvp = async (id) => {
    try {
      const response = await api.post(`/meetings/${id}/rsvp`)
      setMeetings((prev) => prev.map((m) => (m.id === id ? response.data : m)))
    } catch {
      window.alert('Could not update your RSVP right now.')
    }
  }

  const scheduleMeeting = async (event) => {
    event.preventDefault()
    setMeetingError('')
    try {
      const response = await api.post('/meetings', meetingForm)
      setMeetings((prev) => [...prev, response.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
      setMeetingForm({ title: '', startsAt: '', location: '', notes: '' })
      setShowScheduler(false)
    } catch (err) {
      setMeetingError(err?.response?.data?.message || 'Could not schedule the meeting.')
    }
  }

  const cancelMeeting = async (id) => {
    if (!window.confirm('Cancel this meeting?')) {
      return
    }
    try {
      await api.delete(`/meetings/${id}`)
      setMeetings((prev) => prev.filter((m) => m.id !== id))
    } catch {
      window.alert('Could not cancel the meeting.')
    }
  }

  const minStart = (() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 16)
  })()

  const castVote = (bookId) => {
    const tally = { ...votes.tally }
    if (votes.mine != null) {
      tally[votes.mine] = Math.max(0, (tally[votes.mine] || 1) - 1)
    }
    const mine = votes.mine === bookId ? null : bookId
    if (mine != null) {
      tally[bookId] = (tally[bookId] || 0) + 1
    }
    const next = { tally, mine }
    setVotes(next)
    localStorage.setItem(VOTES_KEY, JSON.stringify(next))
  }

  const shareThought = async (event) => {
    event.preventDefault()
    const text = thought.trim()
    if (!text) {
      return
    }
    setShareError('')
    try {
      const response = await api.post('/chat', { message: text, bookId: null })
      setMessages((prev) => [response.data, ...prev].slice(0, 5))
      setThought('')
    } catch {
      setShareError('Could not share right now.')
    }
  }

  const readers = useMemo(() => {
    const names = new Set(allBooks.map((b) => b.ownerUsername).filter(Boolean))
    messages.forEach((m) => names.add(m.username))
    return [...names].slice(0, 8)
  }, [allBooks, messages])

  const reactionTotal = (message) => (message.reactions || []).reduce((sum, r) => sum + r.users.length, 0)

  return (
    <main className="page-shell dash">
      <TopNav />

      <section className="hero">
        {currentRead ? (
          <>
            <Cover book={currentRead} className="hero-cover" />
            <div className="hero-body">
              <span className="eyebrow">Book of the Month</span>
              <h1>{currentRead.title}</h1>
              <p className="hero-author">by {currentRead.author}</p>

              <div className="progress-block">
                <div className="progress-label">
                  <span>Page {progress.page} of {progress.total}</span>
                  <strong>{percent}%</strong>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>

              {editingProgress ? (
                <form className="progress-form" onSubmit={saveProgress}>
                  <label>
                    Page
                    <input type="number" min="0" value={pageInput} onChange={(e) => setPageInput(e.target.value)} />
                  </label>
                  <label>
                    of
                    <input type="number" min="1" value={totalInput} onChange={(e) => setTotalInput(e.target.value)} />
                  </label>
                  <button type="submit" className="primary-button">Save</button>
                  <button type="button" className="secondary-button" onClick={() => setEditingProgress(false)}>Cancel</button>
                </form>
              ) : (
                <div className="hero-actions">
                  <Link to="/chat" className="primary-button">Join Next Discussion</Link>
                  <button type="button" className="secondary-button" onClick={openProgressEditor}>Update My Progress</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="hero-body">
            <span className="eyebrow">Book of the Month</span>
            <h1>{loading ? 'Loading…' : 'No current read yet'}</h1>
            <p className="hero-author">Search the web for a book and add it to get started.</p>
            <div className="hero-actions">
              <Link to="/catalog" className="primary-button">Discover books</Link>
            </div>
          </div>
        )}

        <div className="countdown-card">
          <span className="eyebrow">Next live meeting</span>
          {nextMeeting ? (
            <>
              <div className="countdown">
                <div><strong>{countdown.days}</strong><span>days</span></div>
                <div><strong>{countdown.hours}</strong><span>hrs</span></div>
                <div><strong>{countdown.minutes}</strong><span>min</span></div>
              </div>
              <p>
                {nextMeeting.title}<br />
                {formatWhen(nextMeeting.startsAt)}
              </p>
            </>
          ) : (
            <>
              <p>No meetings scheduled yet.</p>
              <a href="#schedule" className="secondary-button" onClick={() => setShowScheduler(true)}>Schedule one</a>
            </>
          )}
        </div>
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Active discussions</h2>
            <Link to="/chat" className="link-button">Open chat</Link>
          </div>

          <div className="prompt-list">
            {PROMPTS.map((prompt) => (
              <Link to="/chat" key={prompt.id} className="prompt-card">
                <span className="tag">{prompt.tag}</span>
                <strong>{prompt.title}</strong>
              </Link>
            ))}
          </div>

          <div className="member-row">
            <span className="muted-text">Reading &amp; chatting now</span>
            <div className="member-chips">
              {readers.length === 0 && <span className="muted-text">No members yet</span>}
              {readers.map((name) => (
                <span key={name} className="member-chip">
                  <span className="avatar sm">{name.charAt(0).toUpperCase()}</span>{name}
                </span>
              ))}
            </div>
          </div>

          <form className="thought-box" onSubmit={shareThought}>
            <input
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="Share a thought or favourite quote…"
              maxLength={1000}
            />
            <button type="submit" className="primary-button">Share</button>
          </form>
          {shareError && <p className="form-error">{shareError}</p>}

          <div className="thread-feed">
            {messages.length === 0 && !loading && <p className="muted-text">No messages yet — be the first to share.</p>}
            {messages.map((m) => (
              <article key={m.id} className="thread-item">
                <span className="avatar">{(m.username || '?').charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{m.username}</strong>
                  <p>{m.message}</p>
                </div>
                <span className="badge" title="Reactions">💬 {reactionTotal(m)}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel" id="schedule">
          <div className="panel-head">
            <h2>Upcoming meetings</h2>
            <button type="button" className="link-button plain" onClick={() => setShowScheduler((open) => !open)}>
              {showScheduler ? 'Close' : '+ Schedule'}
            </button>
          </div>

          {showScheduler && (
            <form className="schedule-form" onSubmit={scheduleMeeting}>
              <input
                required
                maxLength={120}
                placeholder="Title, e.g. Chapters 1–5 Sync"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
              />
              <input
                required
                type="datetime-local"
                min={minStart}
                value={meetingForm.startsAt}
                onChange={(e) => setMeetingForm({ ...meetingForm, startsAt: e.target.value })}
              />
              <input
                maxLength={200}
                placeholder="Location or meet link"
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
              />
              <textarea
                rows="2"
                maxLength={500}
                placeholder="Notes (optional)"
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
              />
              {meetingError && <p className="form-error">{meetingError}</p>}
              <button type="submit" className="primary-button">Schedule meeting</button>
            </form>
          )}

          <div className="meeting-list">
            {meetings.length === 0 && !showScheduler && (
              <p className="muted-text">Nothing scheduled. Use “+ Schedule” to set up the first one.</p>
            )}
            {meetings.map((meeting) => {
              const date = new Date(meeting.startsAt)
              return (
                <article key={meeting.id} className="meeting">
                  <div className="date-tile">
                    <strong>{date.getDate()}</strong>
                    <span>{date.toLocaleDateString([], { month: 'short' })}</span>
                  </div>
                  <div className="meeting-info">
                    <strong>{meeting.title}</strong>
                    <span>{formatWhen(meeting.startsAt)}</span>
                    {meeting.location && <span>{meeting.location}</span>}
                    {meeting.notes && <span>{meeting.notes}</span>}
                    <span>{meeting.goingCount} going · by {meeting.organizer}</span>
                    {meeting.mine && (
                      <button type="button" className="link-button plain danger-link" onClick={() => cancelMeeting(meeting.id)}>
                        Cancel meeting
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`rsvp ${meeting.going ? 'on' : ''}`}
                    aria-pressed={meeting.going}
                    onClick={() => toggleRsvp(meeting.id)}
                  >
                    {meeting.going ? '✓ Going' : 'RSVP'}
                  </button>
                </article>
              )
            })}
          </div>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Vote for the next read</h2>
          <Link to="/catalog" className="link-button">Nominate a book</Link>
        </div>
        {nominees.length === 0 ? (
          <p className="muted-text">No nominations yet. Add books from Discover to nominate them.</p>
        ) : (
          <div className="vote-row">
            {nominees.map((book) => {
              const mine = votes.mine === book.id
              return (
                <article key={book.id} className="vote-card">
                  <Cover book={book} className="vote-cover" />
                  <strong title={book.title}>{book.title}</strong>
                  <span className="muted-text">{book.author}</span>
                  <button type="button" className={`vote-btn ${mine ? 'on' : ''}`} onClick={() => castVote(book.id)}>
                    {mine ? '✓ Voted' : 'Vote'} · {votes.tally[book.id] || 0}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
