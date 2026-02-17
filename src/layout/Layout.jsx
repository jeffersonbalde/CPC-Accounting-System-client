// layout/Layout.jsx
import React, { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../contexts/AuthContext";

const ACCOUNTING_PATHS = [
  "/admin/dashboard",
  "/personnel/dashboard",
  "/admin/accounting",
  "/admin/accounts",
];

const isAccountingOrDashboardPath = (pathname) => {
  return ACCOUNTING_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
};

const Layout = ({ children }) => {
  const { user, accounts, currentAccount, setCurrentAccount, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarToggled, setSidebarToggled] = useState(false);

  // Restore current account when user has accounts but none selected (e.g. localStorage cleared)
  useEffect(() => {
    if (user && Array.isArray(accounts) && accounts.length > 0 && !currentAccount) {
      setCurrentAccount(accounts[0]);
    }
  }, [user, accounts, currentAccount, setCurrentAccount]);

  // Apply CSS class to body for sidebar state
  useEffect(() => {
    const body = document.body;

    if (sidebarToggled) {
      body.classList.add("sb-sidenav-toggled");
    } else {
      body.classList.remove("sb-sidenav-toggled");
    }

    return () => {
      body.classList.remove("sb-sidenav-toggled");
    };
  }, [sidebarToggled]);

  // Require account on accounting/dashboard routes; redirect admin to create one if none
  const pathname = location.pathname || "";
  const needsAccount = isAccountingOrDashboardPath(pathname) && pathname !== "/admin/accounts";
  if (needsAccount && user && Array.isArray(accounts) && accounts.length === 0) {
    if (isAdmin()) {
      return <Navigate to="/admin/accounts" replace state={{ from: pathname }} />;
    }
    return (
      <div className="sb-nav-fixed">
        <Topbar onToggleSidebar={() => {}} />
        <div id="layoutSidenav">
          <div id="layoutSidenav_nav"><Sidebar onCloseSidebar={() => {}} /></div>
          <div id="layoutSidenav_content">
            <main className="p-4">
              <div className="alert alert-warning mb-0">
                No business account assigned. Please contact an administrator.
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  const toggleSidebar = () => {
    setSidebarToggled(!sidebarToggled);
  };

  const closeSidebar = () => {
    setSidebarToggled(false);
  };

  // Close sidebar when clicking on main content
  const handleMainClick = () => {
    if (window.innerWidth < 768 && sidebarToggled) {
      closeSidebar();
    }
  };

  return (
    <div className="sb-nav-fixed">
      <Topbar onToggleSidebar={toggleSidebar} />

      <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
          <Sidebar onCloseSidebar={closeSidebar} />
        </div>

        <div id="layoutSidenav_content" onClick={handleMainClick}>
          <main key={currentAccount?.id ?? "no-account"}>{children}</main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
