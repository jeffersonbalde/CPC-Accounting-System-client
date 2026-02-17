import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaUsers } from "react-icons/fa";
import PersonnelDetailsModal from "./PersonnelDetailsModal";
import AddPersonnelModal from "./AddPersonnelModal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/admin/NumberViewModal";

const PersonnelManagement = () => {
  const { user: currentUser, token } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPersonnelForm, setShowPersonnelForm] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    formattedValue: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // Helper to get full name
  const getFullName = (person) => {
    if (person?.first_name && person?.last_name) {
      return `${person.first_name} ${person.last_name}`;
    }
    // Fallback for backward compatibility
    return person?.name || "";
  };

  const filterAndSortPersonnel = useCallback(() => {
    let filtered = [...personnel];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((person) => {
        const fullName = getFullName(person);
        const username = person.username || "";
        const phone = person.phone || "";
        const fieldsToSearch = [fullName, username, phone];
        return fieldsToSearch.some(
          (field) =>
            typeof field === "string" &&
            field.toLowerCase().includes(loweredSearch)
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter((person) => person.is_active !== false);
      } else if (filterStatus === "inactive") {
        filtered = filtered.filter((person) => person.is_active === false);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = a[sortField] ? new Date(a[sortField]) : new Date(0);
        const bDate = b[sortField] ? new Date(b[sortField]) : new Date(0);

        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "name") {
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        if (aName < bName) return sortDirection === "asc" ? -1 : 1;
        if (aName > bName) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredPersonnel(filtered);
    setCurrentPage(1);
  }, [personnel, searchTerm, filterStatus, sortField, sortDirection]);

  const hasActiveFilters = !!searchTerm.trim() || filterStatus !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortPersonnel();
  }, [filterAndSortPersonnel]);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      // Ensure API base URL ends with /api
      const apiBase =
        (
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";

      const response = await fetch(`${apiBase}/admin/personnel`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const personnelList = data.personnel || data.data || data || [];
        setPersonnel(personnelList);
      } else {
        throw new Error("Failed to fetch personnel");
      }
    } catch (error) {
      console.error("Error fetching personnel:", error);
      showAlert.error("Error", "Failed to load personnel");
      setPersonnel([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await fetchPersonnel();
    showToast.info("Data refreshed successfully");
  };

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Global cache outside component to persist across re-renders
  const loadedImagesCache = React.useRef(new Set());

  const getPersonnelAvatarUrl = useCallback((person) => {
    if (!person) return null;
    if (person.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = person.avatar_path;
      if (person.avatar_path.includes("avatars/")) {
        cleanFilename = person.avatar_path.replace("avatars/", "");
      }
      if (person.avatar_path.includes("personnel-avatars/")) {
        cleanFilename = person.avatar_path.replace("personnel-avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/personnel-avatar/${cleanFilename}`;
    }
    return null;
  }, []);

  const PersonnelAvatar = React.memo(
    ({ person, size = 44 }) => {
      const avatarUrl = person?.avatar_path
        ? getPersonnelAvatarUrl(person)
        : null;
      const imgRef = React.useRef(null);
      const hasCheckedCacheRef = React.useRef(false);

      // Check cache synchronously - if already loaded, never show loading state
      const isInCache = avatarUrl
        ? loadedImagesCache.current.has(avatarUrl)
        : false;
      const [imageLoading, setImageLoading] = React.useState(() => {
        // If in cache, never show loading
        if (isInCache) {
          hasCheckedCacheRef.current = true;
          return false;
        }
        return true;
      });
      const [imageError, setImageError] = React.useState(false);

      const getInitials = (person) => {
        if (person?.first_name && person?.last_name) {
          return (
            person.first_name.charAt(0) + person.last_name.charAt(0)
          ).toUpperCase();
        }
        // Fallback for backward compatibility
        if (person?.name) {
          const parts = person.name.split(" ");
          if (parts.length >= 2) {
            return (
              parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
            ).toUpperCase();
          }
          return person.name.charAt(0).toUpperCase() || "P";
        }
        return "P";
      };

      // Only run once per avatar URL - check cache and pre-load if needed
      React.useEffect(() => {
        if (!avatarUrl || hasCheckedCacheRef.current) return;

        // If already in cache, we're done
        if (loadedImagesCache.current.has(avatarUrl)) {
          setImageLoading(false);
          hasCheckedCacheRef.current = true;
          return;
        }

        // Pre-check browser cache using Image object
        const testImg = new Image();
        let isHandled = false;

        testImg.onload = () => {
          if (!isHandled) {
            isHandled = true;
            loadedImagesCache.current.add(avatarUrl);
            setImageLoading(false);
            setImageError(false);
            hasCheckedCacheRef.current = true;
          }
        };

        testImg.onerror = () => {
          if (!isHandled) {
            isHandled = true;
            setImageLoading(false);
            setImageError(true);
            hasCheckedCacheRef.current = true;
          }
        };

        // Set src - if cached, onload fires immediately
        testImg.src = avatarUrl;

        // Fallback timeout in case image never loads
        const timeout = setTimeout(() => {
          if (!isHandled) {
            isHandled = true;
            hasCheckedCacheRef.current = true;
          }
        }, 5000);

        return () => {
          clearTimeout(timeout);
        };
      }, [avatarUrl]);

      // Handle image load event - add to cache when loaded
      const handleImageLoad = React.useCallback(() => {
        if (avatarUrl) {
          loadedImagesCache.current.add(avatarUrl);
        }
        setImageLoading(false);
        hasCheckedCacheRef.current = true;
      }, [avatarUrl]);

      // Handle image error
      const handleImageError = React.useCallback((e) => {
        setImageLoading(false);
        setImageError(true);
        e.target.style.display = "none";
      }, []);

      if (person.avatar_path && !imageError && avatarUrl) {
        return (
          <div
            className="rounded-circle overflow-hidden border position-relative"
            style={{
              width: size,
              height: size,
              borderColor: "#e1e6ef",
              flexShrink: 0,
              backgroundColor: "#f4f6fb",
            }}
          >
            {/* Loading skeleton */}
            {imageLoading && (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style={{
                  backgroundColor: "#e9ecef",
                  zIndex: 1,
                }}
              >
                <div
                  className="w-100 h-100 rounded-circle"
                  style={{
                    background:
                      "linear-gradient(90deg, #e9ecef 0%, #f8f9fa 50%, #e9ecef 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              </div>
            )}
            <img
              ref={imgRef}
              src={avatarUrl}
              alt={`${getFullName(person)}'s avatar`}
              className="rounded-circle border"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: imageLoading ? 0 : 1,
                transition: "opacity 0.3s ease-in-out",
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        );
      }

      return (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{
            width: size,
            height: size,
            backgroundColor: "#0E254B",
            flexShrink: 0,
          }}
        >
          {getInitials(person)}
        </div>
      );
    },
    (prevProps, nextProps) => {
      // Only re-render if person data actually changed
      return (
        prevProps.person?.id === nextProps.person?.id &&
        prevProps.person?.avatar_path === nextProps.person?.avatar_path &&
        prevProps.size === nextProps.size
      );
    }
  );

  const handleViewDetails = (person) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    // List already has personnel with footprint from API; open modal instantly
    setSelectedPersonnel(person);
    setShowDetailsModal(true);
  };

  const handleNumberClick = (title, value) => {
    setNumberViewModal({
      show: true,
      title,
      formattedValue: value != null && value !== "" ? String(value) : "—",
    });
  };

  const handleAddPersonnel = () => {
    setEditingPersonnel(null);
    setShowPersonnelForm(true);
  };

  const handleEditPersonnel = (person) => {
    setEditingPersonnel(person);
    setShowPersonnelForm(true);
  };

  const handlePersonnelSave = (savedPersonnel) => {
    if (editingPersonnel) {
      setPersonnel((prev) =>
        prev.map((person) =>
          person.id === savedPersonnel.id ? savedPersonnel : person
        )
      );
    } else {
      setPersonnel((prev) => [...prev, savedPersonnel]);
    }
    setShowPersonnelForm(false);
    setEditingPersonnel(null);
  };

  const handleDeletePersonnel = async (person) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    if (currentUser?.role === "personnel" && person.id === currentUser?.id) {
      showAlert.error("Error", "You cannot delete your own account");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete Personnel Account",
      `Are you sure you want to permanently delete ${getFullName(
        person
      )}'s account?`,
      "Yes, Delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(person.id);
    showAlert.processing(
      "Deleting Personnel Account",
      "Please wait while we remove this user."
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/admin/personnel/${person.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        showToast.success("Personnel account deleted successfully!");
        setPersonnel((prev) => prev.filter((p) => p.id !== person.id));
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete personnel account");
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deleting personnel:", error);
      showAlert.error(
        "Deletion Failed",
        error.message || "Failed to delete personnel account"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const isActionDisabled = (personnelId = null) => {
    return actionLock || (actionLoading && actionLoading !== personnelId);
  };

  const formatLocalDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "" };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: "Invalid Date", time: "" };
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch (error) {
      return { date: "Date Error", time: "" };
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPersonnel = filteredPersonnel.slice(startIndex, endIndex);

  if (loading && initialLoading) {
    return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading personnel..." />
      </div>
    );
  }

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 personnel-management-container ${
        !loading ? "fadeIn" : ""
      }`}
    >
      <style>{`
        /* Clear button: strong contrast on hover (white on primary) – match Activity Log */
        .personnel-management-container .clear-filters-btn:not(:disabled):hover {
          color: #fff !important;
          border-color: var(--primary-color) !important;
          background-color: var(--primary-color) !important;
        }
        .personnel-management-container .clear-filters-btn:not(:disabled):hover i {
          color: #fff !important;
        }
        @media (min-width: 992px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.75rem !important;
          }
        }
        @media (min-width: 1200px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.5rem !important;
          }
        }
        @media (min-width: 1400px) {
          .personnel-management-container .table th,
          .personnel-management-container .table td {
            padding: 0.5rem 0.4rem !important;
          }
        }

        /* Mobile: sticky # and Actions columns when table scrolls horizontally (match Clients/AR) */
        @media (max-width: 767.98px) {
          .personnel-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .personnel-table-wrap table {
            min-width: 800px;
            border-collapse: separate;
            border-spacing: 0;
          }
          .personnel-table-wrap .je-col-index,
          .personnel-table-wrap .je-col-actions {
            position: sticky;
            background-color: var(--bs-table-bg);
            z-index: 5;
          }
          .personnel-table-wrap thead .je-col-index,
          .personnel-table-wrap thead .je-col-actions {
            z-index: 7;
            background: var(--background-light, #f8f9fa);
          }
          .personnel-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }
          .personnel-table-wrap .je-col-actions {
            left: 44px;
            min-width: 128px;
            width: 128px;
          }
          .personnel-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .personnel-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: var(--bs-table-striped-bg);
          }
          .personnel-table-wrap.table-hover > tbody > tr:hover > .je-col-index,
          .personnel-table-wrap.table-hover > tbody > tr:hover > .je-col-actions {
            background-color: var(--bs-table-hover-bg);
          }
        }
      `}</style>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaUsers className="me-2" />
            Personnel Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage personnel accounts and access permissions
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddPersonnel}
            disabled={isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              borderWidth: "2px",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <i className="fas fa-plus me-1"></i>
            Add Personnel
          </button>
          <button
            className="btn btn-sm"
            onClick={refreshAllData}
            disabled={loading || isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--primary-color)",
              color: "var(--primary-color)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                e.target.style.backgroundColor = "var(--primary-color)";
                e.target.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "var(--primary-color)";
            }}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <>
        {/* Statistics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-color)" }}
                    >
                      Total Personnel
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="h4 mb-0 fw-bold"
                      style={{
                        color: "var(--primary-color)",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        !loading &&
                        handleNumberClick("Total Personnel", personnel.length)
                      }
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        !loading &&
                        handleNumberClick("Total Personnel", personnel.length)
                      }
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.opacity = "0.8";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {personnel.length}
                    </div>
                    <div
                      className="small mt-1"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                      }}
                    >
                      <i className="fas fa-info-circle me-1" />
                      Click to view full number
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-users fa-2x"
                      style={{ color: "var(--primary-light)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--accent-color)" }}
                    >
                      Active Personnel
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="h4 mb-0 fw-bold"
                      style={{
                        color: "var(--accent-color)",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        !loading &&
                        handleNumberClick(
                          "Active Personnel",
                          personnel.filter((p) => p.is_active !== false).length
                        )
                      }
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        !loading &&
                        handleNumberClick(
                          "Active Personnel",
                          personnel.filter((p) => p.is_active !== false).length
                        )
                      }
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.opacity = "0.8";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {personnel.filter((p) => p.is_active !== false).length}
                    </div>
                    <div
                      className="small mt-1"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                      }}
                    >
                      <i className="fas fa-info-circle me-1" />
                      Click to view full number
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-user-check fa-2x"
                      style={{ color: "var(--accent-light)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      Filtered Results
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="h4 mb-0 fw-bold"
                      style={{
                        color: "var(--primary-dark)",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        !loading &&
                        handleNumberClick(
                          "Filtered Results",
                          filteredPersonnel.length
                        )
                      }
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        !loading &&
                        handleNumberClick(
                          "Filtered Results",
                          filteredPersonnel.length
                        )
                      }
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.opacity = "0.8";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {filteredPersonnel.length}
                    </div>
                    <div
                      className="small mt-1"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                      }}
                    >
                      <i className="fas fa-info-circle me-1" />
                      Click to view full number
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-filter fa-2x"
                      style={{ color: "var(--primary-color)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      Current Page
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="h4 mb-0 fw-bold"
                      style={{
                        color: "var(--primary-dark)",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        !loading &&
                        handleNumberClick(
                          "Current Page",
                          `${currentPage} / ${totalPages}`
                        )
                      }
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        !loading &&
                        handleNumberClick(
                          "Current Page",
                          `${currentPage} / ${totalPages}`
                        )
                      }
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.opacity = "0.8";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {currentPage}/{totalPages}
                    </div>
                    <div
                      className="small mt-1"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                      }}
                    >
                      <i className="fas fa-info-circle me-1" />
                      Click to view full number
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-file-alt fa-2x"
                      style={{ color: "var(--primary-color)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div
          className="card border-0 shadow-sm mb-3"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div className="card-body p-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Search Personnel
                </label>
                <div className="input-group input-group-sm">
                  <span
                    className="input-group-text"
                    style={{
                      backgroundColor: "var(--background-light)",
                      borderColor: "var(--input-border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, employee ID, email, position, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-sm clear-search-btn"
                      type="button"
                      onClick={() => setSearchTerm("")}
                      disabled={isActionDisabled()}
                      style={{
                        color: "#6c757d",
                        backgroundColor: "transparent",
                        border: "none",
                        padding: "0.25rem 0.5rem",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          const icon = e.target.querySelector("i");
                          if (icon) icon.style.color = "white";
                          e.target.style.color = "white";
                          e.target.style.backgroundColor = "#dc3545";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.target.disabled) {
                          const icon = e.target.querySelector("i");
                          if (icon) icon.style.color = "#6c757d";
                          e.target.style.color = "#6c757d";
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <i
                        className="fas fa-times"
                        style={{ color: "inherit" }}
                      ></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-2">
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Status
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  disabled={isActionDisabled()}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-md-2">
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Items per page
                </label>
                <select
                  className="form-select form-select-sm"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  disabled={isActionDisabled()}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>
              <div className="col-md-2 col-lg-auto align-self-end">
                <button
                  type="button"
                  className="btn btn-sm w-100 clear-filters-btn"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters || loading || isActionDisabled()}
                  title="Clear all filters"
                  style={{
                    transition: "all 0.2s ease-in-out",
                    border: "2px solid var(--primary-color)",
                    color: "var(--primary-color)",
                    backgroundColor: "transparent",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      const btn = e.currentTarget;
                      btn.style.transform = "translateY(-1px)";
                      btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
                      btn.style.backgroundColor = "var(--primary-color)";
                      btn.style.borderColor = "var(--primary-color)";
                      btn.style.color = "#fff";
                      const icon = btn.querySelector("i");
                      if (icon) icon.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.transform = "translateY(0)";
                    btn.style.boxShadow = "none";
                    btn.style.backgroundColor = "transparent";
                    btn.style.borderColor = "var(--primary-color)";
                    btn.style.color = "var(--primary-color)";
                    const icon = btn.querySelector("i");
                    if (icon) icon.style.color = "";
                  }}
                >
                  <i
                    className="fas fa-times-circle me-1"
                    style={{ color: "inherit" }}
                  />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className="card border-0 shadow-sm"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div
            className="card-header border-bottom-0 py-2"
            style={{
              background: "var(--topbar-bg)",
              color: "var(--topbar-text)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-semibold text-white">
                <i className="fas fa-users-cog me-2"></i>
                Personnel
                <small className="opacity-75 ms-2 text-white">
                  ({filteredPersonnel.length} found
                  {searchTerm || filterStatus !== "all"
                    ? " after filtering"
                    : ""}
                  )
                </small>
              </h5>
            </div>
          </div>

          <div className="card-body p-0">
            {currentPersonnel.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-users fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  {personnel.length === 0
                    ? "No Personnel"
                    : "No Matching Results"}
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {personnel.length === 0
                    ? "No personnel have been registered yet."
                    : "Try adjusting your search criteria."}
                </p>
                {searchTerm && (
                  <button
                    className="btn btn-sm clear-search-main-btn"
                    onClick={() => setSearchTerm("")}
                    disabled={loading || isActionDisabled()}
                    style={{
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                      border: "2px solid var(--primary-color)",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                        e.target.style.setProperty(
                          "color",
                          "white",
                          "important"
                        );
                        const icon = e.target.querySelector("i");
                        if (icon) {
                          icon.style.color = "white";
                          icon.style.setProperty("color", "white", "important");
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "var(--primary-color)";
                        e.target.style.setProperty(
                          "color",
                          "var(--primary-color)",
                          "important"
                        );
                        const icon = e.target.querySelector("i");
                        if (icon) {
                          icon.style.color = "var(--primary-color)";
                          icon.style.setProperty(
                            "color",
                            "var(--primary-color)",
                            "important"
                          );
                        }
                      }
                    }}
                  >
                    <i
                      className="fas fa-times me-1"
                      style={{ color: "inherit" }}
                    ></i>
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="table-responsive personnel-table-wrap table-striped table-hover">
                  <table
                    className="table table-striped table-hover mb-0"
                    style={{ tableLayout: "auto" }}
                  >
                    <thead
                      style={{ backgroundColor: "var(--background-light)" }}
                    >
                      <tr>
                        <th
                          className="text-center small fw-semibold je-col-index"
                          style={{ width: "5%" }}
                        >
                          #
                        </th>
                        <th
                          className="text-center small fw-semibold je-col-actions"
                          style={{ width: "12%" }}
                        >
                          Actions
                        </th>
                        <th
                          style={{ width: "auto", minWidth: "200px" }}
                          className="small fw-semibold text-white"
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                            onClick={() => handleSort("name")}
                            disabled={isActionDisabled()}
                            style={{ color: "white" }}
                          >
                            Personnel
                            <i
                              className={`ms-1 ${getSortIcon("name")}`}
                              style={{ color: "white" }}
                            ></i>
                          </button>
                        </th>
                        <th
                          style={{ width: "15%", minWidth: "140px" }}
                          className="small fw-semibold"
                        >
                          Contact
                        </th>
                        <th
                          style={{ width: "8%", minWidth: "80px" }}
                          className="text-center small fw-semibold"
                        >
                          Status
                        </th>
                        <th
                          style={{ width: "12%", minWidth: "140px" }}
                          className="small fw-semibold text-white"
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                            onClick={() => handleSort("created_at")}
                            disabled={isActionDisabled()}
                            style={{ color: "white" }}
                          >
                            Registered
                            <i
                              className={`ms-1 ${getSortIcon("created_at")}`}
                              style={{ color: "white" }}
                            ></i>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPersonnel.map((person, index) => {
                        const createdInfo = formatLocalDateTime(
                          person.created_at
                        );
                        return (
                          <tr key={person.id} className="align-middle">
                            <td
                              className="text-center fw-bold je-col-index"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {startIndex + index + 1}
                            </td>
                            <td className="text-center je-col-actions">
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-info btn-sm text-white"
                                  onClick={() => handleViewDetails(person)}
                                  disabled={
                                    isActionDisabled(person.id) ||
                                    actionLoading === person.id
                                  }
                                  title="View Details"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    transition: "all 0.2s ease-in-out",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.transform =
                                        "translateY(-1px)";
                                      e.target.style.boxShadow =
                                        "0 4px 8px rgba(0,0,0,0.2)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                  }}
                                >
                                  {actionLoading === person.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                      aria-label="Loading"
                                    />
                                  ) : (
                                    <i
                                      className="fas fa-eye"
                                      style={{ fontSize: "0.875rem" }}
                                    />
                                  )}
                                </button>

                                <button
                                  className="btn btn-success btn-sm text-white"
                                  onClick={() => handleEditPersonnel(person)}
                                  disabled={isActionDisabled(person.id)}
                                  title="Edit Personnel"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    transition: "all 0.2s ease-in-out",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.transform =
                                        "translateY(-1px)";
                                      e.target.style.boxShadow =
                                        "0 4px 8px rgba(0,0,0,0.2)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                  }}
                                >
                                  {actionLoading === person.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                    ></span>
                                  ) : (
                                    <i
                                      className="fas fa-edit"
                                      style={{ fontSize: "0.875rem" }}
                                    ></i>
                                  )}
                                </button>

                                <button
                                  className="btn btn-danger btn-sm text-white"
                                  onClick={() => handleDeletePersonnel(person)}
                                  disabled={
                                    isActionDisabled(person.id) ||
                                    (currentUser?.role === "personnel" &&
                                      person.id === currentUser?.id)
                                  }
                                  title={
                                    currentUser?.role === "personnel" &&
                                    person.id === currentUser?.id
                                      ? "Cannot delete your own account"
                                      : "Delete Personnel"
                                  }
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    transition: "all 0.2s ease-in-out",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.transform =
                                        "translateY(-1px)";
                                      e.target.style.boxShadow =
                                        "0 4px 8px rgba(0,0,0,0.2)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                  }}
                                >
                                  {actionLoading === person.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                    ></span>
                                  ) : (
                                    <i
                                      className="fas fa-trash"
                                      style={{ fontSize: "0.875rem" }}
                                    ></i>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td
                              style={{ maxWidth: "300px", overflow: "hidden" }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <PersonnelAvatar person={person} />
                                <div
                                  className="flex-grow-1"
                                  style={{ minWidth: 0, overflow: "hidden" }}
                                >
                                  <div
                                    className="fw-medium mb-1"
                                    style={{
                                      color: "var(--text-primary)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={getFullName(person)}
                                  >
                                    {getFullName(person)}
                                  </div>
                                  <div
                                    className="small"
                                    style={{
                                      color: "var(--text-muted)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={`@${person.username}`}
                                  >
                                    @{person.username}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{ maxWidth: "200px", overflow: "hidden" }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                className="text-truncate d-block"
                                style={{
                                  color: "var(--text-primary)",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textUnderlineOffset: "2px",
                                  transition: "all 0.2s ease",
                                  maxWidth: "100%",
                                }}
                                title="Click to view full number"
                                onClick={() =>
                                  handleNumberClick(
                                    "Contact",
                                    person.phone || "Not provided"
                                  )
                                }
                                onKeyDown={(e) =>
                                  (e.key === "Enter" || e.key === " ") &&
                                  handleNumberClick(
                                    "Contact",
                                    person.phone || "Not provided"
                                  )
                                }
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = "0.8";
                                  e.currentTarget.style.transform =
                                    "scale(1.02)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = "1";
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                              >
                                {person.phone || "Contact not provided"}
                              </div>
                            </td>
                            <td className="text-center">
                              <span
                                className={`badge ${
                                  person.is_active !== false
                                    ? "bg-success"
                                    : "bg-secondary"
                                }`}
                              >
                                {person.is_active !== false
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <small
                                style={{
                                  color: "var(--text-muted)",
                                  paddingRight: "1rem",
                                  display: "block",
                                }}
                              >
                                {createdInfo.date} {createdInfo.time}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="card-footer bg-white border-top px-3 py-2">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                      <div className="text-center text-md-start">
                        <small style={{ color: "var(--text-muted)" }}>
                          Showing{" "}
                          <span
                            className="fw-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + 1}-
                            {Math.min(endIndex, filteredPersonnel.length)}
                          </span>{" "}
                          of{" "}
                          <span
                            className="fw-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {filteredPersonnel.length}
                          </span>{" "}
                          personnel
                        </small>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1 || isActionDisabled()}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: "2px solid var(--primary-color)",
                            color: "var(--primary-color)",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-color)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "var(--primary-color)";
                          }}
                        >
                          <i className="fas fa-chevron-left me-1"></i>
                          Previous
                        </button>

                        <div className="d-none d-md-flex gap-1">
                          {(() => {
                            let pages = [];
                            const maxVisiblePages = 5;

                            if (totalPages <= maxVisiblePages) {
                              pages = Array.from(
                                { length: totalPages },
                                (_, i) => i + 1
                              );
                            } else {
                              pages.push(1);
                              let start = Math.max(2, currentPage - 1);
                              let end = Math.min(
                                totalPages - 1,
                                currentPage + 1
                              );

                              if (currentPage <= 2) {
                                end = 4;
                              } else if (currentPage >= totalPages - 1) {
                                start = totalPages - 3;
                              }

                              if (start > 2) {
                                pages.push("...");
                              }

                              for (let i = start; i <= end; i++) {
                                pages.push(i);
                              }

                              if (end < totalPages - 1) {
                                pages.push("...");
                              }

                              if (totalPages > 1) {
                                pages.push(totalPages);
                              }
                            }

                            return pages.map((page, index) => (
                              <button
                                key={index}
                                className="btn btn-sm"
                                onClick={() =>
                                  page !== "..." && setCurrentPage(page)
                                }
                                disabled={page === "..." || isActionDisabled()}
                                style={{
                                  transition: "all 0.2s ease-in-out",
                                  border: `2px solid ${
                                    currentPage === page
                                      ? "var(--primary-color)"
                                      : "var(--input-border)"
                                  }`,
                                  color:
                                    currentPage === page
                                      ? "white"
                                      : "var(--text-primary)",
                                  backgroundColor:
                                    currentPage === page
                                      ? "var(--primary-color)"
                                      : "transparent",
                                  minWidth: "40px",
                                }}
                                onMouseEnter={(e) => {
                                  if (
                                    !e.target.disabled &&
                                    currentPage !== page
                                  ) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 2px 4px rgba(0,0,0,0.1)";
                                    e.target.style.backgroundColor =
                                      "var(--primary-color)";
                                    e.target.style.color = "white";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (
                                    !e.target.disabled &&
                                    currentPage !== page
                                  ) {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                    e.target.style.backgroundColor =
                                      "transparent";
                                    e.target.style.color =
                                      "var(--text-primary)";
                                  }
                                }}
                              >
                                {page}
                              </button>
                            ));
                          })()}
                        </div>

                        <div className="d-md-none">
                          <small style={{ color: "var(--text-muted)" }}>
                            Page {currentPage} of {totalPages}
                          </small>
                        </div>

                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={
                            currentPage === totalPages || isActionDisabled()
                          }
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: "2px solid var(--primary-color)",
                            color: "var(--primary-color)",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-color)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "var(--primary-color)";
                          }}
                        >
                          Next
                          <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </>

      {/* Modals */}
      {showDetailsModal && selectedPersonnel && (
        <PersonnelDetailsModal
          personnel={selectedPersonnel}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPersonnel(null);
          }}
        />
      )}
      {showPersonnelForm && (
        <AddPersonnelModal
          personnel={editingPersonnel}
          onClose={() => {
            setShowPersonnelForm(false);
            setEditingPersonnel(null);
          }}
          onSave={handlePersonnelSave}
        />
      )}
      {numberViewModal.show && (
        <NumberViewModal
          title={numberViewModal.title}
          value={numberViewModal.formattedValue}
          onClose={() =>
            setNumberViewModal({ ...numberViewModal, show: false })
          }
        />
      )}
    </div>
  );
};

export default PersonnelManagement;
