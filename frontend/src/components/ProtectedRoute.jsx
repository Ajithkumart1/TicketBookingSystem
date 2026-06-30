import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// For regular users
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

// For admin-only pages
export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/admin/login" replace />;

  return children;
};