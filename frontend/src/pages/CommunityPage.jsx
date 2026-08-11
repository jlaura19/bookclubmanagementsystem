import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import AppHeader from '../components/AppHeader'

const statusOptions = ['To Read', 'Reading', 'Completed']

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [books, setBooks] = useState([])
  const [selectedBookId, setSelectedBookId] = useState('')
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [readingStatus, setReadingStatus] = useState('Completed')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.get('/books')
      .then((response) => {
        const nextBooks = response.data || []
        setBooks(nextBooks)

        const requestedBookId = searchParams.get('book')
        if (requestedBookId && nextBooks.some((book) => String(book.id) === requestedBookId)) {
          setSelectedBookId(requestedBookId)
          return
        }

        if (nextBooks.length > 0) {
          setSelectedBookId(String(nextBooks[0].id))
        }
      })
      .catch(() => {
        setBooks([])
        setSelectedBookId('')
      })
  }, [searchParams])

  useEffect(() => {
    if (!selectedBookId) {
      setReviews([])
      return
    }

    api.get(`/books/${selectedBookId}/reviews`)
      .then((response) => setReviews(response.data || []))
      .catch(() => setReviews([]))
  }, [selectedBookId])

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === String(selectedBookId)),
    [books, selectedBookId]
  )

  const handleBookChange = (event) => {
    const nextBookId = event.target.value
    setSelectedBookId(nextBookId)
    setSearchParams(nextBookId ? { book: nextBookId } : {})
  }

  const handleSubmitReview = async (event) => {
    event.preventDefault()
    setError('')

    if (!selectedBookId) {
      setError('Select a book first.')
      return
    }

    if (!comment.trim()) {
      setError('Please write your review before posting.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await api.post(`/books/${selectedBookId}/reviews`, {
        rating,
        readingStatus,
        comment: comment.trim(),
      })

      setReviews((previousReviews) => [response.data, ...previousReviews])
      setComment('')
      setRating(5)
      setReadingStatus('Completed')
    } catch (err) {
      const message = err?.response?.data?.message || 'Could not publish review. Try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpvoteReview = async (reviewId) => {
    if (!selectedBookId) {
      return
    }

    try {
      const response = await api.post(`/books/${selectedBookId}/reviews/${reviewId}/upvote`)
      const updatedReview = response.data
      setReviews((previousReviews) => previousReviews.map((review) => (
        review.id === updatedReview.id ? updatedReview : review
      )))
    } catch {
      setError('Could not upvote this review right now.')
    }
  }

  return (
    <main className="page-shell">
      <AppHeader
        title="Community Reviews"
        subtitle="Pick any shared book and post your review for everyone to read."
        primaryAction={{ to: '/books/new', label: 'Share A New Book' }}
      />

      <section className="card section-stack">
        <div className="field-group">
          <label htmlFor="communityBook">Choose book</label>
          <select id="communityBook" value={selectedBookId} onChange={handleBookChange}>
            {books.length === 0 ? (
              <option value="">No books available yet</option>
            ) : (
              books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} by {book.author}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedBook ? (
          <div className="book-highlight">
            <h2>{selectedBook.title}</h2>
            <p>{selectedBook.author} • {selectedBook.genre || 'Unclassified genre'}</p>
            <Link to={`/books/${selectedBook.id}`} className="secondary-button">
              View details
            </Link>
          </div>
        ) : (
          <p className="muted-text">Add the first book to start community reviews.</p>
        )}

        <form className="form-grid" onSubmit={handleSubmitReview}>
          <h3>Post your review</h3>

          <label htmlFor="communityRating">Rating (0-5)</label>
          <input
            id="communityRating"
            type="number"
            min="0"
            max="5"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          />

          <label htmlFor="communityStatus">Your status</label>
          <select
            id="communityStatus"
            value={readingStatus}
            onChange={(event) => setReadingStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label htmlFor="communityComment">Review comment</label>
          <textarea
            id="communityComment"
            rows="4"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share your thoughts about this book."
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting || !selectedBookId}>
            {isSubmitting ? 'Posting...' : 'Post Review'}
          </button>
        </form>
      </section>

      <section className="card section-stack">
        <h3>What readers are saying</h3>
        {reviews.length === 0 ? (
          <p className="muted-text">No reviews yet for this book. Start the conversation.</p>
        ) : (
          <div className="feed-list">
            {reviews.map((review) => (
              <article key={review.id} className="feed-item">
                <div className="feed-meta">
                  <strong>{review.reviewerUsername || review.reviewerStudentId}</strong>
                  <span>{review.readingStatus}</span>
                  <span>Rating: {review.rating}/5</span>
                  <span>Upvotes: {review.upvotes ?? 0}</span>
                </div>
                <p>{review.comment}</p>
                <button type="button" className="secondary-button" onClick={() => handleUpvoteReview(review.id)}>
                  Upvote
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
