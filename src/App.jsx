import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/public/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import PersonnelDashboard from "./pages/staff_admin/Dashboard";
import AdminManagement from "./pages/admin/Admin/AdminManagement";
import Personnel from "./pages/admin/Personnel/PersonnelManagement";
import ChartOfAccounts from "./pages/admin/Accounting/ChartOfAccounts";
import JournalEntries from "./pages/admin/JournalEntries/JournalEntries";
import CashBank from "./pages/admin/CashBank/CashBank";
import ClientsAR from "./pages/admin/ClientAR/ClientsAR";
import SuppliersAP from "./pages/admin/Accounting/SuppliersAP";
import Income from "./pages/admin/IncomeRevenue/Income";
import Expenses from "./pages/admin/Accounting/Expenses";
import Reports from "./pages/admin/Accounting/Reports";
import Layout from "./layout/Layout";
import Preloader from "./components/Preloader";
import AdminRoute from "./components/AdminRoute";
import NotFound from "./pages/public/NotFound";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, token } = useAuth();

  // Show preloader while loading or if token exists but user data hasn't loaded yet
  if (loading || (token && !user)) {
    return <Preloader />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personnel/dashboard"
        element={
          <ProtectedRoute>
            <PersonnelDashboard />
          </ProtectedRoute>
        }
      />
      {/* User Management Routes */}
      <Route
        path="/admin/admins"
        element={
          <AdminRoute>
            <Layout>
              <AdminManagement />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/personnel"
        element={
          <AdminRoute>
            <Layout>
              <Personnel />
            </Layout>
          </AdminRoute>
        }
      />
      {/* Accounting Routes */}
      <Route
        path="/admin/accounting/chart-of-accounts"
        element={
          <AdminRoute>
            <Layout>
              <ChartOfAccounts />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/journal-entries"
        element={
          <AdminRoute>
            <Layout>
              <JournalEntries />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/cash-bank"
        element={
          <AdminRoute>
            <Layout>
              <CashBank />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/clients-ar"
        element={
          <AdminRoute>
            <Layout>
              <ClientsAR />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/suppliers-ap"
        element={
          <AdminRoute>
            <Layout>
              <SuppliersAP />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/income"
        element={
          <AdminRoute>
            <Layout>
              <Income />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/expenses"
        element={
          <AdminRoute>
            <Layout>
              <Expenses />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/accounting/reports"
        element={
          <AdminRoute>
            <Layout>
              <Reports />
            </Layout>
          </AdminRoute>
        }
      />
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
};

export default App;
