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
const { protect, adminOnly } = require('../middleware/auth.middleware');

// All admin routes — must be logged in AND be admin
router.use(protect, adminOnly);

// Event management
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// Seat management
router.post('/events/:id/seats', bulkCreateSeats);
router.get('/events/:id/seats', getSeatsAdmin);

module.exports = router;