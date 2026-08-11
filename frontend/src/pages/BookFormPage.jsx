import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { resolveMediaUrl } from '../services/media'
import AppHeader from '../components/AppHeader'

const statusOptions = ['To Read', 'Reading', 'Completed']

export default function BookFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [readingStatus, setReadingStatus] = useState('To Read')
  const [rating, setRating] = useState(0)
  const [reviewNotes, setReviewNotes] = useState('')
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [existingCover, setExistingCover] = useState('')
  const [error, setError] = useState('')

  const isEditing = Boolean(id)

  useEffect(() => {
    if (!isEditing) {
      setCoverPreview('')
      return
    }

    api.get(`/books/${id}`)
      .then((response) => {
        const book = response.data
        setTitle(book.title || '')
        setAuthor(book.author || '')
        setGenre(book.genre || '')
        setReadingStatus(book.readingStatus || 'To Read')
        setRating(book.rating || 0)
        setReviewNotes(book.reviewNotes || '')
        setExistingCover(book.coverImageUrl || '')
      })
      .catch(() => navigate('/catalog'))
  }, [id, isEditing, navigate])

  useEffect(() => {
    if (!coverImageFile) {
      return
    }

    const previewUrl = URL.createObjectURL(coverImageFile)
    setCoverPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [coverImageFile])

  const titleText = useMemo(() => (isEditing ? 'Edit Book' : 'Add Book'), [isEditing])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!title.trim() || !author.trim()) {
      setError('Please provide both the title and author.')
      return
    }

    const formData = new FormData()
    const bookPayload = {
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      readingStatus,
      rating,
      reviewNotes: reviewNotes.trim(),
    }

    formData.append('book', new Blob([JSON.stringify(bookPayload)], { type: 'application/json' }))
    const activeUsername = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID')
    if (activeUsername) {
      formData.append('username', activeUsername)
    }
    if (coverImageFile) {
      formData.append('coverImage', coverImageFile)
    }

    try {
      if (isEditing) {
        await api.put(`/books/${id}`, formData)
      } else {
        await api.post('/books', formData)
      }
      navigate('/catalog')
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        localStorage.removeItem('USIU_BOOKCLUB_USERNAME')
        localStorage.removeItem('USIU_BOOKCLUB_STUDENT_ID')
        navigate('/', { replace: true })
        return
      }

      const apiMessage = err?.response?.data?.message
      setError(apiMessage || 'Failed to save the book. Please try again.')
    }
  }

  return (
    <main className="page-shell">
      <AppHeader
        title={titleText}
        subtitle="Create a shared book entry and track your reading status."
        primaryAction={{ to: '/community', label: 'Open Community' }}
      />

      <section className="card form-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="author">Author</label>
          <input
            id="author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            required
          />

          <label htmlFor="genre">Genre</label>
          <input id="genre" value={genre} onChange={(event) => setGenre(event.target.value)} />

          <label htmlFor="readingStatus">Reading status</label>
          <select
            id="readingStatus"
            value={readingStatus}
            onChange={(event) => setReadingStatus(event.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <label htmlFor="rating">Rating</label>
          <input
            id="rating"
            type="number"
            min="0"
            max="5"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          />

          <label htmlFor="reviewNotes">Review notes</label>
          <textarea
            id="reviewNotes"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            rows="4"
          />

          <label htmlFor="coverImage">Cover image</label>
          <input
            id="coverImage"
            type="file"
            accept="image/*"
            onChange={(event) => setCoverImageFile(event.target.files?.[0] || null)}
          />

          {(coverPreview || existingCover) && (
            <div className="image-preview">
              <img alt="Cover preview" src={coverPreview || resolveMediaUrl(existingCover)} />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {isEditing ? 'Update book' : 'Add book'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/catalog')}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
