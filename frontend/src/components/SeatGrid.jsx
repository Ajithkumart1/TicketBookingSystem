export default function SeatGrid({ seats, selectedSeats, onToggleSeat, currentUserId }) {
  // Group seats by row letter (A, B, C...)
  const rows = {};
  seats.forEach((seat) => {
    const row = seat.seatNumber[0];
    if (!rows[row]) rows[row] = [];
    rows[row].push(seat);
  });

  const getSeatClass = (seat) => {
    const isSelected = selectedSeats.includes(seat._id);
    if (isSelected) return 'seat seat-selected';
    if (seat.status === 'booked') return 'seat seat-booked';
    if (seat.status === 'reserved') return 'seat seat-reserved';
    return 'seat seat-available';
  };

  const isClickable = (seat) => seat.status === 'available';

  return (
    <div>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div
          style={{
            background: '#ddd',
            padding: '8px 0',
            borderRadius: 8,
            fontSize: 12,
            color: '#666',
            letterSpacing: 2,
          }}
        >
          STAGE / SCREEN
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {Object.keys(rows)
          .sort()
          .map((rowLetter) => (
            <div key={rowLetter} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 20, fontSize: 12, color: '#888', fontWeight: 600 }}>
                {rowLetter}
              </span>
              {rows[rowLetter]
                .sort((a, b) => {
                  const numA = parseInt(a.seatNumber.slice(1));
                  const numB = parseInt(b.seatNumber.slice(1));
                  return numA - numB;
                })
                .map((seat) => (
                  <button
                    key={seat._id}
                    type="button"
                    className={getSeatClass(seat)}
                    disabled={!isClickable(seat)}
                    onClick={() => isClickable(seat) && onToggleSeat(seat._id)}
                    title={`${seat.seatNumber} - ${seat.status}`}
                  >
                    {seat.seatNumber.slice(1)}
                  </button>
                ))}
            </div>
          ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
        <Legend color="#e6f9ee" border="#1abc6b" label="Available" />
        <Legend color="#667eea" border="#667eea" label="Selected" textWhite />
        <Legend color="#fff8e1" border="#f39c12" label="Reserved" />
        <Legend color="#fde8e8" border="#e74c3c" label="Booked" />
      </div>

      <style>{`
        .seat {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .seat-available {
          background: #e6f9ee;
          border-color: #1abc6b;
          color: #1abc6b;
        }
        .seat-available:hover {
          background: #1abc6b;
          color: white;
        }
        .seat-selected {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }
        .seat-reserved {
          background: #fff8e1;
          border-color: #f39c12;
          color: #f39c12;
          cursor: not-allowed;
        }
        .seat-booked {
          background: #fde8e8;
          border-color: #e74c3c;
          color: #e74c3c;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Legend({ color, border, label, textWhite }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: color,
          border: `1.5px solid ${border}`,
        }}
      />
      <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
    </div>
  );
}