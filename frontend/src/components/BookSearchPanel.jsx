import { useEffect, useState } from 'react'
import api from '../services/api'

const SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes'

function toHttps(url) {
  return url ? url.replace(/^http:\/\//, 'https://') : ''
}

function mapVolume(item) {
  const info = item.volumeInfo || {}
  const links = info.imageLinks || {}
  return {
    id: item.id,
    title: info.title || 'Untitled',
    author: (info.authors || []).join(', ') || 'Unknown author',
    genre: (info.categories || [])[0] || '',
    description: info.description || '',
    publishedDate: info.publishedDate || '',
    pageCount: info.pageCount || 0,
    cover: toHttps(links.thumbnail || links.smallThumbnail || ''),
    previewLink: toHttps(info.previewLink || info.infoLink || ''),
  }
}

export default function BookSearchPanel({ onAdded, initialTerm = '' }) {
  const [term, setTerm] = useState(initialTerm)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [selected, setSelected] = useState(null)
  const [addingId, setAddingId] = useState('')
  const [notice, setNotice] = useState('')

  const runSearch = async (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    setStatus('loading')
    setNotice('')
    try {
      const response = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(trimmed)}&maxResults=20&printType=books`)
      if (!response.ok) {
        throw new Error('search failed')
      }
      const data = await response.json()
      setResults((data.items || []).map(mapVolume))
      setStatus('done')
    } catch {
      setResults([])
      setStatus('error')
    }
  }

  useEffect(() => {
    setTerm(initialTerm)
    runSearch(initialTerm)
  }, [initialTerm])

  const handleSearch = (event) => {
    event.preventDefault()
    runSearch(term)
  }

  const handleAdd = async (book) => {
    setAddingId(book.id)
    setNotice('')
    try {
      const formData = new FormData()
      const payload = {
        title: book.title,
        author: book.author,
        genre: book.genre,
        readingStatus: 'To Read',
        rating: 0,
        reviewNotes: book.description.slice(0, 1900),
        coverImageUrl: book.cover,
      }
      formData.append('book', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      const response = await api.post('/books', formData)
      onAdded?.(response.data)
      setNotice(`“${book.title}” was added to the catalog.`)
      setSelected(null)
    } catch {
      setNotice('Could not add this book. Please try again.')
    } finally {
      setAddingId('')
    }
  }

  return (
    <section className="card discover-panel">
      <h2>Discover books</h2>
      <p className="muted-text">Search the whole internet by title, author, or topic, then preview or add a book.</p>

      <form className="discover-form" onSubmit={handleSearch}>
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="e.g. Things Fall Apart, Chimamanda, startup finance"
          aria-label="Search the internet for books"
        />
        <button type="submit" className="primary-button" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {notice && <p className="muted-text">{notice}</p>}
      {status === 'error' && <p className="form-error">Search is unavailable right now. Please try again.</p>}
      {status === 'done' && results.length === 0 && <p className="muted-text">No books matched your search.</p>}

      {results.length > 0 && (
        <div className="discover-grid">
          {results.map((book) => (
            <article key={book.id} className="discover-item">
              <button type="button" className="discover-cover" onClick={() => setSelected(book)} aria-label={`Preview ${book.title}`}>
                {book.cover ? <img src={book.cover} alt={`Cover of ${book.title}`} loading="lazy" /> : <span>No cover</span>}
              </button>
              <strong>{book.title}</strong>
              <span className="muted-text">{book.author}</span>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)} role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-body">
              {selected.cover && <img className="modal-cover" src={selected.cover} alt={`Cover of ${selected.title}`} />}
              <div>
                <h3>{selected.title}</h3>
                <p className="muted-text">
                  {selected.author}
                  {selected.publishedDate ? ` • ${selected.publishedDate}` : ''}
                  {selected.pageCount ? ` • ${selected.pageCount} pages` : ''}
                </p>
                {selected.genre && <p className="muted-text">{selected.genre}</p>}
                <p className="modal-description">
                  {selected.description ? selected.description.replace(/<[^>]*>/g, '') : 'No description available.'}
                </p>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                disabled={addingId === selected.id}
                onClick={() => handleAdd(selected)}
              >
                {addingId === selected.id ? 'Adding…' : 'Add to catalog'}
              </button>
              {selected.previewLink && (
                <a className="secondary-button" href={selected.previewLink} target="_blank" rel="noreferrer noopener">
                  Preview book
                </a>
              )}
              <button type="button" className="secondary-button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
