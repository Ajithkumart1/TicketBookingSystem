const express = require('express');
const router = express.Router();
const { getBalance, addMoney, getTransactions } = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');

// All wallet routes require login
router.use(protect);

router.get('/balance', getBalance);
router.post('/add', addMoney);
router.get('/transactions', getTransactions);

module.exports = router;