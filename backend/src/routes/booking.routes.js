const express = require('express');
const router = express.Router();
const {
  reserveSeats,
  confirmBooking,
  getMyBookings,
  getBookingById,
} = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth.middleware');

// All booking routes require login
router.use(protect);

router.post('/reserve', reserveSeats);
router.post('/confirm', confirmBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);

module.exports = router;