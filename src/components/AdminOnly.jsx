import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

/**
 * Renders children only for admin. Redirects non-admin to admin dashboard.
 * Use inside ProtectedRoute + Layout so that Layout does not remount when navigating to/from Settings.
 */
const AdminOnly = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

export default AdminOnly;
