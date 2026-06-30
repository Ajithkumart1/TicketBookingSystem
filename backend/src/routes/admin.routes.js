const express = require('express');
const router = express.Router();

const {
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/event.controller');

const {
  bulkCreateSeats,
  getSeatsAdmin,
} = require('../controllers/seat.controller');

const {
  getDashboard,
  getAllBookings,
  cancelBooking,
  getAllTransactions,
} = require('../controllers/admin.controller');

const { protect, adminOnly } = require('../middleware/auth.middleware');

// All admin routes protected
router.use(protect, adminOnly);

// ── Dashboard ──
router.get('/dashboard', getDashboard);

// ── Event management ──
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// ── Seat management ──
router.post('/events/:id/seats', bulkCreateSeats);
router.get('/events/:id/seats', getSeatsAdmin);

// ── Booking management ──
router.get('/bookings', getAllBookings);
router.post('/bookings/:id/cancel', cancelBooking);

// ── Transaction monitoring ──
router.get('/transactions', getAllTransactions);

module.exports = router;