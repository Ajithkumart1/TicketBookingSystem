import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function Wallet() {
  const { updateUserWallet } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const quickAmounts = [100, 500, 1000, 2000];

  const fetchWalletData = async (pageNum = 1) => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get(`/wallet/transactions?page=${pageNum}&limit=10`),
      ]);

      setBalance(balanceRes.data.data.balance);
      setTransactions(txRes.data.data.transactions);
      setPagination(txRes.data.data.pagination);
      updateUserWallet(balanceRes.data.data.balance);
    } catch (err) {
      toast.error('Failed to load wallet data');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);

    if (!value || value <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (value > 100000) {
      toast.error('Cannot add more than ₹1,00,000 at once');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/wallet/add', {
        amount: value,
        idempotencyKey: uuidv4(),
      });

      const newBalance = res.data.data.newBalance;
      setBalance(newBalance);
      updateUserWallet(newBalance);
      toast.success(res.data.message);
      setAmount('');
      fetchWalletData(1);
      setPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add money');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (paise) => `₹${(paise / 100).toFixed(2)}`;

  const typeColor = (type) => {
    if (type === 'credit') return 'badge-success';
    if (type === 'debit') return 'badge-danger';
    return 'badge-info'; // refund
  };

  const typeSign = (type) => (type === 'debit' ? '-' : '+');

  if (pageLoading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">Loading wallet...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>My Wallet</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>
          Manage your balance and view transaction history
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
          {/* Balance + Add Money Card */}
          <div className="card">
            <p style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>
              Current Balance
            </p>
            <h1 style={{ fontSize: 36, color: '#667eea', marginBottom: 24 }}>
              {formatAmount(balance)}
            </h1>

            <form onSubmit={handleAddMoney}>
              <div className="form-group">
                <label>Add Money (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {quickAmounts.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: '1px solid #ddd',
                      background: amount === amt.toString() ? '#667eea' : 'white',
                      color: amount === amt.toString() ? 'white' : '#444',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Money'}
              </button>
            </form>
          </div>

          {/* Transaction History Card */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Transaction History</h3>

            {transactions.length === 0 ? (
              <div className="empty-state">No transactions yet</div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id}>
                        <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td>{tx.description}</td>
                        <td>
                          <span className={`badge ${typeColor(tx.type)}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: tx.type === 'debit' ? '#e74c3c' : '#1abc6b',
                          }}
                        >
                          {typeSign(tx.type)}
                          {formatAmount(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pagination && pagination.pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '6px 16px' }}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: 14, color: '#666' }}>
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '6px 16px' }}
                      disabled={page >= pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}