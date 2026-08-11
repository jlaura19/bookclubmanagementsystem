import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import BookCard from '../components/BookCard'
import AppHeader from '../components/AppHeader'

export default function DashboardPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const currentUsername = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID')

  useEffect(() => {
    api.get('/books/mine')
      .then((response) => setBooks(response.data))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDeleteBook = async (bookId) => {
    try {
      await api.delete(`/books/${bookId}`)
      setBooks((previousBooks) => previousBooks.filter((book) => book.id !== bookId))
    } catch {
      window.alert('Failed to delete book. You can only delete books you created.')
    }
  }

  const completedCount = books.filter((book) => book.readingStatus === 'Completed').length
  const readingCount = books.filter((book) => book.readingStatus === 'Reading').length
  const toReadCount = books.filter((book) => book.readingStatus === 'To Read').length

  return (
    <main className="page-shell">
      <AppHeader
        title="Dashboard"
        subtitle="Track your reading progress and manage your own books."
        primaryAction={{ to: '/books/new', label: 'Add New Book' }}
      />

      <section className="summary-grid">
        <article className="summary-card">
          <h2>{books.length}</h2>
          <p>Total books</p>
        </article>
        <article className="summary-card">
          <h2>{completedCount}</h2>
          <p>Finished</p>
        </article>
        <article className="summary-card">
          <h2>{readingCount}</h2>
          <p>Currently reading</p>
        </article>
        <article className="summary-card">
          <h2>{toReadCount}</h2>
          <p>Want to read</p>
        </article>
      </section>

      <section className="list-section">
        <div className="section-heading">
          <h2>Recent books</h2>
          <Link to="/catalog" className="link-button">
            Browse all
          </Link>
        </div>
        {loading ? (
          <p>Loading your collection…</p>
        ) : books.length === 0 ? (
          <p>You have no books in your library yet.</p>
        ) : (
          <div className="book-grid">
            {books.slice(0, 6).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                canManage={(book.ownerUsername || book.ownerStudentId) === currentUsername}
                onDelete={handleDeleteBook}
              />
            ))}
          </div>
        )}

        <div className="cta-row">
          <Link to="/community" className="secondary-button">
            Explore shared reviews
          </Link>
          <Link to="/chat" className="secondary-button">
            Open chat room
          </Link>
        </div>
      </section>
    </main>
  )
}
