import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

/**
 * Renders children for admin or personnel with the required sidebar_access key.
 * Use inside ProtectedRoute + Layout so that Layout does not remount when navigating to/from Settings.
 */
const AccountingGuard = ({ children, sidebarKey }) => {
  const { isAdmin, isPersonnel, user } = useAuth();
  if (isAdmin()) return children;
  if (isPersonnel()) {
    const access = user?.sidebar_access;
    const hasAccess =
      Array.isArray(access) && sidebarKey && access.includes(sidebarKey);
    if (hasAccess) return children;
    return <Navigate to="/personnel/dashboard" replace />;
  }
  return <Navigate to="/" replace />;
};

export default AccountingGuard;
