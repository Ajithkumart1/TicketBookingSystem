import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function TransactionDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchTransactions = async (pageNum = 1, type = '') => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: pageNum, limit: 15 });
      if (type) query.append('type', type);

      const res = await api.get(`/admin/transactions?${query}`);
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  const typeColor = (type) => {
    if (type === 'credit') return 'badge-success';
    if (type === 'debit') return 'badge-danger';
    return 'badge-info';
  };

  const formatAmount = (paise) => `₹${(paise / 100).toFixed(2)}`;

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>Wallet Transactions</h2>
        <p style={{ color: '#888', marginBottom: 16 }}>
          Monitor all wallet activity across the platform
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['', 'credit', 'debit', 'refund'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type);
                setPage(1);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid #ddd',
                background: typeFilter === type ? '#667eea' : 'white',
                color: typeFilter === type ? 'white' : '#444',
                cursor: 'pointer',
                fontSize: 13,
                textTransform: 'capitalize',
              }}
            >
              {type || 'All'}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen" style={{ height: 200 }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">No transactions found</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td>
                        {tx.userId?.name}
                        <br />
                        <span style={{ fontSize: 12, color: '#999' }}>{tx.userId?.email}</span>
                      </td>
                      <td>
                        <span className={`badge ${typeColor(tx.type)}`}>{tx.type}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{tx.description}</td>
                      <td
                        style={{
                          fontWeight: 600,
                          color: tx.type === 'debit' ? '#e74c3c' : '#1abc6b',
                        }}
                      >
                        {tx.type === 'debit' ? '-' : '+'}
                        {formatAmount(tx.amount)}
                      </td>
                      <td>{formatAmount(tx.balanceAfter)}</td>
                      <td style={{ fontSize: 13 }}>
                        {new Date(tx.createdAt).toLocaleString()}
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
    </>
  );
}