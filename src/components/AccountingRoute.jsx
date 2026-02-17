// components/AccountingRoute.jsx
// Allows Admin always, or Personnel when they have the required sidebar_access key.
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Preloader from "./Preloader";

const AccountingRoute = ({ children, sidebarKey }) => {
  const { isAuthenticated, isAdmin, isPersonnel, loading, user, token } =
    useAuth();

  if (loading || (token && !user)) {
    return <Preloader />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (isAdmin()) {
    return children;
  }

  if (isPersonnel()) {
    const access = user?.sidebar_access;
    const hasAccess =
      Array.isArray(access) && sidebarKey && access.includes(sidebarKey);
    if (hasAccess) return children;
    return <Navigate to="/personnel/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};

export default AccountingRoute;
