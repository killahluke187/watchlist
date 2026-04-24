# watchlist

A shared watchlist: anyone with the link can add entries (username, name, reason, optional pasted screenshot). Admin page at `/admin` can edit/delete any entry. All data is stored server-side in a JSON file — no localStorage, no accounts.

Dark theme, sharp edges, grey outlines.

## Stack
- Backend: Node + Express + TypeScript (via `tsx`), JSON file storage
- Frontend: React + TypeScript + Vite + react-router

## Layout
```
watchlist/
  server/          express api
    src/index.ts
    data/entries.json   (created at runtime)
    uploads/            (pasted images, created at runtime)
  client/          react app
    src/pages/Home.tsx
    src/pages/Admin.tsx
```

## Setup

Install everything:

```
npm run install:all
```

## Development (two processes, hot reload)

```
npm run dev
```

- api: http://localhost:3001
- app: http://localhost:5173 (proxies `/api` and `/uploads` to the api)

Open http://localhost:5173 for the public page and http://localhost:5173/admin for the admin page.

## Production (one process serves both)

```
npm run build    # builds the client into client/dist
npm start        # server serves client/dist plus the api on PORT
```

Then open http://localhost:3001.

## Config
- `ADMIN_PASSWORD` env var sets the admin password. Default: `admin`. **Change this before exposing the site.**
- `PORT` env var sets the server port. Default: `3001`.

Example (Windows bash):
```
ADMIN_PASSWORD=hunter2 PORT=8080 npm start
```

## Notes
- Adding an entry requires `username`, `name`, and `reason`. Screenshot is optional.
- Screenshot input is a focusable paste zone — click it, then press Ctrl+V or right-click → paste. Images are capped at 8 MB.
- Data file: `server/data/entries.json`. Images: `server/uploads/`. Back up both if you care about the data.
