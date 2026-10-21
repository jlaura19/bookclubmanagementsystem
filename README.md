# Book Club Management System

A web app for a book club: find books online, keep a personal bookshelf, chat and react with the club, schedule meetings and manage your profile.

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** Spring Boot 3, Spring Data JPA, WebSocket (STOMP), H2 file database (`usiu.bookclub/`)

## Features

- **Dashboard:** current read spotlight with progress, discussions feed, upcoming meetings and a club voting carousel.
- **Online book search:** search the whole internet (Google Books) from the nav bar or the catalog, preview covers and details, then add a book to the catalog.
- **My Bookshelf:** its own page with Reading / To Read / Completed tabs.
- **Chat:** live general and per-book threads. Press and hold (or right-click) a message to react with emoji.
- **Meetings:** schedule a meeting, RSVP, and cancel meetings you organised.
- **Notifications:** a bell with an unread badge for new meetings, messages and reactions to your messages.
- **Profile and settings** (click your name in the nav):
  - profile picture (JPG, PNG, GIF or WebP, up to 2MB), display name and bio
  - favourite genres and a yearly reading goal with progress
  - appearance: Light (default), Dark or System, also togglable from the nav bar
  - notification preferences and a switch to hide other members' pictures
  - log out, and permanent account deletion (type your username to confirm)

## Running locally

Requirements: JDK 17+, Node.js 18+.

```powershell
# backend (http://localhost:8080)
cd usiu.bookclub
.\gradlew.bat bootRun

# frontend (http://localhost:5173), in a second terminal
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/ws` to the backend. Build the frontend with `npm run build`.

Sign-in is username only (no password), so use it for a trusted club or development, not as-is on the public internet.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `app.upload.dir` | `uploads/covers` | Where book covers and profile pictures (`avatars/`) are stored |
| Multipart limit | 5MB | Upload size cap (profile pictures are capped at 2MB) |

Data is stored in the H2 file database at `./data/bookclub`. Schema changes are applied automatically (`ddl-auto=update`).

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/signup`, `/signin`, `/logout`, `GET /api/auth/me` |
| Books | `/api/books`, `/api/books/mine` |
| Chat | `GET/POST /api/chat`, `POST /api/chat/{id}/react`, websocket `/app/chat.react` |
| Meetings | `GET/POST /api/meetings`, `POST /api/meetings/{id}/rsvp`, `DELETE /api/meetings/{id}` |
| Notifications | `GET /api/notifications` |
| Profile | `GET/PUT /api/profile`, `POST/DELETE /api/profile/avatar`, `DELETE /api/profile?confirm=<username>` |

## Notes

- Dashboard reading progress and vote tallies are stored in the browser (localStorage), not on the server.
- Online search uses the Google Books API without a key and can be rate limited.
