// src/layout/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";

const Sidebar = ({ onCloseSidebar }) => {
  const { user, isAdmin, isPersonnel, getUser } = useAuth();
  const location = useLocation();

  const isOnPersonnelRoute = location.pathname.startsWith("/admin/personnel");
  const [expandedItems, setExpandedItems] = useState({
    personnel: isOnPersonnelRoute,
  });

  // Auto-expand Personnel parent when on any personnel route (match AJCreativeStudio pattern)
  useEffect(() => {
    if (isOnPersonnelRoute) {
      setExpandedItems((prev) => ({ ...prev, personnel: true }));
    }
  }, [location.pathname, isOnPersonnelRoute]);

  // Refetch user when personnel navigate so sidebar shows latest permissions after admin updates
  useEffect(() => {
    if (isPersonnel() && user) {
      getUser();
    }
  }, [location.pathname]);

  const isActiveLink = (href) => {
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  /** Exact match only – use for child links so /admin/personnel is not active on /admin/personnel/activity-log */
  const isActiveLinkExact = (href) => location.pathname === href;

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleLinkClick = (href) => {
    closeSidebarOnMobile();
    if (href && href.startsWith("/admin/personnel")) {
      setExpandedItems((prev) => ({ ...prev, personnel: true }));
    } else {
      // Navigating to another section – collapse Personnel (and any other parent)
      setExpandedItems((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[key] = false;
        });
        return next;
      });
    }
  };

  /** Accordion: only one parent open at a time; opening another closes the rest. */
  const toggleExpanded = (itemKey) => {
    setExpandedItems((prev) => {
      const isCurrentlyExpanded = prev[itemKey];
      if (isCurrentlyExpanded) {
        return { ...prev, [itemKey]: false };
      }
      // Opening this parent – close all others
      return { [itemKey]: true };
    });
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
          icon: "fas fa-users-cog",
          label: "Personnel",
          href: "/admin/personnel",
          hasChildren: true,
          children: [
            {
              icon: "fas fa-list",
              label: "Personnel List",
              href: "/admin/personnel",
            },
            {
              icon: "fas fa-list-alt",
              label: "Activity Log",
              href: "/admin/personnel/activity-log",
            },
          ],
        },
      ],
    },
  ];

  const personnelMenuItems = [
    {
      heading: "Core",
      items: [
        {
          accessKey: "dashboard",
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/personnel/dashboard",
        },
      ],
    },
    {
      heading: "Transactions",
      items: [
        {
          accessKey: "journal_entries",
          icon: "fas fa-file-invoice",
          label: "Journal Entries",
          href: "/admin/accounting/journal-entries",
        },
        {
          accessKey: "cash_bank",
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
          accessKey: "clients_ar",
          icon: "fas fa-user-tie",
          label: "Clients / AR",
          href: "/admin/accounting/clients-ar",
        },
        {
          accessKey: "suppliers_ap",
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
          accessKey: "income",
          icon: "fas fa-arrow-up",
          label: "Income / Revenue",
          href: "/admin/accounting/income",
        },
        {
          accessKey: "expenses",
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
          accessKey: "reports",
          icon: "fas fa-chart-line",
          label: "Financial Reports",
          href: "/admin/accounting/reports",
        },
      ],
    },
  ];

  // Filter personnel menu by user's sidebar_access (empty = no menu items; only show allowed)
  const allowedPersonnelMenuItems = (() => {
    if (!isPersonnel() || !user) return personnelMenuItems;
    const access = user.sidebar_access;
    if (!Array.isArray(access)) return personnelMenuItems;
    // When access is empty [], show no sidebar items (deselect all = no access)
    return personnelMenuItems
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.accessKey && access.includes(item.accessKey),
        ),
      }))
      .filter((section) => section.items.length > 0);
  })();

  // UPDATED: Proper menu selection logic
  let menuItems = [];

  if (isAdmin()) {
    menuItems = adminMenuItems;
  } else if (isPersonnel()) {
    menuItems = allowedPersonnelMenuItems;
  } else {
    // Fallback for any unhandled cases
    menuItems = adminMenuItems;
  }

  const renderMenuSection = (section, index) => (
    <React.Fragment key={index}>
      <div className="sb-sidenav-menu-heading">{section.heading}</div>
      {section.items.map((item, itemIndex) => {
        const itemKey = item.label.toLowerCase().replace(/\s+/g, "");
        const isExpanded = expandedItems[itemKey] ?? false;
        const hasActiveChild =
          item.children &&
          item.children.some((child) => isActiveLinkExact(child.href));
        const isActive = !item.hasChildren && isActiveLink(item.href);

        if (item.hasChildren && item.children) {
          return (
            <React.Fragment key={itemIndex}>
              <a
                className={`nav-link nav-link-parent ${
                  hasActiveChild ? "has-active-child" : ""
                }`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpanded(itemKey);
                }}
              >
                <div className="sb-nav-link-icon">
                  <i className={item.icon}></i>
                </div>
                {item.label}
                <div
                  className={`sb-sidenav-collapse-arrow ${
                    isExpanded ? "expanded" : ""
                  }`}
                >
                  <i className="fas fa-chevron-right small" />
                </div>
              </a>
              <nav
                className={`sb-sidenav-menu-nested ${isExpanded ? "show" : ""}`}
              >
                {item.children.map((child, childIndex) => {
                  const isChildActive = isActiveLinkExact(child.href);
                  return (
                    <Link
                      key={childIndex}
                      className={`nav-link ${isChildActive ? "active" : ""}`}
                      to={child.href}
                      onClick={() => handleLinkClick(child.href)}
                    >
                      <div className="sb-nav-link-icon">
                        <i className={child.icon} />
                      </div>
                      {child.label}
                      {isChildActive && (
                        <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                          <i className="fas fa-chevron-right small" />
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </React.Fragment>
          );
        }

        return (
          <Link
            key={itemIndex}
            className={`nav-link ${isActive ? "active" : ""}`}
            to={item.href}
            onClick={() => handleLinkClick(item.href)}
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

              {/* Business Accounts - Admin only; same structure as Personnel List */}
              {isAdmin() && (
                <Link
                  to="/admin/accounts"
                  className={`nav-link ${
                    isActiveLink("/admin/accounts") ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("/admin/accounts")}
                >
                  <div className="sb-nav-link-icon">
                    <i className="fas fa-building"></i>
                  </div>
                  Accounts & COA
                  {isActiveLink("/admin/accounts") && (
                    <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <i className="fas fa-chevron-right small"></i>
                    </span>
                  )}
                </Link>
              )}

              {/* Profile - Personnel only; same structure as other nav links */}
              {isPersonnel() && (
                <Link
                  to="/profile"
                  className={`nav-link ${isActiveLink("/profile") ? "active" : ""}`}
                  onClick={() => handleLinkClick("/profile")}
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

              {/* Settings - Admin only; same structure as Personnel List */}
              {isAdmin() && (
                <Link
                  to="/settings"
                  className={`nav-link ${
                    isActiveLink("/settings") ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("/settings")}
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
              )}
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
