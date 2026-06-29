const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEventById,
} = require('../controllers/event.controller');

// Public routes — no auth needed
router.get('/', getAllEvents);
router.get('/:id', getEventById);

module.exports = router;