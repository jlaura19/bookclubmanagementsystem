import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import api from '../services/api'
import AppHeader from '../components/AppHeader'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '📚']
const HOLD_MS = 450

function formatTime(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const currentUsername = localStorage.getItem('USIU_BOOKCLUB_USERNAME') || localStorage.getItem('USIU_BOOKCLUB_STUDENT_ID')
  const [pickerFor, setPickerFor] = useState(null)
  const holdTimerRef = useRef(null)
  const feedRef = useRef(null)
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
    const feed = feedRef.current
    if (feed) {
      feed.scrollTop = feed.scrollHeight
    }
  }, [messages.length])

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
      } catch {}
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

  const handleReact = async (messageId, emoji) => {
    setPickerFor(null)
    try {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: '/app/chat.react',
          body: JSON.stringify({ messageId, emoji }),
        })
        return
      }

      const response = await api.post(`/chat/${messageId}/react`, { emoji })
      mergeMessage(response.data)
    } catch {
      setError('Could not react to this message right now.')
    }
  }

  const startHold = (messageId) => {
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = setTimeout(() => setPickerFor(messageId), HOLD_MS)
  }

  const cancelHold = () => clearTimeout(holdTimerRef.current)

  useEffect(() => () => clearTimeout(holdTimerRef.current), [])

  return (
    <main className="page-shell">
      <AppHeader
        title="Book Club Chat"
        subtitle="Live chat with general and per-book threads. Press and hold a message to react."
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
            <span className={`status-dot ${isConnected ? 'online' : ''}`} />
            {isConnected ? 'Live connected' : 'Reconnecting...'} • {threadLabel}
          </p>
        </div>

        <div className="chat-feed" ref={feedRef} onClick={() => setPickerFor(null)}>
          {messages.length === 0 ? (
            <p className="muted-text">No messages yet. Start the chat.</p>
          ) : (
            messages.map((item) => {
              const author = item.username || item.studentId || '?'
              const isMine = author === currentUsername
              return (
                <article key={item.id} className={`chat-row ${isMine ? 'mine' : ''}`}>
                  {!isMine && <span className="chat-avatar">{author.charAt(0).toUpperCase()}</span>}
                  <div className="chat-bubble-wrap">
                    {!isMine && <span className="chat-author">{author}</span>}
                    <div
                      className="chat-bubble"
                      onPointerDown={() => startHold(item.id)}
                      onPointerUp={cancelHold}
                      onPointerLeave={cancelHold}
                      onPointerCancel={cancelHold}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setPickerFor(item.id)
                      }}
                    >
                      <p>{item.message}</p>
                      <time>{formatTime(item.createdAt)}</time>

                      {pickerFor === item.id && (
                        <div className="reaction-picker" onClick={(event) => event.stopPropagation()}>
                          {REACTIONS.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => handleReact(item.id, emoji)}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.reactions?.length > 0 && (
                      <div className="reaction-chips">
                        {item.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            type="button"
                            className={reaction.users.includes(currentUsername) ? 'chip active' : 'chip'}
                            title={reaction.users.join(', ')}
                            onClick={() => handleReact(item.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.users.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>

        <form className="chat-form" onSubmit={handleSend}>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend(event)
              }
            }}
            rows="2"
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
