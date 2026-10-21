import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import BookCard from '../components/BookCard'
import AppHeader from '../components/AppHeader'

const TABS = ['All', 'Reading', 'To Read', 'Completed']

export default function BookshelfPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const currentUsername = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID')

  useEffect(() => {
    api.get('/books/mine')
      .then((response) => setBooks(response.data))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const result = { All: books.length }
    TABS.slice(1).forEach((status) => {
      result[status] = books.filter((book) => book.readingStatus === status).length
    })
    return result
  }, [books])

  const visibleBooks = tab === 'All' ? books : books.filter((book) => book.readingStatus === tab)

  const handleDeleteBook = async (bookId) => {
    try {
      await api.delete(`/books/${bookId}`)
      setBooks((previous) => previous.filter((book) => book.id !== bookId))
    } catch {
      window.alert('Failed to delete book. You can only delete books you created.')
    }
  }

  return (
    <main className="page-shell">
      <AppHeader
        title="My Bookshelf"
        subtitle="Everything you're reading, plan to read, and have finished."
        primaryAction={{ to: '/books/new', label: 'Add New Book' }}
      />

      <div className="shelf-tabs" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={`shelf-tab ${tab === name ? 'active' : ''}`}
            onClick={() => setTab(name)}
          >
            {name} <span>{counts[name]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted-text">Loading your collection…</p>
      ) : visibleBooks.length === 0 ? (
        <div className="empty-state">
          <p>{books.length === 0 ? 'Your shelf is empty.' : `No books marked “${tab}”.`}</p>
          <Link to="/catalog" className="secondary-button">Discover books</Link>
        </div>
      ) : (
        <div className="book-grid">
          {visibleBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              canManage={(book.ownerUsername || book.ownerStudentId) === currentUsername}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      )}
    </main>
  )
}
