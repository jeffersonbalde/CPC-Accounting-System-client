import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/public/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import PersonnelDashboard from "./pages/staff_admin/Dashboard";
import AdminManagement from "./pages/admin/Admin/AdminManagement";
import Personnel from "./pages/admin/Personnel/PersonnelManagement";
import ActivityLog from "./pages/admin/Personnel/ActivityLog";
import Settings from "./pages/admin/Settings/Settings";
import UnifiedAccountManagement from "./pages/admin/Accounts/UnifiedAccountManagement";
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
import AdminOnly from "./components/AdminOnly";
import PersonnelOnly from "./components/PersonnelOnly";
import AccountingGuard from "./components/AccountingGuard";
import NotFound from "./pages/public/NotFound";
import Profile from "./pages/personnel/Profile";

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
      {/* Single Layout route: Layout stays mounted; only Outlet (page) changes on navigation */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        <Route
          path="admin/dashboard"
          element={
            <AdminOnly>
              <AdminDashboard />
            </AdminOnly>
          }
        />
        <Route
          path="personnel/dashboard"
          element={
            <PersonnelOnly>
              <PersonnelDashboard />
            </PersonnelOnly>
          }
        />
        <Route
          path="admin/admins"
          element={
            <AdminOnly>
              <AdminManagement />
            </AdminOnly>
          }
        />
        <Route
          path="admin/personnel"
          element={
            <AdminOnly>
              <Personnel />
            </AdminOnly>
          }
        />
        <Route
          path="admin/personnel/activity-log"
          element={
            <AdminOnly>
              <ActivityLog />
            </AdminOnly>
          }
        />
        <Route
          path="settings"
          element={
            <AdminOnly>
              <Settings />
            </AdminOnly>
          }
        />
        <Route
          path="admin/accounts"
          element={
            <AdminOnly>
              <UnifiedAccountManagement />
            </AdminOnly>
          }
        />
        <Route
          path="profile"
          element={
            <PersonnelOnly>
              <Profile />
            </PersonnelOnly>
          }
        />
        <Route
          path="admin/accounting/chart-of-accounts"
          element={
            <AdminOnly>
              <ChartOfAccounts />
            </AdminOnly>
          }
        />
        <Route
          path="admin/accounting/journal-entries"
          element={
            <AccountingGuard sidebarKey="journal_entries">
              <JournalEntries />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/cash-bank"
          element={
            <AccountingGuard sidebarKey="cash_bank">
              <CashBank />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/clients-ar"
          element={
            <AccountingGuard sidebarKey="clients_ar">
              <ClientsAR />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/suppliers-ap"
          element={
            <AccountingGuard sidebarKey="suppliers_ap">
              <SuppliersAP />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/income"
          element={
            <AccountingGuard sidebarKey="income">
              <Income />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/expenses"
          element={
            <AccountingGuard sidebarKey="expenses">
              <Expenses />
            </AccountingGuard>
          }
        />
        <Route
          path="admin/accounting/reports"
          element={
            <AccountingGuard sidebarKey="reports">
              <Reports />
            </AccountingGuard>
          }
        />
        {/* 404 for unknown paths under layout */}
        <Route path="*" element={<NotFound />} />
      </Route>
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
          style={{ zIndex: 99999 }}
        />
      </AuthProvider>
    </Router>
  );
};

export default App;
