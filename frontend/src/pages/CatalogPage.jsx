import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import BookCard from '../components/BookCard'
import AppHeader from '../components/AppHeader'
import BookSearchPanel from '../components/BookSearchPanel'

const statusOptions = ['All', 'To Read', 'Reading', 'Completed']

export default function CatalogPage() {
  const [books, setBooks] = useState([])
  const [filter, setFilter] = useState('All')
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const currentUsername = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID')

  useEffect(() => {
    api.get('/books')
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

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesQuery = `${book.title} ${book.author} ${book.genre}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchesStatus = filter === 'All' || book.readingStatus === filter
      return matchesQuery && matchesStatus
    })
  }, [books, filter, query])

  return (
    <main className="page-shell">
      <AppHeader
        title="Catalog"
        subtitle="Browse all shared books, then jump into reviews and discussion."
        primaryAction={{ to: '/books/new', label: 'Add New Book' }}
      />

      <BookSearchPanel
        initialTerm={searchParams.get('q') || ''}
        onAdded={(book) => setBooks((previousBooks) => [book, ...previousBooks])}
      />

      <section className="filter-bar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, author, or genre"
        />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <p>Loading your book collection…</p>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state">
          <p>No books found. Try adjusting your search or adding a new book.</p>
          <Link to="/books/new" className="secondary-button">
            Add a book
          </Link>
        </div>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book) => (
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
