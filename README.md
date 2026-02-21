# Odablock Kick Chat Giveaway

A real-time giveaway tool for the [Odablock](https://kick.com/odablock) Kick channel. Viewers enter by typing a keyword in chat, and the streamer picks a winner with a slot-machine-style spinner.

## Features

- **Kick OAuth** — Login via Kick to authenticate as a channel moderator/owner.
- **Keyword-based entry** — Set a keyword; viewers who type it in chat are automatically added as entrants.
- **Real-time updates** — Server-Sent Events (SSE) push entrant additions, winner picks, and confirmations to the dashboard instantly.
- **Slot-machine spinner** — Animated name spinner builds suspense before revealing the winner.
- **Winner confirmation** — Winners have 60 seconds to type in chat to confirm; times out with an option to re-roll.
- **Winner history** — All confirmed winners are stored in SQLite and displayed on the dashboard.
- **Subscriber badges** — Subscribers are visually distinguished in the entrant list.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with Tailwind CSS
- **better-sqlite3** for local winner persistence
- **Kick API** (OAuth + chat webhooks)

## Getting Started

### Prerequisites

- Node.js 18+
- A Kick application with OAuth credentials

### Environment Variables

Create a `.env` file in the project root:

```
KICK_CLIENT_ID=<your kick app client id>
KICK_CLIENT_SECRET=<your kick app client secret>
KICK_TARGET_CHANNEL=<kick channel slug>
ALLOWED_USERNAMES=<comma-separated list of allowed dashboard users>
SESSION_SECRET=<random 32+ char secret for session cookies>
BASE_URL=<public url of the app, e.g. https://example.com>
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with Kick.

### Production

```bash
npm run build
npm start
```

## How It Works

1. An authorized user logs in via Kick OAuth.
2. They enter a keyword and start a giveaway.
3. A Kick webhook listens for chat messages matching the keyword and registers entrants.
4. The streamer clicks **Roll Winner** — a spinner animates through entrant names and lands on the chosen winner.
5. The winner must type in chat within 60 seconds to confirm. If they don't, the streamer can re-roll.
6. Confirmed winners are saved to the SQLite database and shown in the history panel.
