import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

/**
 * Renders children only for personnel. Redirects non-personnel (e.g. admin) to their dashboard.
 * Use for Profile and other personnel-only pages.
 */
const PersonnelOnly = ({ children }) => {
  const { isPersonnel, isAdmin } = useAuth();
  if (!isPersonnel()) {
    if (isAdmin()) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/personnel/dashboard" replace />;
  }
  return children;
};

export default PersonnelOnly;
