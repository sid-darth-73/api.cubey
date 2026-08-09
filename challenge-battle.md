# ⚔️ Challenge-Battle Feature

> **Status:** Implemented  
> **Affects:** `api.cubey` (backend) · `cubey` (frontend)

---

## Table of Contents

1. [Overview](#overview)
2. [Technologies Used](#technologies-used)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Socket.IO Event Catalog](#socketio-event-catalog)
7. [Frontend Architecture](#frontend-architecture)
8. [State Machines](#state-machines)
9. [End-to-End Flow](#end-to-end-flow)
10. [Implementation Decisions](#implementation-decisions)
11. [Files Changed](#files-changed)

---

## Overview

The Challenge-Battle feature lets any two logged-in users compete against each other in a real-time speedcubing race. One user sends a challenge to another via their public profile; the recipient gets a live popup with a countdown to accept or decline. On acceptance, both users are placed in a shared battle room where they solve the same scramble, submit their times, and are shown a winner screen.

---

## Technologies Used

### Backend (`api.cubey`)

| Technology | Role |
|---|---|
| **Express 5** | HTTP REST API framework |
| **MongoDB + Mongoose** | Persistent storage for challenges and rooms |
| **Socket.IO** | Real-time bidirectional events (challenge popup, battle sync) |
| **JWT (`jsonwebtoken`)** | Socket authentication (same token as REST API) |
| **`scrambow`** | Server-side puzzle scramble generation |
| **Node.js `http`** | Native HTTP server wrapping Express so Socket.IO shares the same port |

### Frontend (`cubey`)

| Technology | Role |
|---|---|
| **React 19** | UI framework |
| **React Router v7** | Routing — adds `/battle/:roomId` route |
| **`socket.io-client`** | WebSocket connection to backend |
| **React Context API** | Global socket state (`SocketContext`) shared across all pages |
| **Tailwind CSS v4** | Styling (matches existing design system) |
| **`lucide-react`** | Icons (`Swords`, `Clock`, `Trophy`, etc.) |
| **`axios`** | REST API calls (reuses existing configured instance) |

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   cubey (Frontend)              │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │           SocketProvider (Context)        │  │
│  │  • Connects Socket.IO on login            │  │
│  │  • Holds incomingChallenge state          │  │
│  │  • Holds pendingBattleRoom state          │  │
│  │  • Reacts to user:loggedin/loggedout      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌────────────────┐   ┌──────────────────────┐ │
│  │ ChallengePopup │   │    BattleRoom page    │ │
│  │ (global modal) │   │  /battle/:roomId      │ │
│  └────────────────┘   └──────────────────────┘ │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │          PublicProfile page              │  │
│  │  • Challenge button → POST /battles/     │  │
│  │    challenge                             │  │
│  └──────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────┘
               │  REST + WebSocket (same port)
               ▼
┌─────────────────────────────────────────────────┐
│               api.cubey (Backend)               │
│                                                 │
│  ┌─────────────────┐   ┌─────────────────────┐ │
│  │  Express Routes │   │    Socket.IO Server  │ │
│  │  /battles/*     │   │                     │ │
│  └────────┬────────┘   └──────────┬──────────┘ │
│           │                       │             │
│  ┌────────▼───────────────────────▼──────────┐ │
│  │            battleController.js            │ │
│  │  • sendChallenge      • markReady         │ │
│  │  • respondToChallenge • submitSolve       │ │
│  │  • getPendingChallenge • getRoomState     │ │
│  │  • getBattleHistory                       │ │
│  └────────────────────┬──────────────────────┘ │
│                       │                         │
│  ┌────────────────────▼──────────────────────┐ │
│  │               MongoDB                     │ │
│  │  BattleChallenge  ·  BattleRoom           │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Key Architectural Decision: Shared HTTP Server

Socket.IO attaches to the same Node.js `http.Server` that serves Express. One port handles both REST and WebSocket connections.

```js
// server.js
const httpServer = createServer(app);  // wrap Express
setupSocket(httpServer);               // attach Socket.IO
httpServer.listen(PORT);               // one port for both
```

---

## Database Design

### `BattleChallenge`

Tracks the lifecycle of a challenge invitation between two users.

```
BattleChallenge
├── challengerId    ObjectId → Users    (who sent it)
├── challengeeId    ObjectId → Users    (who received it)
├── puzzleType      String              enum: 2x2 | 3x3 | ... | BLD
├── status          String              enum: pending | accepted | rejected | expired | cancelled
├── expiresAt       Date                default: now + 60 seconds
└── createdAt       Date
```

**Indexes:**
- `{ expiresAt: 1 }` with `expireAfterSeconds: 300` — MongoDB TTL index auto-deletes stale documents 5 minutes after expiry.

---

### `BattleRoom`

Tracks the live battle state from room creation through to winner declaration.

```
BattleRoom
├── challengeId     ObjectId → BattleChallenge
├── players         [ObjectId]  always 2: [challengerId, challengeeId]
├── scramble        String      server-generated, same for both players
├── puzzleType      String
├── status          String      enum: waiting | in_progress | completed | abandoned
├── readyPlayers    [ObjectId]  grows 0 → 1 → 2 as players click "Ready"
├── startedAt       Date        set when both are ready
├── results         [SolveResult]
│   ├── userId          ObjectId
│   ├── timeMs          Number      raw milliseconds from client
│   ├── penalty         String      '' | '+2' | 'DNF'
│   ├── effectiveTime   Number      DNF=Infinity, +2=timeMs+2000, else=timeMs
│   └── submittedAt     Date
├── winnerId        ObjectId | null
├── isDraw          Boolean
├── createdAt       Date
└── completedAt     Date
```

---

## API Design

All routes are prefixed `/battles` and require `Authorization: Bearer <token>`.

---

### `POST /battles/challenge`
Send a challenge to another user.

**Request body:**
```json
{ "challengeeId": "<userId>", "puzzleType": "3x3" }
```

**Logic:**
1. Validate challengee exists and is not the caller
2. Check no live `pending` challenge exists between these two users
3. Create `BattleChallenge` with 60-second expiry
4. Emit `challenge:incoming` to `user:<challengeeId>` socket room

| Status | Body |
|---|---|
| `201` | `{ challengeId, expiresAt }` |
| `400` | User not found / self-challenge |
| `409` | Pending challenge already exists |

---

### `GET /battles/pending`
Fallback for reconnects — returns the oldest active incoming challenge for the caller.

**Response:**
```json
{
  "challengeId": "...",
  "challenger": { "id": "...", "email": "...", "shareLink": "..." },
  "puzzleType": "3x3",
  "expiresAt": "2026-08-08T..."
}
```

---

### `POST /battles/:challengeId/respond`
Accept or reject a challenge (challengee only).

**Request body:** `{ "accept": true | false }`

**On accept:**
1. Set challenge `status = 'accepted'`
2. Generate scramble server-side via `generateScramble()`
3. Create `BattleRoom` with `status = 'waiting'`
4. Emit `battle:room_created` to both players

**On reject:**
1. Set `status = 'rejected'`
2. Emit `challenge:rejected` to challenger

| Status | Body |
|---|---|
| `200` | `{ battleRoomId }` (accept) |
| `200` | `{ message: "Challenge rejected" }` (reject) |
| `403` | Not the challengee |
| `410` | Challenge already resolved or expired |

---

### `POST /battles/:roomId/ready`
Mark yourself as ready. Battle starts when both players mark ready.

- Adds caller to `readyPlayers`
- Emits `battle:opponent_ready` to the battle room
- When `readyPlayers.length === 2`: sets `status = 'in_progress'`, records `startedAt`, emits `battle:start`

---

### `POST /battles/:roomId/submit`
Submit your solve time.

**Request body:** `{ "timeMs": 12450, "penalty": "+2" }`

**Logic:**
1. Validate: room is `in_progress`, caller is a player, hasn't already submitted
2. Anti-cheat: reject `timeMs < 300` (physically impossible)
3. Compute `effectiveTime`: DNF → `Infinity`, +2 → `timeMs + 2000`, else → `timeMs`
4. Emit `battle:opponent_submitted` (no time revealed yet)
5. If both submitted: determine winner, emit `battle:result` with full payload

---

### `GET /battles/room/:roomId`
Fetch full room state for reconnect recovery.

---

### `GET /battles/history?page=1&limit=20`
Paginated list of completed/abandoned battles for the caller.

---

## Socket.IO Event Catalog

### Authentication

Every socket connection is authenticated via JWT:

```js
// Client sends token on connect:
io(BACKEND_URL, { auth: { token } })

// Server verifies in middleware, then joins personal room:
socket.join(`user:${userId}`);
```

### Rooms

| Room name | Members | Purpose |
|---|---|---|
| `user:<userId>` | 1 socket | Personal room — challenges and notifications |
| `battle:<roomId>` | 2 sockets | Shared battle room — in-game events |

---

### Server → Client Events

| Event | Target | Payload | Trigger |
|---|---|---|---|
| `challenge:incoming` | `user:<challengeeId>` | `{ challengeId, challenger, puzzleType, expiresAt }` | Challenge sent |
| `challenge:rejected` | `user:<challengerId>` | `{ challengeId }` | Challenge declined |
| `battle:room_created` | `user:<A>` + `user:<B>` | `{ roomId, scramble, puzzleType, players }` | Challenge accepted |
| `battle:opponent_ready` | `battle:<roomId>` | `{ userId }` | Player marks ready |
| `battle:start` | `battle:<roomId>` | `{ startedAt }` | Both players ready |
| `battle:opponent_submitted` | `battle:<roomId>` | `{ userId }` | One player submits (time hidden) |
| `battle:result` | `battle:<roomId>` | `{ winnerId, isDraw, forfeitedBy, results[] }` | Both submitted or forfeit |

### Client → Server Events

| Event | Payload | Purpose |
|---|---|---|
| `battle:join_room` | `roomId` | Join socket room on page load / reconnect |
| `battle:forfeit` | `{ roomId }` | Concede — opponent wins immediately |

---

## Frontend Architecture

### Component Tree

```
App.jsx
└── BrowserRouter
    └── SocketProvider          ← global socket + challenge + room state
        ├── ChallengePopup      ← always mounted, visible when incomingChallenge != null
        └── Routes
            ├── /signin         → Signin.jsx
            ├── /signup         → Signup.jsx
            ├── /:shareLink     → PublicProfile.jsx  (challenge button lives here)
            ├── /battle/:roomId → BattleRoom.jsx     (full-screen, outside dashboard)
            └── /dashboard      → DashboardLayout
                ├── /timer
                ├── /solves
                └── ...
```

---

### `SocketContext` — The Core

Token is tracked as React state so the socket effect is reactive:

```js
const [token, setToken] = useState(() => localStorage.getItem('token'));

useEffect(() => {
  if (!token) return;
  const socket = io(BACKEND_URL, { auth: { token } });

  // ALL listeners registered here — guaranteed timing
  socket.on('challenge:incoming', ...)
  socket.on('battle:room_created', ...)
  ...
}, [token]);
```

Login/Logout signals are custom DOM events (localStorage is not reactive in the same tab):

```js
// After login:
window.dispatchEvent(new Event('user:loggedin'));

// After logout:
window.dispatchEvent(new Event('user:loggedout'));
```

---

### `ChallengePopup`

Always mounted in `App.jsx`. Returns `null` when there is no incoming challenge, but React still runs its hooks so it can listen for events at all times.

Navigation for both players is driven by `pendingBattleRoom` state (set in context):

```js
useEffect(() => {
  if (!pendingBattleRoom) return;
  clearPendingBattleRoom();
  navigate(`/battle/${pendingBattleRoom}`); // both challenger AND challengee
}, [pendingBattleRoom]);
```

---

### `BattleRoom` — Phase Machine

| Phase | UI |
|---|---|
| `loading` | Spinner while fetching room from API |
| `waiting_ready` | Scramble display + "I'm Ready" button + opponent status indicators |
| `countdown` | 3-2-1 animated countdown |
| `solving` | Full-screen tappable live timer |
| `waiting_opponent` | Your time + penalty picker (`OK` / `+2` / `DNF`) + Submit button |
| `result` | Winner banner + both times side-by-side |

Timer uses the server-provided `startedAt` timestamp as the reference point so both clients measure the same elapsed time regardless of network latency:

```js
startTimestampRef.current = new Date(startedAt).getTime();
setInterval(() => setTimerMs(Date.now() - startTimestampRef.current), 10);
```

---

## State Machines

### `BattleChallenge`

```
         ┌─────────────────────────────────┐
         │            pending              │
         └──┬───────────────┬─────────────┘
            │               │             │
        [accept]        [reject]    [TTL expires]
            │               │             │
            ▼               ▼             ▼
        accepted         rejected       expired
```

### `BattleRoom`

```
         ┌───────────────────────────────┐
         │           waiting             │
         └──────────────┬────────────────┘
                        │ both readyPlayers
                        ▼
         ┌───────────────────────────────┐
         │          in_progress          │
         └──┬────────────────────────────┘
            │                    │
      both submitted          forfeit /
            │                disconnect
            ▼                    ▼
         completed           abandoned
```

---

## End-to-End Flow

```
User A                         Server                        User B
  │                               │                              │
  │  Visit User B's public        │                              │
  │  profile, click Challenge     │                              │
  │──POST /battles/challenge─────►│                              │
  │                               │──── challenge:incoming ─────►│
  │◄──{ challengeId }─────────────│                    popup appears
  │                               │                              │
  │                               │      User B clicks Accept    │
  │                               │◄─POST /battles/:id/respond───│
  │                               │  1. status = 'accepted'      │
  │                               │  2. scramble generated       │
  │                               │  3. BattleRoom created       │
  │◄─── battle:room_created ──────│──── battle:room_created ────►│
  │  navigate /battle/:id         │         navigate /battle/:id │
  │                               │                              │
  │──POST /battles/:id/ready─────►│◄──POST /battles/:id/ready────│
  │                               │                              │
  │◄──────── battle:start ────────│──────── battle:start ───────►│
  │  timer starts                 │                 timer starts │
  │                               │                              │
  │  [solves, taps stop]          │                              │
  │──POST /battles/:id/submit────►│                              │
  │                               │──battle:opponent_submitted──►│
  │                               │◄──POST /battles/:id/submit───│
  │                               │  winner determined           │
  │◄──────── battle:result ───────│──────── battle:result ──────►│
  │  result screen                │               result screen  │
```

---

## Implementation Decisions

### 1. Scramble is server-authoritative
Generated on the server using `scrambow`, stored in `BattleRoom`, and pushed to clients via `battle:room_created`. Clients cannot provide their own scramble — guarantees both players solve the exact same sequence.

### 2. Timer is client-side; winner determined server-side
Real solve time cannot be measured over the network. Clients time locally, submit milliseconds. The server computes `effectiveTime`, compares results, and declares a winner — clients cannot manipulate the outcome.

### 3. Opponent's time hidden until both submit
`battle:opponent_submitted` reveals only that the opponent finished, not their time. Full results are broadcast simultaneously in `battle:result` once both have submitted, preventing psychological influence on the second solver.

### 4. All socket listeners registered at socket creation
Rather than attaching listeners in child components (which mount asynchronously and can miss events), all listeners are registered inside the single `useEffect` that creates the socket in `SocketContext`. This eliminates race conditions.

### 5. `pendingBattleRoom` bridges socket events → React navigation
`useNavigate` (React Router) cannot be called directly inside socket callbacks. Instead, `battle:room_created` sets `pendingBattleRoom` state in `SocketContext`. `ChallengePopup` (always mounted) watches this state and calls `navigate()` reactively. Works for both players.

### 6. Custom DOM events for login/logout signalling
`localStorage` changes don't trigger React re-renders in the same tab. After login/logout, `window.dispatchEvent(new Event('user:loggedin'))` fires. `SocketContext` listens and updates its `token` state, which triggers the socket connection effect.

---

## Files Changed

### Backend (`api.cubey`)

| File | Type | Description |
|---|---|---|
| `models/BattleChallenge.js` | **New** | Challenge schema with 60s expiry + MongoDB TTL index |
| `models/BattleRoom.js` | **New** | Battle room schema with nested solve results |
| `socket.js` | **New** | Socket.IO setup, JWT auth middleware, forfeit handler, `getIO()` singleton |
| `controllers/battleController.js` | **New** | All 7 route handlers with socket emit calls |
| `routes/battleRoutes.js` | **New** | `/battles/*` route definitions |
| `controllers/pbController.js` | **Modified** | Added `userId` field to public profile API response |
| `server.js` | **Modified** | Wrap Express in `http.createServer`, call `setupSocket()`, register `/battles` routes |

### Frontend (`cubey`)

| File | Type | Description |
|---|---|---|
| `src/context/SocketContext.jsx` | **New** | Global socket connection, all event listeners, challenge + room state |
| `src/components/ChallengePopup.jsx` | **New** | Floating challenge modal with countdown bar, accept/decline |
| `src/pages/dashboard/BattleRoom.jsx` | **New** | Full battle room with 6-phase state machine and live timer |
| `src/App.jsx` | **Modified** | Wrap with `SocketProvider`, add `/battle/:roomId` route, render `ChallengePopup` globally |
| `src/pages/PublicProfile.jsx` | **Modified** | Challenge button + consume `userId` from API |
| `src/pages/Signin.jsx` | **Modified** | Dispatch `user:loggedin` event after successful login |
| `src/pages/Signup.jsx` | **Modified** | Dispatch `user:loggedin` event after successful signup |
| `src/components/DashboardLayout.jsx` | **Modified** | Dispatch `user:loggedout` event on logout |
