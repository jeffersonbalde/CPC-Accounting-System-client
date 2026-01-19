import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { showAlert, showToast } from "../services/notificationService";
import logo from "../assets/logo.png";

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout, isAdmin, isPersonnel } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (user?.avatar && (isAdmin() || isPersonnel())) {
      setAvatarLoading(true);
      setAvatarError(false);
    }
  }, [user?.avatar, user?.role]);

  const handleNavigation = (path) => {
    navigate(path);
    document.body.click();
  };

  const handleLogout = async () => {
    const result = await showAlert.confirm(
      "Logout Confirmation",
      "Are you sure you want to logout?",
      "Yes, Logout",
      "Cancel"
    );

    if (result.isConfirmed) {
      showAlert.loading(
        "Logging out...",
        "Please wait while we securely log you out",
        {
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: false,
          showConfirmButton: false,
        }
      );

      disableTopbarInteractions();

      setTimeout(async () => {
        try {
          await logout();
          showAlert.close();
          showToast.success("You have been logged out successfully");
        } catch (error) {
          showAlert.close();
          enableTopbarInteractions();
          showAlert.error(
            "Logout Error",
            "There was a problem logging out. Please try again."
          );
          console.error("Logout error:", error);
        }
      }, 1500);
    }
  };

  const disableTopbarInteractions = () => {
    const topbarElements = document.querySelectorAll(
      ".sb-topnav button, .sb-topnav a, .sb-topnav input, .sb-topnav .dropdown-toggle"
    );
    topbarElements.forEach((element) => {
      element.style.pointerEvents = "none";
      element.style.opacity = "0.6";
      element.setAttribute("disabled", "true");
    });
  };

  const enableTopbarInteractions = () => {
    const topbarElements = document.querySelectorAll(
      ".sb-topnav button, .sb-topnav a, .sb-topnav input, .sb-topnav .dropdown-toggle"
    );
    topbarElements.forEach((element) => {
      element.style.pointerEvents = "auto";
      element.style.opacity = "1";
      element.removeAttribute("disabled");
    });
  };

  const handleImageLoad = () => {
    setAvatarLoading(false);
    setAvatarError(false);
  };

  const handleImageError = () => {
    setAvatarLoading(false);
    setAvatarError(true);
  };

  // Check if Settings should be shown (Admin and Personnel)
  const shouldShowSettings = () => {
    return isAdmin() || isPersonnel();
  };

  // Render user icon based on role
  const renderUserIcon = () => {
    // For Admin and Personnel - Show avatar if available
    if (isAdmin() || isPersonnel()) {
      return (
        <div className="position-relative me-2">
          {avatarLoading && user?.avatar && (
            <div
              className="rounded-circle skeleton"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
              }}
            ></div>
          )}

          {user?.avatar && !avatarError && (
            <img
              src={user.avatar}
              alt={user.name}
              className="rounded-circle"
              style={{
                width: "32px",
                height: "32px",
                objectFit: "cover",
                display: avatarLoading ? "none" : "block",
                transition: "opacity 0.3s ease",
                opacity: avatarLoading ? 0 : 1,
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}

          {(!user?.avatar || avatarError) && (
            <div
              className="bg-light rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "32px",
                height: "32px",
                opacity: avatarLoading ? 0.6 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <i
                className="fas fa-user text-dark"
                style={{ fontSize: "14px" }}
              ></i>
            </div>
          )}
        </div>
      );
    }

    // Fallback for other roles
    return (
      <div className="position-relative me-2">
        <div
          className="bg-light rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: "32px",
            height: "32px",
          }}
        >
          <i className="fas fa-user text-dark" style={{ fontSize: "14px" }}></i>
        </div>
      </div>
    );
  };

  // Get role display text
  const getRoleDisplay = () => {
    if (isAdmin()) return "Administrator";
    if (isPersonnel()) return "Personnel";
    return "User";
  };

  return (
    <nav
      className="sb-topnav navbar navbar-expand navbar-dark"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      {/* Navbar Brand - RESPONSIVE */}
      <div className="navbar-brand ps-3 ps-sm-4 d-flex align-items-center">
        <div className="d-flex align-items-center" style={{ gap: "12px" }}>
          {/* Larger Responsive Logo */}
          <img
            src={logo}
            alt="CPC Growth Strategies Logo"
            className="d-none d-sm-block"
            style={{
              width: "45px",
              height: "45px",
              objectFit: "contain",
            }}
          />

          {/* Mobile Logo - Smaller */}
          <img
            src={logo}
            alt="CPC Logo"
            className="d-block d-sm-none"
            style={{
              width: "35px",
              height: "35px",
              objectFit: "contain",
            }}
          />

          {/* Text Brand Name - Responsive */}
          <div className="d-flex flex-column justify-content-center">
            {/* Desktop & Tablet */}
            <span
              className="fw-bold text-white d-none d-md-block"
              style={{
                fontSize: "20px",
                lineHeight: "1.1",
              }}
            >
              CPC Marketing Consultancy and Services
            </span>

            {/* Mobile - Medium screens */}
            <span
              className="fw-bold text-white d-none d-sm-block d-md-none"
              style={{
                fontSize: "16px",
                lineHeight: "1.1",
              }}
            >
              CPC Marketing Consultancy and Services
            </span>

            {/* Mobile - Small screens */}
            <span
              className="fw-bold text-white d-block d-sm-none"
              style={{
                fontSize: "20px",
                lineHeight: "1.1",
              }}
            >
              CPC
            </span>

            {/* Subtitle - Desktop & Tablet only */}
            <small
              className="text-white-50 d-none d-sm-block"
              style={{
                fontSize: "11px",
                lineHeight: "1.1",
              }}
            >
              Business Management System
            </small>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button
        className="btn btn-link btn-sm order-1 order-lg-0 me-2 me-lg-0"
        id="sidebarToggle"
        onClick={onToggleSidebar}
        style={{
          color: "var(--background-white)",
          marginLeft: window.innerWidth >= 992 ? "1rem" : "0",
        }}
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* User Dropdown */}
      <ul className="navbar-nav ms-auto me-2 me-lg-3">
        <li className="nav-item dropdown">
          <a
            className="nav-link dropdown-toggle d-flex align-items-center"
            id="navbarDropdown"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            onClick={(e) => e.preventDefault()}
          >
            {renderUserIcon()}
            {/* Hide username on mobile */}
            <span className="d-none d-lg-inline">{user?.name}</span>
          </a>
          <ul
            className="dropdown-menu dropdown-menu-end"
            aria-labelledby="navbarDropdown"
          >
            <li>
              <div className="dropdown-header">
                <strong>{user?.name}</strong>
                <div className="small text-muted">{user?.email}</div>
                <div className="small text-muted">{getRoleDisplay()}</div>
              </div>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            {/* Profile - Show for Personnel only, not Admin */}
            {isPersonnel() && (
              <li>
                <button
                  className="dropdown-item custom-dropdown-item"
                  onClick={() => handleNavigation("/profile")}
                >
                  <i className="fas fa-user me-2"></i>Profile
                </button>
              </li>
            )}

            {/* Conditionally show Settings dropdown item */}
            {shouldShowSettings() && (
              <li>
                <button
                  className="dropdown-item custom-dropdown-item"
                  onClick={() => handleNavigation("/settings")}
                >
                  <i className="fas fa-cog me-2"></i>Settings
                </button>
              </li>
            )}

            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button
                className="dropdown-item custom-dropdown-item logout-item"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2"></i>Logout
              </button>
            </li>
          </ul>
        </li>
      </ul>

      {/* Custom CSS for dropdown hover effects */}
      <style jsx>{`
        .custom-dropdown-item {
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          padding: 0.375rem 1rem;
          color: #212529;
          transition: all 0.15s ease-in-out;
        }

        .custom-dropdown-item:hover {
          background-color: #f8f9fa;
          color: #16181b;
        }

        .custom-dropdown-item:focus {
          background-color: #f8f9fa;
          color: #16181b;
          outline: none;
        }

        .logout-item {
          color: #dc3545 !important;
        }

        .logout-item:hover {
          background-color: rgba(220, 53, 69, 0.1) !important;
          color: #dc3545 !important;
        }

        .logout-item:focus {
          background-color: rgba(220, 53, 69, 0.1) !important;
          color: #dc3545 !important;
          outline: none;
        }

        .dropdown-menu .custom-dropdown-item {
          display: block;
          clear: both;
          font-weight: 400;
          text-decoration: none;
          white-space: nowrap;
          border: 0;
        }

        .dropdown-menu {
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 0.375rem;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        }

        .dropdown-menu .custom-dropdown-item:active {
          background-color: #0d6efd;
          color: white;
        }
      `}</style>
    </nav>
  );
};

export default Topbar;
