# 🧩 Cubey API (Backend Engine)

The official backend API and real-time engine for **Cubey** — a full-featured speedcubing platform. Built with **Node.js**, **Express 5**, **MongoDB**, and **Socket.IO**, this service powers user authentication (Email/Password & Google OAuth), solve persistence, stat tracking, algorithm learning progress, public personal best (PB) profiles, email password recovery, server-side scramble generation, and real-time 1v1 speedcubing battles.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Reference](#-api-reference)
  - [Authentication & OAuth](#authentication--oauth)
  - [Password Reset](#password-reset)
  - [Solves Management](#solves-management)
  - [Session Averages](#session-averages)
  - [Scramble Generator](#scramble-generator)
  - [Algorithm Learning](#algorithm-learning)
  - [Public Profile & PBs](#public-profile--pbs)
  - [1v1 Battle System](#1v1-battle-system)
- [⚡ Real-Time Socket.IO Catalog](#-real-time-socketio-catalog)
- [📂 Directory Structure](#-directory-structure)
- [🛡️ Security & Rate Limiting](#️-security--rate-limiting)

---

## ✨ Features

- 🔐 **Flexible Authentication**: JWT-based session security alongside Native Email/Password signup and Google OAuth 2.0 integration via Passport.js.
- ⚡ **Real-Time 1v1 Speedcubing Battles**: Live matchmaking challenge popups, synchronized room countdowns, simultaneous solve timing, winner determination, and forfeit handling powered by Socket.IO.
- ⏱️ **Solve & Session Tracking**: Save, update, batch-import, and manage individual solve records with penalty flags (`+2`, `DNF`).
- 📊 **Stat & Average Calculation**: Track historical session metrics including `ao5`, `ao12`, `ao50`, and `ao100`.
- 🎲 **Server-Side Scramble Generation**: Generate official WCA-style Rubik's cube scrambles using `scrambow`.
- 🎓 **Algorithm Learning Progress**: Monitor individual best times and mastery across CFOP/algorithm learning modules.
- 🔗 **Public Shareable Profiles**: Share personal bests (PBs) via unique, privacy-focused shareable profile links.
- 📧 **Secure Password Recovery**: Verification OTP code delivery via Resend email service.

---

## 🛠 Tech Stack

- **Runtime Environment**: [Node.js](https://nodejs.org/) (ES Modules)
- **Web Framework**: [Express 5](https://expressjs.com/)
- **Database & ORM**: [MongoDB](https://www.mongodb.com/) with [Mongoose 8](https://mongoosejs.com/)
- **Real-Time Communication**: [Socket.IO 4](https://socket.io/)
- **Authentication**: `jsonwebtoken` (JWT), `passport`, `passport-google-oauth20`, `bcrypt`
- **Email Service**: [Resend](https://resend.com/)
- **Puzzle Tools**: `scrambow` (3x3 scramble generation)
- **Security & Utilities**: `express-rate-limit`, `nanoid`, `cors`, `dotenv`

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: A running local MongoDB instance or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

### Installation

1. **Clone the repository** (or navigate to the backend root directory):
   ```bash
   git clone <repository-url>
   cd api.cubey
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory of the backend project and configure the required environment variables:

```env
PORT=3002
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database_name>
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Resend API Key (for password reset emails)
RESEND_API_KEY=re_your_resend_api_key

# Application Base URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3002
```

### Running the Application

- **Start in development / production mode**:
  ```bash
  node server.js
  ```
  *(The server will listen on port `3002` or the custom `PORT` specified in `.env`)*

---

## 📡 API Reference

### Authentication & OAuth

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user account (returns JWT token & share link) | No |
| `POST` | `/auth/signin` | Authenticate user with credentials (returns JWT token & share link) | No |
| `GET` | `/auth/google` | Initiate Google OAuth 2.0 authentication flow | No |
| `GET` | `/auth/google/callback` | Google OAuth callback handler (redirects to frontend with token) | No |
| `GET` | `/dashboard` | Protected route check | Yes |

### Password Reset

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/reset` | Request a 6-digit password reset OTP sent via email | No |
| `POST` | `/auth/reset/verify` | Verify the 6-digit OTP code | No |
| `POST` | `/auth/reset/change` | Reset password using the verified reset token | No |

### Solves Management

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/solves` | Fetch all solve records for the authenticated user | Yes |
| `POST` | `/solves` | Record a new single solve | Yes |
| `POST` | `/solves/batch` | Save multiple solve records at once | Yes |
| `POST` | `/solves/reset` | Clear / reset current solve session | Yes |
| `PATCH` | `/solves/:id` | Update solve details (penalties, notes, time) | Yes |
| `DELETE` | `/solves/:id` | Delete a specific solve record | Yes |

### Session Averages

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/averages` | Get historic average records (`ao5`, `ao12`, etc.) | Yes |
| `POST` | `/averages` | Save a calculated session average | Yes |
| `DELETE` | `/averages/:id` | Delete an average record | Yes |

### Scramble Generator

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/scrambles/generate` | Generate a 3x3 Rubik's cube scramble string | No |

### Algorithm Learning

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/learn/all` | Fetch best execution times for all algorithm modules | Yes |
| `GET` | `/learn/:algoId` | Fetch best time for a specific algorithm ID | Yes |
| `POST` | `/learn/update` | Record/update personal best time for an algorithm | Yes |
| `DELETE` | `/learn/reset/:algoId` | Reset progress for a specific algorithm | Yes |

### Public Profile & PBs

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/pb/:shareLink` | Fetch public Personal Bests & stats via unique `shareLink` | No |

### 1v1 Battle System

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/battles/challenge` | Send a 1v1 battle invite using opponent's share link | Yes |
| `GET` | `/battles/pending` | Check for active incoming/pending challenges | Yes |
| `POST` | `/battles/:challengeId/respond` | Accept or decline a battle challenge | Yes |
| `GET` | `/battles/room/:roomId` | Get real-time state and scramble for a battle room | Yes |
| `POST` | `/battles/:roomId/ready` | Toggle ready status in the battle room | Yes |
| `POST` | `/battles/:roomId/submit` | Submit solve result for the battle | Yes |
| `GET` | `/battles/history` | Retrieve past battle history and match results | Yes |

---

## ⚡ Real-Time Socket.IO Catalog

Socket.IO authentication requires passing the user's JWT token in the handshake:
```javascript
const socket = io(BACKEND_URL, {
  auth: { token: "<JWT_TOKEN>" }
});
```

### Connection & Rooms
- Upon authentication, every socket automatically joins a private user channel: `user:<userId>`.
- Client joins a battle room by emitting `battle:join_room`:
  ```javascript
  socket.emit('battle:join_room', roomId);
  ```

### Emitted Events (Server ➔ Client)
- `challenge:incoming`: Triggered when an opponent challenges the user to a 1v1 battle.
- `challenge:accepted`: Sent when a challenge is accepted; includes `roomId`.
- `challenge:declined`: Sent when a challenge is declined by the opponent.
- `challenge:expired`: Sent when a challenge times out.
- `battle:status_change`: Emitted when player ready state changes or the battle countdown starts.
- `battle:result`: Emitted when both players complete their solves or a forfeit occurs. Includes winner ID, results, and draw status.

### Received Events (Client ➔ Server)
- `battle:join_room`: Joins room `battle:<roomId>`.
- `battle:forfeit`: Forfeits the ongoing match immediately.
  ```javascript
  socket.emit('battle:forfeit', { roomId });
  ```

---

## 📂 Directory Structure

```
api.cubey/
├── config/                  # Configuration helpers
├── controllers/             # Express route controllers
│   ├── authController.js
│   ├── averageController.js
│   ├── battleController.js
│   ├── learnController.js
│   ├── pbController.js
│   ├── resetController.js
│   └── solveController.js
├── middleware/              # Express middlewares (JWT auth, rate limiting)
│   └── authMiddleware.js
├── models/                  # Mongoose MongoDB schemas
│   ├── AlgoTimeModel.js
│   ├── Averages.js
│   ├── BattleChallenge.js
│   ├── BattleRoom.js
│   ├── ResetPasswordModel.js
│   ├── Solves.js
│   └── Users.js
├── routes/                  # Express route definitions
│   ├── authRoutes.js
│   ├── averageRoutes.js
│   ├── battleRoutes.js
│   ├── learnRoutes.js
│   ├── pbRoutes.js
│   ├── resetRoutes.js
│   └── solveRoutes.js
├── services/                # Business logic & background helpers
│   ├── battleService.js
│   └── scramble-generator.js
├── passport-setup.js        # Passport Google OAuth 2.0 configuration
├── server.js                # Application entry point & Express HTTP server
├── socket.js                # Socket.IO connection handling & real-time events
├── package.json             # Node.js dependencies & metadata
└── .env                     # Environment variables configuration
```

---

## 🛡️ Security & Rate Limiting

- **Rate Limiting**: Configured with `express-rate-limit` to restrict requests to 100 requests per minute per IP window across all API routes to mitigate DDoS and brute-force attempts.
- **JWT Protection**: Protected routes and WebSocket connections require a valid Bearer JWT.
- **CORS**: Configured dynamically to allow origin access from the specified `FRONTEND_URL`.

---

## 📄 License

ISC License © Cubey Team
