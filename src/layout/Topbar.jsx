import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { showAlert, showToast } from "../services/notificationService";
import { FaBuilding } from "react-icons/fa";
import logo from "../assets/logo.png";

const Topbar = ({ onToggleSidebar }) => {
  const {
    user,
    logout,
    isAdmin,
    isPersonnel,
    accounts,
    currentAccount,
    setCurrentAccount,
    request,
  } = useAuth();

  // Accounts coming from global auth context (admin side)
  // For admin we keep both active and inactive here so they can switch context
  // For personnel the backend already filters to active only
  const contextActiveAccounts = useMemo(() => accounts || [], [accounts]);

  // Local accounts loaded specifically for personnel (when context has none)
  const [personnelAccounts, setPersonnelAccounts] = useState([]);

  // Effective account list used by the topbar (context first, then personnel fallback)
  const effectiveAccounts = useMemo(
    () =>
      contextActiveAccounts.length > 0 ? contextActiveAccounts : personnelAccounts,
    [contextActiveAccounts, personnelAccounts]
  );

  // Use currentAccount when available, otherwise fall back to the first effective account
  const displayAccount = useMemo(() => {
    if (currentAccount) return currentAccount;
    if (effectiveAccounts.length > 0) return effectiveAccounts[0];
    return null;
  }, [currentAccount, effectiveAccounts]);

  // Sync personnelAccounts with context accounts when they change (for real-time updates)
  useEffect(() => {
    if (contextActiveAccounts.length > 0) {
      // If context has accounts, clear personnelAccounts so effectiveAccounts uses context
      if (personnelAccounts.length > 0) {
        setPersonnelAccounts([]);
      }
    }
  }, [contextActiveAccounts.length, personnelAccounts.length]);

  // Fetch accounts if context has none (for both admin and personnel)
  useEffect(() => {
    if (!user) return;
    
    // Fetch if context has no accounts AND we haven't loaded personnel accounts yet
    if (contextActiveAccounts.length === 0 && personnelAccounts.length === 0) {
      console.log("Topbar: No accounts in context, fetching from /accounts endpoint...");
      let cancelled = false;

      const loadAccounts = async () => {
        try {
          console.log("Topbar: Calling /accounts endpoint...");
          const data = await request("/accounts");
          console.log("Topbar: Received accounts data:", data);
          const list = (data?.accounts || []).filter(
            (acc) => acc.is_active !== false
          );
          console.log("Topbar: Filtered active accounts:", list.length, list);
          if (cancelled) return;
          if (list.length > 0) {
            console.log("Topbar: Setting personnel accounts:", list);
            setPersonnelAccounts(list);
            // Always set currentAccount if we have accounts
            if (!currentAccount) {
              console.log("Topbar: Setting currentAccount to first account:", list[0]);
              setCurrentAccount(list[0]);
            }
          } else {
            console.warn("Topbar: No active accounts found");
          }
        } catch (err) {
          console.error("Topbar: Failed to load business accounts:", err);
        }
      };

      loadAccounts();

      return () => {
        cancelled = true;
      };
    }
  }, [user, contextActiveAccounts.length, personnelAccounts.length, request, currentAccount, setCurrentAccount]);

  // Track accounts changes to refresh topbar when admin toggles active/inactive
  const accountsRef = useRef(accounts);
  useEffect(() => {
    // Check if accounts array reference changed (means refreshAccounts was called)
    const accountsChanged = accountsRef.current !== accounts;
    accountsRef.current = accounts;
    
    if (!user || !accountsChanged) return;
    
    // For admin: contextActiveAccounts will auto-update via useMemo, no action needed
    // For personnel: refresh personnelAccounts if we're using them
    if (contextActiveAccounts.length === 0 && personnelAccounts.length > 0) {
      const refreshPersonnelAccounts = async () => {
        try {
          const data = await request("/accounts");
          const list = (data?.accounts || []).filter(
            (acc) => acc.is_active !== false
          );
          setPersonnelAccounts(list);
          // Update currentAccount if it was deactivated
          if (currentAccount && !list.find(a => a.id === currentAccount.id)) {
            if (list.length > 0) {
              setCurrentAccount(list[0]);
            } else {
              setCurrentAccount(null);
            }
          }
        } catch (err) {
          console.error("Topbar: Failed to refresh personnel accounts:", err);
        }
      };
      
      refreshPersonnelAccounts();
    }
  }, [accounts, user, request, currentAccount, setCurrentAccount, contextActiveAccounts.length, personnelAccounts.length]);

  // Auto-set currentAccount when missing.
  // For ADMIN: never override an existing currentAccount (can stay on inactive).
  // For PERSONNEL: if currentAccount is no longer in the allowed list (e.g. made inactive),
  //                switch to the first available account or clear it.
  const isAdminUser = isAdmin();
  const isPersonnelUser = isPersonnel();

  useEffect(() => {
    if (effectiveAccounts.length > 0) {
      if (!currentAccount) {
        // No current account yet – default to first available for both admin and personnel
        setCurrentAccount(effectiveAccounts[0]);
      } else if (isPersonnelUser) {
        // Personnel are not allowed to stay on an account that is no longer available to them
        const stillAllowed = effectiveAccounts.find((a) => a.id === currentAccount.id);
        if (!stillAllowed) {
          setCurrentAccount(effectiveAccounts[0]);
        }
      }
      // For admin with an existing currentAccount we do NOT auto-correct, even if it's inactive
    } else if (currentAccount && isPersonnelUser && effectiveAccounts.length === 0) {
      // Personnel: no available accounts left, clear currentAccount
      setCurrentAccount(null);
    }
  }, [effectiveAccounts, currentAccount, setCurrentAccount, isAdminUser, isPersonnelUser]);

  // Debug logging
  useEffect(() => {
    console.log("Topbar Debug:", {
      user: user?.name,
      role: user?.role,
      isPersonnel: isPersonnel(),
      contextAccounts: contextActiveAccounts.length,
      personnelAccounts: personnelAccounts.length,
      effectiveAccounts: effectiveAccounts.length,
      effectiveAccountsList: effectiveAccounts.map(a => a.name),
      currentAccount: currentAccount?.name,
      displayAccount: displayAccount?.name,
      willShowAccountSelector: !!displayAccount,
    });
  }, [user, isPersonnel, contextActiveAccounts.length, personnelAccounts.length, effectiveAccounts.length, effectiveAccounts, currentAccount, displayAccount]);
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef(null);
  const accountMenuRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserMenuClosing, setIsUserMenuClosing] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAccountMenuClosing, setIsAccountMenuClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const accountCloseTimerRef = useRef(null);

  useEffect(() => {
    if (user?.avatar && (isAdmin() || isPersonnel())) {
      setAvatarLoading(true);
      setAvatarError(false);
    }
  }, [user?.avatar, user?.role]);

  const closeUserMenu = useCallback(() => {
    if (!isUserMenuOpen || isUserMenuClosing) return;
    setIsUserMenuClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsUserMenuClosing(false);
      setIsUserMenuOpen(false);
    }, 180);
  }, [isUserMenuOpen, isUserMenuClosing]);

  const openUserMenu = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setIsUserMenuClosing(false);
    setIsUserMenuOpen(true);
  }, []);

  const toggleUserMenu = useCallback(() => {
    if (isUserMenuOpen) closeUserMenu();
    else openUserMenu();
  }, [isUserMenuOpen, closeUserMenu, openUserMenu]);

  const closeAccountMenu = useCallback(() => {
    if (!isAccountMenuOpen || isAccountMenuClosing) return;
    setIsAccountMenuClosing(true);
    if (accountCloseTimerRef.current) window.clearTimeout(accountCloseTimerRef.current);
    accountCloseTimerRef.current = window.setTimeout(() => {
      setIsAccountMenuClosing(false);
      setIsAccountMenuOpen(false);
    }, 180);
  }, [isAccountMenuOpen, isAccountMenuClosing]);

  const openAccountMenu = useCallback(() => {
    if (accountCloseTimerRef.current) window.clearTimeout(accountCloseTimerRef.current);
    setIsAccountMenuClosing(false);
    setIsAccountMenuOpen(true);
  }, []);

  const toggleAccountMenu = useCallback(() => {
    if (isAccountMenuOpen) closeAccountMenu();
    else openAccountMenu();
  }, [isAccountMenuOpen, closeAccountMenu, openAccountMenu]);

  const handleSwitchAccount = (account) => {
    setCurrentAccount(account);
    closeAccountMenu();
    const dashboardPath = isAdmin() ? "/admin/dashboard" : "/personnel/dashboard";
    navigate(dashboardPath);
  };

  const handleNavigation = (path) => {
    closeUserMenu();
    navigate(path);
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

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const onPointerDown = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) closeUserMenu();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeUserMenu();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen, closeUserMenu]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const onPointerDown = (e) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(e.target)) closeAccountMenu();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeAccountMenu();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isAccountMenuOpen, closeAccountMenu]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (accountCloseTimerRef.current) window.clearTimeout(accountCloseTimerRef.current);
    };
  }, []);

  // Settings in dropdown: Admin only; personnel cannot access
  const shouldShowSettings = () => {
    return isAdmin();
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
      {/* Current Account: logo + name, clickable dropdown (same for admin and personnel; show panel even with one account) */}
      {displayAccount && (
        <div className="d-flex align-items-center me-2 topbar-brand-wrap" ref={accountMenuRef}>
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-link p-0 d-flex align-items-center text-white text-decoration-none account-brand-btn"
              id="accountDropdown"
              aria-expanded={isAccountMenuOpen ? "true" : "false"}
              aria-haspopup="listbox"
              onClick={(e) => {
                e.preventDefault();
                toggleAccountMenu();
              }}
              style={{
                gap: "10px",
                minHeight: "44px",
                transition: "opacity 0.2s ease",
              }}
            >
              {/* Logo */}
              {displayAccount.logo ? (
                <img
                  src={displayAccount.logo}
                  alt=""
                  className="d-none d-sm-block flex-shrink-0"
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <div
                  className="d-none d-sm-flex flex-shrink-0 align-items-center justify-content-center"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "4px",
                    background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                    color: "white",
                    boxShadow: "0 2px 6px rgba(12, 32, 63, 0.3)",
                  }}
                >
                  <FaBuilding size={20} />
                </div>
              )}
              {displayAccount.logo ? (
                <img
                  src={displayAccount.logo}
                alt=""
                className="d-block d-sm-none flex-shrink-0"
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "contain",
                  borderRadius: "4px",
                  }}
                />
              ) : (
                <div
                  className="d-block d-sm-none flex-shrink-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "4px",
                    background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                    color: "white",
                    boxShadow: "0 2px 6px rgba(12, 32, 63, 0.3)",
                  }}
                >
                  <FaBuilding size={16} />
                </div>
              )}
              {/* Name: truncate with ellipsis when too long; full name on hover via title */}
              <div className="d-flex flex-column justify-content-center text-start topbar-account-name min-w-0">
                <span
                  className="fw-bold text-white topbar-account-name-text"
                  title={displayAccount.name}
                  style={{ fontSize: "16px", lineHeight: "1.2" }}
                >
                  {displayAccount.name}
                </span>
              </div>
              {/* Dropdown chevron (same for admin and personnel so UI is consistent) */}
              <i
                className="fas fa-chevron-down ms-1 flex-shrink-0 text-white-50"
                style={{
                  fontSize: "10px",
                  transition: "transform 0.2s ease",
                  transform: isAccountMenuOpen ? "rotate(180deg)" : "rotate(0)",
                }}
              />
            </button>
            {/* Account list dropdown (show for both admin and personnel, even with one account) */}
            {(isAccountMenuOpen || isAccountMenuClosing) && (
              <ul
                className={`dropdown-menu dropdown-menu-end show topbar-dropdown-menu account-switcher-dropdown ${
                  isAccountMenuOpen && !isAccountMenuClosing ? "is-open" : ""
                } ${isAccountMenuClosing ? "is-closing" : ""}`}
                aria-labelledby="accountDropdown"
                style={{
                  width: "280px",
                  maxWidth: "280px",
                  backgroundColor: "#fff",
                  border: "1px solid #e0e0e0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex: 10050,
                }}
              >
                {(isAdminUser ? effectiveAccounts : effectiveAccounts.filter((a) => a.is_active !== false)).map(
                  (acc) => (
                  <li key={acc.id}>
                    <button
                      type="button"
                      className={`dropdown-item account-switcher-item border-0 w-100 text-start d-flex align-items-center gap-2 py-2 px-3 ${
                        currentAccount?.id === acc.id ? "active" : ""
                      }`}
                      onClick={() => handleSwitchAccount(acc)}
                      style={{
                        fontSize: "13px",
                        cursor: "pointer",
                        minWidth: 0,
                      }}
                    >
                      {acc.logo ? (
                      <img
                          src={acc.logo}
                        alt=""
                        style={{
                          width: "28px",
                          height: "28px",
                          objectFit: "contain",
                          borderRadius: "4px",
                          flexShrink: 0,
                        }}
                      />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "4px",
                            background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                            color: "white",
                            boxShadow: "0 2px 4px rgba(12, 32, 63, 0.25)",
                          }}
                        >
                          <FaBuilding size={14} />
                        </div>
                      )}
                      <div className="flex-grow-1 min-w-0 account-switcher-name" style={{ overflow: "hidden" }}>
                        <span
                          className="fw-semibold d-block"
                          style={{
                            color: "inherit",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={acc.name}
                        >
                          {acc.name}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Fallback if no account selected AND no accounts available */}
      {!displayAccount && effectiveAccounts.length === 0 && (
        <div className="navbar-brand topbar-brand-wrap d-flex align-items-center">
          <img src={logo} alt="" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <span className="fw-bold text-white ms-2">CPC Business Management System</span>
        </div>
      )}

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
        <li className="nav-item dropdown" ref={userMenuRef}>
          <a
            className="nav-link dropdown-toggle d-flex align-items-center"
            id="navbarDropdown"
            href="#"
            role="button"
            aria-expanded={isUserMenuOpen ? "true" : "false"}
            onClick={(e) => {
              e.preventDefault();
              toggleUserMenu();
            }}
          >
            {renderUserIcon()}
            {/* Hide username on mobile */}
            <span className="d-none d-lg-inline">{user?.name}</span>
          </a>
          {(isUserMenuOpen || isUserMenuClosing) && (
            <ul
              className={`dropdown-menu dropdown-menu-end show topbar-dropdown-menu user-dropdown-menu ${
                isUserMenuOpen && !isUserMenuClosing ? "is-open" : ""
              } ${isUserMenuClosing ? "is-closing" : ""}`}
              aria-labelledby="navbarDropdown"
              style={{
                minWidth: "200px",
                padding: "6px 0",
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                zIndex: 10050,
              }}
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
          )}
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

        .account-brand-btn:hover {
          opacity: 0.9;
          transform: none !important;
        }

        /* Account & User dropdowns - above sidebar */
        .topbar-dropdown-menu,
        .account-switcher-dropdown,
        .user-dropdown-menu {
          z-index: 10050 !important;
          background-color: #ffffff !important;
          border: 1px solid #e0e0e0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
        }

        .user-dropdown-menu .dropdown-header,
        .user-dropdown-menu .custom-dropdown-item {
          color: #212529 !important;
        }

        .user-dropdown-menu .dropdown-header .text-muted {
          color: #6c757d !important;
        }

        .account-switcher-item {
          color: #212529 !important;
        }

        .account-switcher-item:hover {
          background-color: #f8f9fa !important;
          color: #212529 !important;
        }

        .account-switcher-item.active {
          background-color: #0c203f !important;
          color: #ffffff !important;
        }

        .account-switcher-item.active:hover {
          background-color: #0c203f !important;
          color: #ffffff !important;
        }

        /* Smooth dropdown open/close animation (Topbar only) */
        .topbar-dropdown-menu {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform-origin: top right;
          transform: translateY(4px);
          transition: opacity 180ms ease, transform 180ms ease, visibility 0ms linear 180ms;
          will-change: opacity, transform;
          z-index: 10050 !important;
        }

        .topbar-dropdown-menu.is-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
          transition: opacity 180ms ease, transform 180ms ease, visibility 0ms linear 0ms;
        }

        .topbar-dropdown-menu.is-closing {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(4px);
          transition: opacity 180ms ease, transform 180ms ease, visibility 0ms linear 180ms;
        }

        /* Mobile: prevent clipping on small screens */
        @media (max-width: 576px) {
          .topbar-dropdown-menu {
            position: fixed !important;
            left: auto !important;
            right: 0.75rem !important;
            top: 4.25rem !important; /* below the topbar */
            width: auto !important; /* keep desktop-style sizing */
            max-width: calc(100vw - 1.5rem) !important; /* avoid off-screen */
          }

          .dropdown-menu .custom-dropdown-item {
            white-space: normal;
          }

          .dropdown-header {
            white-space: normal;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .topbar-dropdown-menu,
          .topbar-dropdown-menu.is-open,
          .topbar-dropdown-menu.is-closing {
            transition: none;
            transform: none;
          }
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
