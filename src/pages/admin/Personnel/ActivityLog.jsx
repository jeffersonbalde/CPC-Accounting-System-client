import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import ActivityLogDetailsModal from "./ActivityLogDetailsModal";
import NumberViewModal from "../../../components/admin/NumberViewModal";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const ActivityLog = () => {
  const { request } = useAuth();
  /** All logs loaded once (like Clients/AR) – no refetch on pagination */
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    subject_type: "",
    date_from: "",
    date_to: "",
  });
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [personnelList, setPersonnelList] = useState([]);
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    formattedValue: "",
  });

  const getPersonnelLabel = (p) => {
    if (!p) return "";
    const name =
      p.first_name && p.last_name
        ? `${p.first_name} ${p.last_name}`.trim()
        : p.name || "";
    return name ? `${name} (@${p.username || ""})` : `@${p.username || p.id}`;
  };

  /** Corporate-style action badge: distinct color per action so admins can scan quickly */
  const getActionBadgeConfig = (action) => {
    const a = (action || "").toLowerCase();
    if (a === "created")
      return { label: "Created", badgeClass: "bg-success", icon: "fa-plus" };
    if (a === "updated")
      return { label: "Updated", badgeClass: "bg-info", icon: "fa-edit" };
    if (a === "deleted")
      return { label: "Deleted", badgeClass: "bg-danger", icon: "fa-trash" };
    if (a === "deactivated")
      return {
        label: "Deactivated",
        badgeClass: "bg-warning text-dark",
        icon: "fa-ban",
      };
    if (a === "login")
      return {
        label: "Login",
        badgeClass: "bg-secondary",
        icon: "fa-sign-in-alt",
      };
    if (a === "logout")
      return {
        label: "Logout",
        badgeClass: "bg-secondary",
        icon: "fa-sign-out-alt",
      };
    return {
      label: action || "—",
      badgeClass: "bg-secondary",
      icon: "fa-circle",
    };
  };

  /** Human-readable subject type for admins (no technical model names) */
  const getSubjectTypeLabel = (subjectType) => {
    if (!subjectType) return "—";
    const s = String(subjectType);
    if (s.includes("JournalEntry") || s === "journal_entry")
      return "Journal Entry";
    if (s === "client" || s.includes("Client")) return "Client";
    if (s === "invoice" || s.includes("Invoice")) return "Invoice";
    if (s.includes("Supplier") || s === "supplier") return "Supplier";
    if (s.includes("Bill") || s === "bill") return "Bill";
    if (s === "payment" || s.includes("Payment")) return "Payment";
    if (s.includes("AuthorizationCode")) return "Authorization Code";
    return s;
  };

  /**
   * Professional, descriptive phrase for tracking sensitive data:
   * "what record was added/deleted/updated" so admins know exactly what changed.
   */
  const getSubjectTypeDescription = (subjectType, action) => {
    const act = (action || "").toLowerCase();
    if (act === "login") return "User login";
    if (act === "logout") return "User logout";
    const subject = getSubjectTypeLabel(subjectType);
    if (!subject || subject === "—") return action ? `${action}` : "—";
    const actionPhrase =
      act === "created"
        ? "record created"
        : act === "updated"
        ? "record updated"
        : act === "deleted"
        ? "record deleted"
        : act === "deactivated"
        ? "record deactivated"
        : action
        ? String(action).toLowerCase()
        : "record modified";
    return `${subject} ${actionPhrase}`;
  };

  /** Load all activity logs once (fetch all pages and merge), like Clients/AR */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const perPage = 500;
      let page = 1;
      let lastPage = 1;
      const merged = [];

      do {
      const params = new URLSearchParams();
        params.set("per_page", String(perPage));
        params.set("page", String(page));
      const data = await request(`/activity-logs?${params.toString()}`);
        const chunk = data.data || [];
        merged.push(...chunk);
        lastPage = data.last_page || 1;
        page += 1;
      } while (page <= lastPage);

      setAllLogs(merged);
    } catch (err) {
      console.error(err);
      showAlert.error("Error", "Failed to load activity logs.");
      setAllLogs([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const data = await request("/admin/personnel");
        const list = data.personnel || data.data || data || [];
        setPersonnelList(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch personnel for filter:", err);
        setPersonnelList([]);
      }
    };
    fetchPersonnel();
  }, []);

  /** Client-side filter (no refetch) – same pattern as Clients/AR. Exclude admin / System Administrator – personnel only. */
  const filteredLogs = useMemo(() => {
    let list = allLogs.filter((l) => {
      if (l.user_type === "admin") return false;
      const name = String(l.user_name || "").trim();
      if (name === "System Administrator") return false;
      return true;
    });
    if (filters.user_id) {
      list = list.filter(
        (l) => String(l.user_id || "") === String(filters.user_id)
      );
    }
    if (filters.action) {
      list = list.filter((l) =>
        String(l.action || "")
          .toLowerCase()
          .includes(String(filters.action).toLowerCase())
      );
    }
    if (filters.subject_type) {
      const q = String(filters.subject_type).toLowerCase();
      list = list.filter((l) => {
        const raw = String(l.subject_type || "").toLowerCase();
        const label = getSubjectTypeLabel(l.subject_type).toLowerCase();
        const desc = getSubjectTypeDescription(
          l.subject_type,
          l.action
        ).toLowerCase();
        return raw.includes(q) || label.includes(q) || desc.includes(q);
      });
    }
    if (filters.date_from) {
      list = list.filter((l) => {
        const d = l.created_at
          ? new Date(l.created_at).toISOString().slice(0, 10)
          : "";
        return d >= filters.date_from;
      });
    }
    if (filters.date_to) {
      list = list.filter((l) => {
        const d = l.created_at
          ? new Date(l.created_at).toISOString().slice(0, 10)
          : "";
        return d <= filters.date_to;
      });
    }
    return list;
  }, [allLogs, filters]);

  /** Client-side pagination – no fetch when changing page */
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const hasActiveFilters =
    !!filters.user_id ||
    !!filters.action ||
    !!filters.subject_type ||
    !!filters.date_from ||
    !!filters.date_to;

  const handleClearFilters = () => {
    setFilters({
      user_id: "",
      action: "",
      subject_type: "",
      date_from: "",
      date_to: "",
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleNumberClick = (title, value) => {
    setNumberViewModal({
      show: true,
      title,
      formattedValue: value != null && value !== "" ? String(value) : "—",
    });
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.action) params.set("action", filters.action);
      if (filters.subject_type)
        params.set("subject_type", filters.subject_type);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      const token = localStorage.getItem("auth_token");
      const url = `${API_BASE_URL}/activity-logs/export/excel?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast.success("Export completed", "Activity logs exported to CSV.");
    } catch (err) {
      showAlert.error("Export Failed", err.message || "Could not export logs.");
    }
  };

  const exportPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.action) params.set("action", filters.action);
      if (filters.subject_type)
        params.set("subject_type", filters.subject_type);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      const data = await request(
        `/activity-logs/export/pdf?${params.toString()}`
      );
      if (data.html) {
        const w = window.open("", "_blank");
        w.document.write(data.html);
        w.document.close();
        w.print();
        showToast.success("Print", "Print dialog opened.");
      }
    } catch (err) {
      showAlert.error(
        "Print / PDF Failed",
        err.message || "Could not open print."
      );
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "-", time: "" };
    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "-", time: "" };
    }
  };

  if (loading && initialLoading) {
  return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading activity logs..." />
      </div>
    );
  }

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 activity-log-container ${
        !loading ? "fadeIn" : ""
      }`}
    >
      <style>{`
        /* Clear button: strong contrast on hover (white on primary) */
        .activity-log-container .clear-filters-btn:not(:disabled):hover {
          color: #fff !important;
          border-color: var(--primary-color) !important;
          background-color: var(--primary-color) !important;
        }
        .activity-log-container .clear-filters-btn:not(:disabled):hover i {
          color: #fff !important;
        }
        /* Filter panel: responsive on mobile */
        @media (max-width: 575.98px) {
          .activity-log-container .card-body .form-control,
          .activity-log-container .card-body .form-select,
          .activity-log-container .card-body .input-group {
            max-width: 100%;
            width: 100%;
          }
          .activity-log-container .card-body .input-group .form-control {
            flex: 1;
            min-width: 0;
          }
        }
        /* Compact, professional table – normal row height */
        .activity-log-table-wrap .table th,
        .activity-log-table-wrap .table td {
          padding: 0.35rem 0.5rem;
          font-size: 0.8125rem;
          vertical-align: middle;
          line-height: 1.35;
        }
        .activity-log-table-wrap .table thead th {
          padding: 0.4rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color, #dee2e6);
        }
        .activity-log-table-wrap .table tbody tr {
          min-height: 0;
        }
        .activity-log-table-wrap .btn.btn-sm {
          width: 28px;
          height: 28px;
          min-width: 28px;
          min-height: 28px;
        }
        .activity-log-table-wrap .btn.btn-sm i {
          font-size: 0.8125rem;
        }
        @media (max-width: 767.98px) {
          .activity-log-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .activity-log-table-wrap table {
            min-width: 900px;
            border-collapse: separate;
            border-spacing: 0;
          }
          .activity-log-table-wrap .je-col-index,
          .activity-log-table-wrap .je-col-actions {
            position: sticky;
            background-color: var(--bs-table-bg);
            z-index: 5;
          }
          .activity-log-table-wrap thead .je-col-index,
          .activity-log-table-wrap thead .je-col-actions {
            z-index: 7;
            background: var(--background-light, #f8f9fa);
          }
          .activity-log-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }
          .activity-log-table-wrap .je-col-actions {
            left: 44px;
            min-width: 100px;
            width: 100px;
          }
          .activity-log-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .activity-log-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: var(--bs-table-striped-bg);
          }
          .activity-log-table-wrap.table-hover > tbody > tr:hover > .je-col-index,
          .activity-log-table-wrap.table-hover > tbody > tr:hover > .je-col-actions {
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
            <i className="fas fa-clipboard-list me-2" />
            Activity Log
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            View login, logout, and all system actions (create, update, delete)
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
            className="btn btn-sm btn-primary text-white"
              onClick={exportExcel}
            disabled={loading}
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
            <i className="fas fa-file-csv me-1" />
            Export CSV
            </button>
            <button
              type="button"
            className="btn btn-sm"
              onClick={exportPdf}
            disabled={loading}
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
            <i className="fas fa-print me-1" />
              Print / PDF
            </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => fetchLogs()}
            disabled={loading}
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
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
          </div>
        </div>

      {/* Stats Cards */}
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
                    Total (this page)
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
                      handleNumberClick("Total (this page)", currentLogs.length)
                    }
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      !loading &&
                      handleNumberClick("Total (this page)", currentLogs.length)
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
                    {currentLogs.length}
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
                    className="fas fa-list fa-2x"
                    style={{ color: "var(--primary-light)", opacity: 0.7 }}
                  />
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
                    Total Records
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
                      handleNumberClick("Total Records", filteredLogs.length)
                    }
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      !loading &&
                      handleNumberClick("Total Records", filteredLogs.length)
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
                    {filteredLogs.length}
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
                    className="fas fa-database fa-2x"
                    style={{ color: "var(--accent-light)", opacity: 0.7 }}
                  />
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
                    style={{
                      color: "var(--primary-dark, var(--primary-color))",
                    }}
                  >
                    Page
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="h4 mb-0 fw-bold"
                    style={{
                      color: "var(--primary-dark, var(--primary-color))",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() =>
                      !loading &&
                      handleNumberClick(
                        "Page",
                        `${currentPage} / ${totalPages}`
                      )
                    }
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      !loading &&
                      handleNumberClick(
                        "Page",
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
                    {currentPage} / {totalPages}
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
                  />
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
                    style={{
                      color: "var(--primary-dark, var(--primary-color))",
                    }}
                  >
                    Per Page
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="h4 mb-0 fw-bold"
                    style={{
                      color: "var(--primary-dark, var(--primary-color))",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() =>
                      !loading && handleNumberClick("Per Page", itemsPerPage)
                    }
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      !loading &&
                      handleNumberClick("Per Page", itemsPerPage)
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
                    {itemsPerPage}
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
                    className="fas fa-sliders-h fa-2x"
                    style={{ color: "var(--primary-color)", opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div
        className="card border-0 shadow-sm mb-3"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div className="card-body p-3 p-md-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Personnel
              </label>
              <select
                className="form-select form-select-sm w-100"
                value={filters.user_id}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, user_id: e.target.value }))
                }
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                  maxWidth: "100%",
                }}
              >
                <option value="">All personnel</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPersonnelLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Action
              </label>
              <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control form-control-sm"
                  placeholder="e.g. created, updated"
                value={filters.action}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, action: e.target.value }))
                }
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
                {filters.action && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setFilters((f) => ({ ...f, action: "" }))}
                    title="Clear action"
                    style={{
                      borderColor: "var(--input-border)",
                      color: "var(--text-muted)",
                      padding: "0 0.5rem",
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget;
                      btn.style.color = "var(--primary-color)";
                      btn.style.borderColor = "var(--primary-color)";
                      btn.style.backgroundColor = "rgba(12, 32, 63, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget;
                      btn.style.color = "var(--text-muted)";
                      btn.style.borderColor = "var(--input-border)";
                      btn.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
            </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Subject Type
              </label>
              <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control form-control-sm"
                  placeholder="e.g. journal entry record created, client record deleted"
                value={filters.subject_type}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, subject_type: e.target.value }))
                }
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
                {filters.subject_type && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setFilters((f) => ({ ...f, subject_type: "" }))
                    }
                    title="Clear subject type"
                    style={{
                      borderColor: "var(--input-border)",
                      color: "var(--text-muted)",
                      padding: "0 0.5rem",
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget;
                      btn.style.color = "var(--primary-color)";
                      btn.style.borderColor = "var(--primary-color)";
                      btn.style.backgroundColor = "rgba(12, 32, 63, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget;
                      btn.style.color = "var(--text-muted)";
                      btn.style.borderColor = "var(--input-border)";
                      btn.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
            </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Date From
              </label>
              <input
                type="date"
                className="form-control form-control-sm w-100"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_from: e.target.value }))
                }
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Date To
              </label>
              <input
                type="date"
                className="form-control form-control-sm w-100"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_to: e.target.value }))
                }
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                Per Page
              </label>
              <select
                className="form-select form-select-sm w-100"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-auto align-self-end">
              <button
                type="button"
                className="btn btn-sm w-100 clear-filters-btn"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters || loading}
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
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        className="card border-0 shadow-sm"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div
          className="card-header border-bottom py-2"
          style={{
            background: "var(--topbar-bg)",
            color: "var(--topbar-text)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-clipboard-list me-2" />
              Activity Log
              <small className="opacity-75 ms-2 text-white">
                ({filteredLogs.length} total
                {(filters.user_id ||
                  filters.action ||
                  filters.subject_type ||
                  filters.date_from ||
                  filters.date_to) &&
                  " after filtering"}
                )
              </small>
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex align-items-center justify-content-center py-5">
              <LoadingSpinner text="Loading logs..." />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-clipboard-list fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                />
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                No Activity Logs
              </h5>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                No activity logs match your filters. Try adjusting criteria or
                clear filters.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive activity-log-table-wrap table-striped table-hover">
                <table
                  className="table table-sm table-striped table-hover mb-0"
                  style={{ tableLayout: "auto" }}
                >
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        className="text-center small fw-semibold je-col-index"
                        style={{ width: "44px" }}
                      >
                        #
                      </th>
                      <th
                        className="text-center small fw-semibold je-col-actions"
                        style={{ width: "100px" }}
                      >
                        Actions
                      </th>
                      <th className="small fw-semibold">Created</th>
                      <th className="small fw-semibold">Personnel</th>
                      <th className="small fw-semibold">Action</th>
                      <th className="small fw-semibold">Subject Type</th>
                      <th className="small fw-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((row, index) => {
                      const { date, time } = formatDateTime(row.created_at);
                      const rowNum = startIndex + index + 1;
                      return (
                        <tr key={row.id || index} className="align-middle">
                          <td
                            className="text-center fw-bold je-col-index"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {rowNum}
                        </td>
                          <td className="text-center je-col-actions">
                            <div className="d-flex justify-content-center gap-1">
                              <button
                                type="button"
                                className="btn btn-info btn-sm text-white"
                                onClick={() => handleViewDetails(row)}
                                title="View Details"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "4px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                <i
                                  className="fas fa-eye"
                                  style={{ fontSize: "0.875rem" }}
                                />
                              </button>
                            </div>
                          </td>
                          <td
                            className="small"
                            style={{
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {date}
                            {time ? ` · ${time}` : ""}
                          </td>
                          <td>{row.user_name || "-"}</td>
                          <td>
                            {(() => {
                              const cfg = getActionBadgeConfig(row.action);
                              return (
                                <span
                                  className={`badge ${cfg.badgeClass}`}
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <i
                                    className={`fas ${cfg.icon} me-1`}
                                    aria-hidden
                                  />
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="text-nowrap">
                            {getSubjectTypeDescription(
                              row.subject_type,
                              row.action
                            )}
                          </td>
                          <td className="small text-muted">
                            <div
                              role="button"
                              tabIndex={0}
                              className="text-truncate d-block"
                              style={{
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "2px",
                                transition: "all 0.2s ease",
                                maxWidth: "100%",
                              }}
                              title="Click to view full number"
                              onClick={() =>
                                handleNumberClick(
                                  "IP Address",
                                  row.ip_address || "—"
                                )
                              }
                              onKeyDown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                handleNumberClick(
                                  "IP Address",
                                  row.ip_address || "—"
                                )
                              }
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.8";
                                e.currentTarget.style.transform = "scale(1.02)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              {row.ip_address || "-"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
                          {filteredLogs.length === 0 ? 0 : startIndex + 1}-
                          {Math.min(
                            startIndex + currentLogs.length,
                            filteredLogs.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredLogs.length}
                        </span>{" "}
                        logs
                  </small>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                        className="btn btn-sm"
                      onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
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
                        <i className="fas fa-chevron-left me-1" />
                      Previous
                    </button>

                      <div className="d-none d-md-flex gap-1">
                        {(() => {
                          const totalPagesNum = totalPages;
                          let pages = [];
                          const maxVisiblePages = 5;

                          if (totalPagesNum <= maxVisiblePages) {
                            pages = Array.from(
                              { length: totalPagesNum },
                              (_, i) => i + 1
                            );
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(
                              totalPagesNum - 1,
                              currentPage + 1
                            );

                            if (currentPage <= 2) {
                              end = 4;
                            } else if (currentPage >= totalPagesNum - 1) {
                              start = totalPagesNum - 3;
                            }

                            if (start > 2) {
                              pages.push("...");
                            }

                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }

                            if (end < totalPagesNum - 1) {
                              pages.push("...");
                            }

                            if (totalPagesNum > 1) {
                              pages.push(totalPagesNum);
                            }
                          }

                          return pages.map((page, index) => (
                    <button
                              key={index}
                      type="button"
                              className="btn btn-sm"
                      onClick={() =>
                                page !== "..." && setCurrentPage(page)
                              }
                              disabled={page === "..."}
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
                                  e.target.style.transform = "translateY(-1px)";
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
                                  e.target.style.color = "var(--text-primary)";
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
                        type="button"
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage >= totalPages}
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
                        <i className="fas fa-chevron-right ms-1" />
                    </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showDetailsModal && selectedLog && (
        <ActivityLogDetailsModal
          log={selectedLog}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLog(null);
          }}
          getActionBadgeConfig={getActionBadgeConfig}
          getSubjectTypeLabel={getSubjectTypeLabel}
          getSubjectTypeDescription={getSubjectTypeDescription}
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

export default ActivityLog;
