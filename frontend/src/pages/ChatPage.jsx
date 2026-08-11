import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import api from '../services/api'
import AppHeader from '../components/AppHeader'

export default function ChatPage() {
  const [books, setBooks] = useState([])
  const [selectedThread, setSelectedThread] = useState('general')
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const stompClientRef = useRef(null)
  const subscriptionRef = useRef(null)

  const selectedBookId = useMemo(() => {
    if (selectedThread === 'general') {
      return null
    }
    return Number(selectedThread)
  }, [selectedThread])

  const threadLabel = useMemo(() => {
    if (selectedThread === 'general') {
      return 'General room'
    }
    const selectedBook = books.find((book) => String(book.id) === selectedThread)
    if (!selectedBook) {
      return 'Book thread'
    }
    return `${selectedBook.title} thread`
  }, [books, selectedThread])

  const mergeMessage = (incomingMessage) => {
    setMessages((previousMessages) => {
      const existingIndex = previousMessages.findIndex((item) => item.id === incomingMessage.id)
      if (existingIndex >= 0) {
        const nextMessages = [...previousMessages]
        nextMessages[existingIndex] = incomingMessage
        return nextMessages
      }
      return [...previousMessages, incomingMessage]
    })
  }

  const loadMessages = async (bookId) => {
    try {
      const params = bookId ? { params: { bookId } } : undefined
      const response = await api.get('/chat', params)
      const newestFirst = response.data || []
      setMessages([...newestFirst].reverse())
    } catch {
      setMessages([])
    }
  }

  useEffect(() => {
    api.get('/books')
      .then((response) => {
        const allBooks = response.data || []
        setBooks(allBooks)
      })
      .catch(() => setBooks([]))
  }, [])

  useEffect(() => {
    loadMessages(selectedBookId)
  }, [selectedBookId])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/ws`

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
    })

    client.onConnect = () => {
      setIsConnected(true)
    }

    client.onStompError = () => {
      setIsConnected(false)
    }

    client.onWebSocketClose = () => {
      setIsConnected(false)
    }

    client.activate()
    stompClientRef.current = client

    return () => {
      setIsConnected(false)
      subscriptionRef.current?.unsubscribe()
      client.deactivate()
    }
  }, [])

  useEffect(() => {
    if (!stompClientRef.current || !isConnected) {
      return
    }

    const topic = selectedBookId ? `/topic/chat.book.${selectedBookId}` : '/topic/chat.general'
    subscriptionRef.current?.unsubscribe()
    subscriptionRef.current = stompClientRef.current.subscribe(topic, (frame) => {
      try {
        const incomingMessage = JSON.parse(frame.body)
        mergeMessage(incomingMessage)
      } catch {
        // Ignore malformed websocket payloads.
      }
    })

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [isConnected, selectedBookId])

  const handleSend = async (event) => {
    event.preventDefault()
    setError('')

    if (!message.trim()) {
      setError('Message cannot be empty.')
      return
    }

    try {
      setIsSending(true)
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({
            message: message.trim(),
            bookId: selectedBookId,
          }),
        })
      } else {
        const response = await api.post('/chat', {
          message: message.trim(),
          bookId: selectedBookId,
        })
        mergeMessage(response.data)
      }
      setMessage('')
    } catch (err) {
      const nextError = err?.response?.data?.message || 'Failed to send message.'
      setError(nextError)
    } finally {
      setIsSending(false)
    }
  }

  const handleUpvote = async (messageId) => {
    try {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: '/app/chat.upvote',
          body: JSON.stringify({ messageId }),
        })
        return
      }

      const response = await api.post(`/chat/${messageId}/upvote`)
      mergeMessage(response.data)
    } catch {
      setError('Could not upvote this message right now.')
    }
  }

  return (
    <main className="page-shell">
      <AppHeader
        title="Book Club Chat"
        subtitle="Live WebSocket chat with general and per-book discussion threads."
        primaryAction={{ to: '/community', label: 'Open Reviews' }}
      />

      <section className="card chat-shell">
        <div className="thread-toolbar">
          <div className="field-group">
            <label htmlFor="threadPicker">Chat thread</label>
            <select
              id="threadPicker"
              value={selectedThread}
              onChange={(event) => setSelectedThread(event.target.value)}
            >
              <option value="general">General room</option>
              {books.map((book) => (
                <option key={book.id} value={String(book.id)}>
                  {book.title} by {book.author}
                </option>
              ))}
            </select>
          </div>
          <p className="muted-text">
            {isConnected ? 'Live connected' : 'Reconnecting...'} • {threadLabel}
          </p>
        </div>

        <div className="chat-feed">
          {messages.length === 0 ? (
            <p className="muted-text">No messages yet. Start the chat.</p>
          ) : (
            messages.map((item) => (
              <article key={item.id} className="chat-message">
                <div className="feed-meta">
                  <strong>{item.username || item.studentId}</strong>
                  <span>Upvotes: {item.upvotes ?? 0}</span>
                </div>
                <p>{item.message}</p>
                <button type="button" className="secondary-button" onClick={() => handleUpvote(item.id)}>
                  Upvote
                </button>
              </article>
            ))
          )}
        </div>

        <form className="chat-form" onSubmit={handleSend}>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows="3"
            placeholder="Share your thoughts about a book..."
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSending}>
            {isSending ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
    </main>
  )
}
