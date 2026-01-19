// src/layout/Sidebar.jsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";

const Sidebar = ({ onCloseSidebar }) => {
  const { user, isAdmin, isPersonnel } = useAuth();

  const location = useLocation();

  const isActiveLink = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleLinkClick = () => {
    closeSidebarOnMobile();
  };

  const adminMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/admin/dashboard",
        },
      ],
    },
    {
      heading: "Transactions",
      items: [
        {
          icon: "fas fa-file-invoice",
          label: "Journal Entries",
          href: "/admin/accounting/journal-entries",
        },
        {
          icon: "fas fa-money-bill-wave",
          label: "Cash & Bank",
          href: "/admin/accounting/cash-bank",
        },
      ],
    },
    {
      heading: "Receivables & Payables",
      items: [
        {
          icon: "fas fa-user-tie",
          label: "Clients / AR",
          href: "/admin/accounting/clients-ar",
        },
        {
          icon: "fas fa-truck",
          label: "Suppliers / AP",
          href: "/admin/accounting/suppliers-ap",
        },
      ],
    },
    {
      heading: "Income & Expenses",
      items: [
        {
          icon: "fas fa-arrow-up",
          label: "Income / Revenue",
          href: "/admin/accounting/income",
        },
        {
          icon: "fas fa-arrow-down",
          label: "Expenses",
          href: "/admin/accounting/expenses",
        },
      ],
    },
    {
      heading: "Reports",
      items: [
        {
          icon: "fas fa-chart-line",
          label: "Financial Reports",
          href: "/admin/accounting/reports",
        },
      ],
    },
    {
      heading: "User Management",
      items: [
        {
          icon: "fas fa-user-shield",
          label: "Admins",
          href: "/admin/admins",
        },
        {
          icon: "fas fa-users-cog",
          label: "Personnel",
          href: "/admin/personnel",
        },
      ],
    },
  ];

  const personnelMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/personnel/dashboard",
        },
      ],
    },
    {
      heading: "Management",
      items: [
        {
          icon: "fas fa-file-invoice-dollar",
          label: "Invoices",
          href: "/personnel/invoices",
        },
        {
          icon: "fas fa-chart-line",
          label: "Reports",
          href: "/personnel/reports",
        },
      ],
    },
  ];

  // UPDATED: Proper menu selection logic
  let menuItems = [];

  if (isAdmin()) {
    menuItems = adminMenuItems;
  } else if (isPersonnel()) {
    menuItems = personnelMenuItems;
  } else {
    // Fallback for any unhandled cases
    menuItems = adminMenuItems;
  }

  const renderMenuSection = (section, index) => (
    <React.Fragment key={index}>
      <div className="sb-sidenav-menu-heading">{section.heading}</div>
      {section.items.map((item, itemIndex) => {
        const isActive = isActiveLink(item.href);
        return (
          <Link
            key={itemIndex}
            className={`nav-link ${isActive ? "active" : ""}`}
            to={item.href}
            onClick={handleLinkClick}
          >
            <div className="sb-nav-link-icon">
              <i className={item.icon}></i>
            </div>
            {item.label}
            {isActive && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>
        );
      })}
    </React.Fragment>
  );

  return (
    <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
      <div className="sb-sidenav-menu">
        <div className="nav">
          {menuItems.map(renderMenuSection)}

          {/* Common Settings for All Users */}
          {(isAdmin() || isPersonnel()) && (
            <>
              <div className="sb-sidenav-menu-heading">Settings</div>

              {/* Chart of Accounts - Show for Admin only */}
              {isAdmin() && (
                <Link
                  className={`nav-link ${
                    isActiveLink("/admin/accounting/chart-of-accounts") ? "active" : ""
                  }`}
                  to="/admin/accounting/chart-of-accounts"
                  onClick={handleLinkClick}
                >
                  <div className="sb-nav-link-icon">
                    <i className="fas fa-book"></i>
                  </div>
                  Chart of Accounts
                  {isActiveLink("/admin/accounting/chart-of-accounts") && (
                    <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <i className="fas fa-chevron-right small"></i>
                    </span>
                  )}
                </Link>
              )}

              {/* Profile - Show for Personnel only, not Admin */}
              {isPersonnel() && (
                <Link
                  className={`nav-link ${
                    isActiveLink("/profile") ? "active" : ""
                  }`}
                  to="/profile"
                  onClick={handleLinkClick}
                >
                  <div className="sb-nav-link-icon">
                    <i className="fas fa-user"></i>
                  </div>
                  Profile
                  {isActiveLink("/profile") && (
                    <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <i className="fas fa-chevron-right small"></i>
                    </span>
                  )}
                </Link>
              )}

              {/* Settings - Show for Admin and Personnel */}
              <Link
                className={`nav-link ${
                  isActiveLink("/settings") ? "active" : ""
                }`}
                to="/settings"
                onClick={handleLinkClick}
              >
                <div className="sb-nav-link-icon">
                  <i className="fas fa-cog"></i>
                </div>
                Settings
                {isActiveLink("/settings") && (
                  <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                    <i className="fas fa-chevron-right small"></i>
                  </span>
                )}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="sb-sidenav-footer">
        <div className="small">Logged in as:</div>
        <span className="user-name">{user?.name || "User"}</span>
        <div className="small text-muted">
          {isAdmin()
            ? "System Administrator"
            : isPersonnel()
            ? "Personnel"
            : "User"}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
