// components/AdminRoute.jsx
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Preloader from './Preloader';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user, token } = useAuth();

  // Show preloader while loading or if token exists but user data hasn't loaded yet
  if (loading || (token && !user)) {
    return <Preloader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Redirect to dashboard if not admin
  if (!isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;

