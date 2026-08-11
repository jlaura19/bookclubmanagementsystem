import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../services/media'

export default function BookCard({ book, canManage = false, onDelete }) {
  const handleDelete = async () => {
    if (!onDelete) {
      return
    }

    const isConfirmed = window.confirm(`Delete "${book.title}"? This action cannot be undone.`)
    if (!isConfirmed) {
      return
    }

    await onDelete(book.id)
  }

  return (
    <article className="book-card">
      <div className="cover-frame">
        {book.coverImageUrl ? (
          <img src={resolveMediaUrl(book.coverImageUrl)} alt={`${book.title} cover`} />
        ) : (
          <div className="cover-placeholder">Cover image</div>
        )}
      </div>
      <div className="book-details">
        <h3>{book.title}</h3>
        <p className="book-subtitle">{book.author}</p>
        <p className="book-meta">{book.genre || 'Genre unassigned'}</p>
        <p className="book-meta">Status: {book.readingStatus || 'Unknown'}</p>
        <p className="book-meta">Rating: {book.rating ?? '—'}</p>
      </div>
      <div className="card-actions">
        <Link to={`/community?book=${book.id}`} className="secondary-button">
          Reviews
        </Link>
        {canManage && (
          <>
            <Link to={`/books/${book.id}`} className="secondary-button">
              Edit
            </Link>
            <button type="button" className="danger-button" onClick={handleDelete}>
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  )
}
