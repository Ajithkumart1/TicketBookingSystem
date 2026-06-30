# Ticket Booking + Wallet + Admin System

A full stack ticket booking platform with an integrated wallet system, built for the Tasski Full Stack Assessment.

## 🔗 Live Links

- **Frontend (Vercel)**: https://ticket-booking-system-liard.vercel.app
- **Backend API (Render)**: https://ticketbookingsystem-124e.onrender.com/api
- **GitHub Repo**: https://github.com/<your-username>/ticket-booking-system

> Note: Backend is hosted on Render's free tier, which sleeps after ~15 minutes of inactivity. The first request after idle may take 30-50 seconds to wake up — please wait rather than assume it's broken.

## 🔐 Test Credentials

**Admin**
Email: admin@tickets.com
Password: admin123456

**Regular User**
Sign up freely via the Sign Up page, or use:
Email: testuser@test.com
Password: password123

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React (Create React App), React Router
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Auth**: JWT (JSON Web Tokens)
- **Scheduled Jobs**: node-cron (reservation expiry, runs every minute)
- **Deployment**: Render (backend), Vercel (frontend)

## ⚙️ Setup Instructions (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB instance)

### Backend
```bash
cd backend
npm install
cp .env.example .env
```
Fill in `.env` with your values:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```
Then run:
```bash
npm run dev
```
Server starts on `http://localhost:5000`

### Seed the Admin User
```bash
node src/config/seedAdmin.js
```
Creates `admin@tickets.com / admin123456`

### Frontend
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```
Then run:
```bash
npm start
```
App opens on `http://localhost:3000`

## 📐 Architecture
React Frontend (Vercel)

│

▼ 

REST API calls (JWT Bearer token)
Express Backend (Render)

│

▼ 

Mongoose ODM
MongoDB Atlas

### Database Models

| Model | Purpose |
|---|---|
| **User** | Auth credentials + wallet balance (stored as integer paise) |
| **Transaction** | Immutable ledger of every credit/debit/refund |
| **Event** | Event metadata, price per seat (paise), total seats |
| **Seat** | Per-event seat with state machine: `available → reserved → booked` |
| **Booking** | Links user, event, seats; carries idempotency key |

## 🔑 Key Design Decisions

### 1. Money stored as integers (paise), never floats
All monetary values are stored as integer paise (₹1 = 100 paise) and only converted to rupees for display. This avoids JavaScript floating point errors (`0.1 + 0.2 !== 0.3`) that would be unacceptable in a financial system.

### 2. Concurrency — No Double Booking
Seat reservation relies on MongoDB's atomic `findOneAndUpdate` with a status guard condition:
```js
Seat.findOneAndUpdate(
  { _id: seatId, status: 'available' },
  { status: 'reserved', reservedBy: userId, ... }
)
```
MongoDB guarantees document-level atomicity, so when two requests race for the same seat, only one update can succeed — the other receives `null` and the API returns a clear "seat unavailable" error.

### 3. No Double Spending
Wallet debits use a conditional atomic update:
```js
User.findOneAndUpdate(
  { _id: userId, 'wallet.balance': { $gte: amount } },
  { $inc: { 'wallet.balance': -amount } }
)
```
If two simultaneous requests try to spend more than the available balance, MongoDB processes them sequentially at the document level — the first succeeds, the second sees an already-reduced balance and fails safely with an "insufficient balance" error.

### 4. Atomicity — Booking + Payment Together
Booking confirmation (seat lock → wallet debit → booking record → ledger entry) runs inside a single **MongoDB session transaction**. If any step fails — most commonly insufficient balance — the entire transaction aborts and rolls back. No partial state (e.g. money deducted but seat not booked) can ever be persisted.

### 5. Idempotency
Booking confirmation and wallet top-ups accept a client-generated `idempotencyKey` (UUID), enforced via a unique MongoDB index. If the same request is retried — due to a network timeout, double-click, or client retry logic — the original result is returned instead of being processed a second time.

### 6. Reservation Expiry (5 minutes)
Two layers of protection work together:
- A `node-cron` job runs every minute, finds `reserved` seats past their `reservationExpiry`, and releases them back to `available`.
- Every booking confirmation request independently re-validates expiry inline before opening a transaction — so even within the ~60 second window before the next cron tick, an expired reservation can never be confirmed.

### 7. Soft Deletes for Events
Events are never hard-deleted (`isActive: false` instead), preserving the integrity of historical bookings even after an event is "removed" from public listings.

## 🧪 Edge Cases Handled

| Edge Case | How It's Handled |
|---|---|
| Parallel booking requests for the same seat | Atomic `findOneAndUpdate` with status condition — only one request can win |
| Wallet race conditions (concurrent spends) | Atomic conditional `$inc` on balance with a `$gte` guard |
| Reservation expires mid-payment | Pre-flight expiry check runs inside `confirmBooking` before the transaction opens |
| Duplicate/retried API calls | Unique `idempotencyKey` index on both Booking and Transaction collections |
| Partial failures during booking | MongoDB session transaction — fully atomic, all-or-nothing commit |
| Insufficient wallet balance | Caught atomically at debit time; returns exact required vs. available amounts |
| Booking a past event | Blocked at the reservation step with an explicit date check |

## 📦 Assumptions Made

- Seats are auto-generated in a grid pattern (A1–A10, B1–B10, ...) when an admin clicks "Generate Seats" — there's no manual seat-numbering UI, as this wasn't specified in the assessment scope.
- Maximum 10 seats per booking and ₹1,00,000 per wallet top-up — reasonable guardrails not explicitly required by the spec.
- The "Transfer" wallet feature (listed as an optional bonus) was not implemented, to prioritize the core booking flow given the assessment timeline.
- Admin accounts are not self-registerable; a single admin is seeded via a one-time script (`seedAdmin.js`) for assessment purposes.
- Events cannot be created with a past date, and seats cannot be booked for events that have already occurred.
- Cancelled bookings release their seats back to `available` immediately rather than retaining a separate "cancelled seat" state, since the seat itself is unaffected by who held it.

## 📂 API Collection

A Postman collection is included at `/postman/TicketBooking.postman_collection.json`. Import it into Postman and the `baseUrl` collection variable is already pre-set to the live production backend — update it to `http://localhost:5000/api` if testing locally instead.

## 📋 Full API Reference
Auth
POST   /api/auth/register

POST   /api/auth/login

POST   /api/auth/admin/login

GET    /api/auth/me

Wallet

GET    /api/wallet/balance

POST   /api/wallet/add

GET    /api/wallet/transactions

Events (Public)

GET    /api/events

GET    /api/events/:id

Bookings

POST   /api/bookings/reserve

POST   /api/bookings/confirm

GET    /api/bookings/my

GET    /api/bookings/:id

Admin

GET    /api/admin/dashboard

POST   /api/admin/events

PUT    /api/admin/events/:id

DELETE /api/admin/events/:id

POST   /api/admin/events/:id/seats

GET    /api/admin/events/:id/seats

GET    /api/admin/bookings

POST   /api/admin/bookings/:id/cancel

GET    /api/admin/transactions

## 📜 License

Built for assessment purposes.
