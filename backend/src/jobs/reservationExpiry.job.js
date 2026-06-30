const cron = require('node-cron');
const Seat = require('../models/Seat');

// Runs every minute
// Finds all seats where:
//   status = 'reserved' AND reservationExpiry < now
// Resets them back to 'available'

const startExpiryJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const result = await Seat.updateMany(
        {
          status: 'reserved',
          reservationExpiry: { $lt: now },
        },
        {
          $set: {
            status: 'available',
            reservedBy: null,
            reservedAt: null,
            reservationExpiry: null,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[Cron] Released ${result.modifiedCount} expired reservation(s) at ${now.toISOString()}`
        );
      }
    } catch (error) {
      console.error('[Cron] Error releasing expired reservations:', error.message);
    }
  });

  console.log('[Cron] Reservation expiry job started — runs every minute');
};

module.exports = { startExpiryJob };