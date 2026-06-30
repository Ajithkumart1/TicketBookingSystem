import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(isAdmin ? '/admin/login' : '/login');
  };

  const balanceFormatted = user?.wallet?.balance
    ? `₹${(user.wallet.balance / 100).toFixed(2)}`
    : '₹0.00';

  if (isAdmin) {
    return (
      <nav className="navbar">
        <Link to="/admin" className="logo">🎫 Admin Panel</Link>
        <div className="nav-links">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/events">Events</Link>
          <Link to="/admin/bookings">Bookings</Link>
          <Link to="/admin/transactions">Transactions</Link>
          <button className="btn btn-danger" style={{ width: 'auto', padding: '6px 16px' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">🎫 TicketBook</Link>
      <div className="nav-links">
        <Link to="/">Events</Link>
        <Link to="/bookings">My Bookings</Link>
        <Link to="/wallet" className="wallet-badge">💰 {balanceFormatted}</Link>
        <span style={{ fontSize: '14px', color: '#666' }}>Hi, {user?.name}</span>
        <button className="btn btn-danger" style={{ width: 'auto', padding: '6px 16px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}