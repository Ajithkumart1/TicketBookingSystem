require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const { startExpiryJob } = require('./src/jobs/reservationExpiry.job');

const app = express();

// Connect to DB
connectDB();

// Start cron job
startExpiryJob();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/auth',     require('./src/routes/auth.routes'));
app.use('/api/wallet',   require('./src/routes/wallet.routes'));
app.use('/api/events',   require('./src/routes/event.routes'));
app.use('/api/bookings', require('./src/routes/booking.routes'));
app.use('/api/admin',    require('./src/routes/admin.routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});