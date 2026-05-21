# CGOEConnect

A community platform for Stanford CGOE, HCP, and MS students to connect around classes, share resources, and collaborate.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 8 |
| Backend | Node.js, Express 4, JWT auth |
| Database | PostgreSQL (Neon) |
| File storage | Cloudinary (images) |

## Features

### Home feed
- Post text, images, and polls to the community feed
- Upvote, save, comment on, and flag posts
- Posts filtered to enrolled classes plus general posts
- Moderators can pin posts to the top of the feed

### Subchats
- Class-based discussion threads with public or private access
- Join requests with mod approval for private subchats
- Polls, image attachments, schedulers, reactions, and helpful votes on messages
- Moderators can pin subchats to the top of the sidebar

### Class hubs
- Per-class landing page with announcements, reviews, resources, and subchats
- Enroll/unenroll from classes; class catalog filtered by program
- 1–5 star reviews with helpful votes

### Profiles
- Bio, program, student status, modality tags, identity tags, timezone
- Saved posts and saved messages

### Notifications
- In-app notifications for upvotes, comments, helpful votes, and new messages

### Moderation dashboard *(moderators and admins)*
- View all users — suspend (72 h) or permanently ban accounts
- Banned email addresses are blocked from re-registration
- View and triage community feedback (open / in progress / resolved / rejected)
- Manage flagged content (posts, messages, comments, reviews)
- Add and remove classes from the catalog

### Community guidelines
- Displayed in the home feed sidebar
- Enforcement notice covering suspension and ban policy

### Feedback
- Collapsible feedback form on the home page (bug, feature request, general)

## Prerequisites

- **Node.js** 18+
- **npm**
- PostgreSQL database (Neon recommended)
- Cloudinary account (for image uploads)

## Environment variables

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
PORT=3001
```

Create a `.env` (or `.env.local`) file in the project root for Vite:

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## Run locally

Install dependencies and start both servers:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Apply database schema
node server/index.js  # or run schema manually:
# psql $DATABASE_URL -f server/db/schema.sql

# Start frontend (http://localhost:5173)
npm run dev

# Start backend (http://localhost:3001) — in a separate terminal
node server/index.js
```

The Vite dev server proxies all `/api/*` requests to the Express backend.

## Build

```bash
npm run build
npm run preview
```
