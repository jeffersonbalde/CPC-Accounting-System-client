import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  FaFileInvoice,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import JournalEntryFormModal from "./JournalEntryFormModal";
import JournalEntryViewModal from "./JournalEntryViewModal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const JournalEntries = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("entry_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Form state
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    description: "",
    reference_number: "",
    lines: [
      { account_id: "", debit_amount: "", credit_amount: "", description: "" },
      { account_id: "", debit_amount: "", credit_amount: "", description: "" },
    ],
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalDebit: 0,
    totalCredit: 0,
  });

  // Number view modal state
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortField, sortDirection]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/accounting/chart-of-accounts?active_only=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/accounting/journal-entries?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();
      const entriesList = data.data || data || [];
      setEntries(entriesList);

      // Calculate stats
      const totalDebit = entriesList.reduce(
        (sum, entry) => sum + (parseFloat(entry.total_debit) || 0),
        0
      );
      const totalCredit = entriesList.reduce(
        (sum, entry) => sum + (parseFloat(entry.total_credit) || 0),
        0
      );
      setStats({
        totalEntries: entriesList.length,
        totalDebit,
        totalCredit,
      });
    } catch (error) {
      console.error("Error fetching entries:", error);
      showToast.error("Failed to load journal entries");
      setStats({
        totalEntries: 0,
        totalDebit: 0,
        totalCredit: 0,
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterAndSortEntries = useCallback(() => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        const description = (entry.description || "").toLowerCase();
        const entryNumber = (entry.entry_number || "").toLowerCase();
        const reference = (entry.reference_number || "").toLowerCase();
        return (
          description.includes(loweredSearch) ||
          entryNumber.includes(loweredSearch) ||
          reference.includes(loweredSearch)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "entry_date" || sortField === "created_at") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortField === "description") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      } else {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [entries, searchTerm, sortField, sortDirection]);

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
      ],
    });
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 2) {
      showToast.warning("At least 2 lines are required");
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Clear the opposite field when one is filled
    if (field === "debit_amount" && value) {
      newLines[index].credit_amount = "";
    } else if (field === "credit_amount" && value) {
      newLines[index].debit_amount = "";
    }

    setFormData({ ...formData, lines: newLines });
    validateForm({ ...formData, lines: newLines });
  };

  const validateForm = (data = formData) => {
    const errors = {};

    if (!data.description.trim()) {
      errors.description = "Description is required";
    }

    if (data.lines.length < 2) {
      errors.lines = "At least 2 lines are required";
    }

    data.lines.forEach((line, index) => {
      if (!line.account_id) {
        errors[`line_${index}_account`] = "Account is required";
      }

      const hasDebit = parseFloat(line.debit_amount) > 0;
      const hasCredit = parseFloat(line.credit_amount) > 0;

      if (!hasDebit && !hasCredit) {
        errors[`line_${index}_amount`] =
          "Either debit or credit amount is required";
      }

      if (hasDebit && hasCredit) {
        errors[`line_${index}_amount`] = "Cannot have both debit and credit";
      }
    });

    // Validate DR = CR
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + (parseFloat(line.debit_amount) || 0),
      0
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + (parseFloat(line.credit_amount) || 0),
      0
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.balance = `Debits (${totalDebit.toFixed(
        2
      )}) must equal Credits (${totalCredit.toFixed(2)})`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast.error("Please fix the form errors");
      return;
    }

    try {
      setSubmitting(true);
      setActionLock(true);

      const payload = {
        entry_date: formData.entry_date,
        description: formData.description,
        reference_number: formData.reference_number || null,
        lines: formData.lines.map((line) => ({
          account_id: parseInt(line.account_id),
          debit_amount: parseFloat(line.debit_amount) || 0,
          credit_amount: parseFloat(line.credit_amount) || 0,
          description: line.description || null,
        })),
      };

      const url = editingEntry
        ? `${API_BASE_URL}/accounting/journal-entries/${editingEntry.id}`
        : `${API_BASE_URL}/accounting/journal-entries`;

      const method = editingEntry ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save journal entry");
      }

      showToast.success(
        editingEntry
          ? "Journal entry updated successfully"
          : "Journal entry created successfully"
      );
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      showToast.error(error.message || "Failed to save journal entry");
    } finally {
      setSubmitting(false);
      setActionLock(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split("T")[0],
      description: "",
      reference_number: "",
      lines: [
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
      ],
    });
    setFormErrors({});
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleEdit = (entry) => {
    if (isActionDisabled()) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    setEditingEntry(entry);
    setFormData({
      entry_date: entry.entry_date,
      description: entry.description,
      reference_number: entry.reference_number || "",
      lines: entry.lines.map((line) => ({
        account_id: line.account_id.toString(),
        debit_amount: line.debit_amount > 0 ? line.debit_amount.toString() : "",
        credit_amount:
          line.credit_amount > 0 ? line.credit_amount.toString() : "",
        description: line.description || "",
      })),
    });
    setShowForm(true);
  };

  const handleDelete = async (entry) => {
    if (isActionDisabled(entry.id)) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const result = await showAlert.confirm(
      "Delete Journal Entry",
      `Are you sure you want to delete entry ${entry.entry_number}? This action cannot be undone.`,
      "Yes, Delete",
      "Cancel"
    );

    if (result.isConfirmed) {
      try {
        setActionLoading(entry.id);
        setActionLock(true);
        showAlert.loading("Deleting journal entry...");

        const response = await fetch(
          `${API_BASE_URL}/accounting/journal-entries/${entry.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete entry");
        }

        showAlert.close();
        showToast.success("Journal entry deleted successfully");
        fetchEntries();
      } catch (error) {
        console.error("Error deleting entry:", error);
        showAlert.close();
        showToast.error("Failed to delete journal entry");
      } finally {
        setActionLoading(null);
        setActionLock(false);
      }
    }
  };

  const handleViewDetails = (entry) => {
    if (isActionDisabled()) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    setViewingEntry(entry);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Abbreviate large numbers for display
  const abbreviateNumber = (amount, isCurrency = false) => {
    if (amount === null || amount === undefined || amount === 0) {
      return isCurrency ? "₱0.00" : "0";
    }

    const num = Math.abs(amount);
    let abbreviated = "";
    let suffix = "";

    if (num >= 1000000000) {
      abbreviated = (num / 1000000000).toFixed(1);
      suffix = "B";
    } else if (num >= 1000000) {
      abbreviated = (num / 1000000).toFixed(1);
      suffix = "M";
    } else if (num >= 1000) {
      abbreviated = (num / 1000).toFixed(1);
      suffix = "K";
    } else {
      abbreviated = num.toFixed(2);
    }

    // Remove trailing zeros after decimal
    abbreviated = parseFloat(abbreviated).toString();

    const sign = amount < 0 ? "-" : "";
    return isCurrency
      ? `${sign}₱${abbreviated}${suffix}`
      : `${sign}${abbreviated}${suffix}`;
  };

  // Format full number for display in modal
  const formatFullNumber = (amount, isCurrency = false) => {
    if (isCurrency) {
      return formatCurrency(amount);
    }
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Handle number click to show modal
  const handleNumberClick = (title, value, isCurrency = false) => {
    setNumberViewModal({
      show: true,
      title,
      value,
      formattedValue: formatFullNumber(value, isCurrency),
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotals = () => {
    const totalDebit = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.debit_amount) || 0),
      0
    );
    const totalCredit = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.credit_amount) || 0),
      0
    );
    return { totalDebit, totalCredit };
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const isActionDisabled = (id = null) => {
    return (
      actionLock ||
      (actionLoading !== null && (id === null || actionLoading !== id))
    );
  };

  const hasActiveFilters =
    searchTerm || sortField !== "entry_date" || sortDirection !== "desc";

  const clearFilters = () => {
    setSearchTerm("");
    setSortField("entry_date");
    setSortDirection("desc");
  };

  // Pagination
  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);

  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const paginationMeta = useMemo(() => {
    return {
      current_page: currentPage,
      last_page: totalPages,
      total: filteredEntries.length,
      from: filteredEntries.length > 0 ? startIndex + 1 : 0,
      to: Math.min(endIndex, filteredEntries.length),
    };
  }, [currentPage, totalPages, filteredEntries.length, startIndex, endIndex]);

  const handleSort = (field) => {
    if (isActionDisabled()) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 journal-entries-container ${
        !loading ? "fadeIn" : ""
      }`}
    >
      <style>{`
        /* Modal Backdrop Animation */
        @keyframes modalBackdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalBackdropFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        /* Modal Content Animation */
        @keyframes modalContentSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes modalContentSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
        }

        /* Modal Classes */
        .modal-backdrop-animation {
          animation: modalBackdropFadeIn 0.3s ease-out forwards;
        }

        .modal-backdrop-animation.exit {
          animation: modalBackdropFadeOut 0.2s ease-in forwards;
        }

        .modal-content-animation {
          animation: modalContentSlideIn 0.3s ease-out forwards;
        }

        .modal-content-animation.exit {
          animation: modalContentSlideOut 0.2s ease-in forwards;
        }
      `}</style>

      {loading ? (
        <LoadingSpinner text="Loading journal entries..." />
      ) : (
        <>
          {/* Page Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <div className="flex-grow-1 mb-2 mb-md-0">
              <h1
                className="h4 mb-1 fw-bold"
                style={{ color: "var(--text-primary)" }}
              >
                <FaFileInvoice className="me-2" />
                Journal Entries
              </h1>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                Record all financial transactions
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-sm btn-primary text-white"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
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
                <FaPlus className="me-1" />
                New Entry
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchEntries}
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
                <FaSyncAlt className="me-1" />
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div
                className="card stats-card h-100 shadow-sm"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.125)",
                  borderRadius: "0.375rem",
                }}
              >
                <div className="card-body p-2 p-md-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div
                        className="text-xs fw-semibold text-uppercase mb-1"
                        style={{ color: "var(--primary-color)" }}
                      >
                        Total Entries
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Entries",
                            stats.totalEntries,
                            false
                          )
                        }
                        style={{
                          color: "var(--primary-color)",
                          fontSize: "clamp(1rem, 3vw, 1.8rem)",
                          lineHeight: "1.2",
                          cursor: initialLoading ? "default" : "pointer",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "0.8";
                            e.target.style.transform = "scale(1.02)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "1";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {initialLoading
                          ? "..."
                          : abbreviateNumber(stats.totalEntries, false)}
                      </div>
                      <div
                        className="text-xxs mt-1"
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.65rem",
                          fontStyle: "italic",
                        }}
                      >
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                    <div className="col-auto flex-shrink-0 ms-2">
                      <i
                        className="fas fa-file-invoice"
                        style={{
                          color: "var(--primary-light)",
                          opacity: 0.7,
                          fontSize: "clamp(1rem, 3vw, 2rem)",
                        }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div
                className="card stats-card h-100 shadow-sm"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.125)",
                  borderRadius: "0.375rem",
                }}
              >
                <div className="card-body p-2 p-md-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div
                        className="text-xs fw-semibold text-uppercase mb-1"
                        style={{ color: "var(--accent-color)" }}
                      >
                        Total Debit
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Debit",
                            stats.totalDebit,
                            true
                          )
                        }
                        style={{
                          color: "var(--accent-color)",
                          fontSize: "clamp(1rem, 3vw, 1.8rem)",
                          lineHeight: "1.2",
                          cursor: initialLoading ? "default" : "pointer",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "0.8";
                            e.target.style.transform = "scale(1.02)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "1";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {initialLoading
                          ? "..."
                          : abbreviateNumber(stats.totalDebit, true)}
                      </div>
                      <div
                        className="text-xxs mt-1"
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.65rem",
                          fontStyle: "italic",
                        }}
                      >
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                    <div className="col-auto flex-shrink-0 ms-2">
                      <i
                        className="fas fa-arrow-down"
                        style={{
                          color: "var(--accent-light)",
                          opacity: 0.7,
                          fontSize: "clamp(1rem, 3vw, 2rem)",
                        }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div
                className="card stats-card h-100 shadow-sm"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.125)",
                  borderRadius: "0.375rem",
                }}
              >
                <div className="card-body p-2 p-md-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div
                        className="text-xs fw-semibold text-uppercase mb-1"
                        style={{ color: "var(--primary-dark)" }}
                      >
                        Total Credit
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Credit",
                            stats.totalCredit,
                            true
                          )
                        }
                        style={{
                          color: "var(--primary-dark)",
                          fontSize: "clamp(1rem, 3vw, 1.8rem)",
                          lineHeight: "1.2",
                          cursor: initialLoading ? "default" : "pointer",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "0.8";
                            e.target.style.transform = "scale(1.02)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!initialLoading) {
                            e.target.style.opacity = "1";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {initialLoading
                          ? "..."
                          : abbreviateNumber(stats.totalCredit, true)}
                      </div>
                      <div
                        className="text-xxs mt-1"
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.65rem",
                          fontStyle: "italic",
                        }}
                      >
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                    <div className="col-auto flex-shrink-0 ms-2">
                      <i
                        className="fas fa-arrow-up"
                        style={{
                          color: "var(--primary-color)",
                          opacity: 0.7,
                          fontSize: "clamp(1rem, 3vw, 2rem)",
                        }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div
                className="card stats-card h-100 shadow-sm"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.125)",
                  borderRadius: "0.375rem",
                }}
              >
                <div className="card-body p-2 p-md-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div
                        className="text-xs fw-semibold text-uppercase mb-1"
                        style={{ color: "var(--primary-dark)" }}
                      >
                        Filtered Results
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          handleNumberClick(
                            "Filtered Results",
                            filteredEntries.length,
                            false
                          )
                        }
                        style={{
                          color: "var(--primary-dark)",
                          fontSize: "clamp(1rem, 3vw, 1.8rem)",
                          lineHeight: "1.2",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = "0.8";
                          e.target.style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = "1";
                          e.target.style.transform = "scale(1)";
                        }}
                      >
                        {abbreviateNumber(filteredEntries.length, false)}
                      </div>
                      <div
                        className="text-xxs mt-1"
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.65rem",
                          fontStyle: "italic",
                        }}
                      >
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                    <div className="col-auto flex-shrink-0 ms-2">
                      <i
                        className="fas fa-filter"
                        style={{
                          color: "var(--primary-color)",
                          opacity: 0.7,
                          fontSize: "clamp(1rem, 3vw, 2rem)",
                        }}
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
              <div className="row g-2 align-items-start">
                <div className="col-12 col-md-4">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Search Entries
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
                      placeholder="Search by entry number, description, or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={loading || isActionDisabled()}
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
                        disabled={loading || isActionDisabled()}
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
                <div className="col-6 col-md-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Sort By
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="entry_date">Entry Date</option>
                    <option value="entry_number">Entry Number</option>
                    <option value="description">Description</option>
                    <option value="total_debit">Total Debit</option>
                    <option value="total_credit">Total Credit</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Order
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Items per page
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    disabled={loading || isActionDisabled()}
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
                <div className="col-6 col-md-auto">
                  <label
                    className="form-label small fw-semibold mb-1 d-block"
                    style={{ color: "var(--text-muted)" }}
                  >
                    &nbsp;
                  </label>
                  <button
                    className="btn btn-sm btn-outline-secondary w-100 w-md-auto"
                    type="button"
                    onClick={clearFilters}
                    disabled={
                      loading || isActionDisabled() || !hasActiveFilters
                    }
                    style={{
                      fontSize: "0.875rem",
                      whiteSpace: "nowrap",
                      padding: "0.25rem 0.75rem",
                    }}
                  >
                    <i className="fas fa-filter me-1"></i>
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
                  <i className="fas fa-file-invoice me-2"></i>
                  Journal Entries
                  {!loading && (
                    <small className="opacity-75 ms-2 text-white">
                      ({paginationMeta.total} total)
                    </small>
                  )}
                </h5>
              </div>
            </div>

            <div className="card-body p-0">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i
                      className="fas fa-file-invoice fa-3x"
                      style={{ color: "var(--text-muted)", opacity: 0.5 }}
                    ></i>
                  </div>
                  <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                    No Journal Entries Found
                  </h5>
                  <p
                    className="mb-3 small"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Start by creating your first journal entry to record financial transactions."}
                  </p>
                  {!searchTerm && (
                    <button
                      className="btn btn-sm btn-primary text-white"
                      onClick={() => {
                        resetForm();
                        setShowForm(true);
                      }}
                      disabled={isActionDisabled()}
                      style={{
                        transition: "all 0.2s ease-in-out",
                        borderWidth: "2px",
                        borderRadius: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow =
                            "0 4px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <FaPlus className="me-1" />
                      Add Entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead
                      style={{ backgroundColor: "var(--background-light)" }}
                    >
                      <tr>
                        <th
                          className="text-center small fw-semibold"
                          style={{ width: "4%" }}
                        >
                          #
                        </th>
                        <th
                          className="text-center small fw-semibold"
                          style={{ width: "10%" }}
                        >
                          Actions
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "15%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("entry_number")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Entry Number
                            <i
                              className={`ms-1 ${getSortIcon("entry_number")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("entry_date")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Date
                            <i
                              className={`ms-1 ${getSortIcon("entry_date")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "25%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("description")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Description
                            <i
                              className={`ms-1 ${getSortIcon("description")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          Reference
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                            onClick={() => handleSort("total_debit")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Total Debit
                            <i
                              className={`ms-1 ${getSortIcon("total_debit")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                            onClick={() => handleSort("total_credit")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Total Credit
                            <i
                              className={`ms-1 ${getSortIcon("total_credit")}`}
                            ></i>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEntries.map((entry, index) => (
                        <tr key={entry.id} className="align-middle">
                          <td
                            className="text-center fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + index + 1}
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => handleViewDetails(entry)}
                                disabled={isActionDisabled()}
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
                                <FaEye style={{ fontSize: "0.875rem" }} />
                              </button>
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => handleEdit(entry)}
                                disabled={isActionDisabled()}
                                title="Edit Entry"
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
                                <FaEdit style={{ fontSize: "0.875rem" }} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm text-white"
                                onClick={() => handleDelete(entry)}
                                disabled={isActionDisabled(entry.id)}
                                title="Delete Entry"
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
                                {actionLoading === entry.id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  ></span>
                                ) : (
                                  <FaTrash style={{ fontSize: "0.875rem" }} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="fw-medium"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.entry_number}
                            >
                              {entry.entry_number}
                            </div>
                          </td>
                          <td className="text-muted small">
                            {formatDate(entry.entry_date)}
                          </td>
                          <td style={{ maxWidth: "300px", overflow: "hidden" }}>
                            <div
                              className="small"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.description}
                            >
                              {entry.description}
                            </div>
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="small text-muted"
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.reference_number || "—"}
                            >
                              {entry.reference_number || "—"}
                            </div>
                          </td>
                          <td className="text-end text-danger fw-semibold">
                            {formatCurrency(entry.total_debit)}
                          </td>
                          <td className="text-end text-success fw-semibold">
                            {formatCurrency(entry.total_credit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filteredEntries.length > 0 && (
              <div className="card-footer bg-white border-top px-3 py-2">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                  <div className="text-center text-md-start">
                    <small style={{ color: "var(--text-muted)" }}>
                      Showing{" "}
                      <span
                        className="fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {paginationMeta.from || startIndex + 1}-
                        {paginationMeta.to ||
                          Math.min(
                            startIndex + currentEntries.length,
                            paginationMeta.total
                          )}
                      </span>{" "}
                      of{" "}
                      <span
                        className="fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {paginationMeta.total}
                      </span>{" "}
                      entries
                    </small>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={
                        paginationMeta.current_page === 1 || isActionDisabled()
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
                      <FaChevronLeft className="me-1" />
                      Previous
                    </button>

                    <div className="d-none d-md-flex gap-1">
                      {(() => {
                        let pages = [];
                        const maxVisiblePages = 5;
                        const totalPages = paginationMeta.last_page;

                        if (totalPages <= maxVisiblePages) {
                          pages = Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          );
                        } else {
                          pages.push(1);
                          let start = Math.max(
                            2,
                            paginationMeta.current_page - 1
                          );
                          let end = Math.min(
                            totalPages - 1,
                            paginationMeta.current_page + 1
                          );

                          if (paginationMeta.current_page <= 2) {
                            end = 4;
                          } else if (
                            paginationMeta.current_page >=
                            totalPages - 1
                          ) {
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
                                paginationMeta.current_page === page
                                  ? "var(--primary-color)"
                                  : "var(--input-border)"
                              }`,
                              color:
                                paginationMeta.current_page === page
                                  ? "white"
                                  : "var(--text-primary)",
                              backgroundColor:
                                paginationMeta.current_page === page
                                  ? "var(--primary-color)"
                                  : "transparent",
                              minWidth: "40px",
                            }}
                            onMouseEnter={(e) => {
                              if (
                                !e.target.disabled &&
                                paginationMeta.current_page !== page
                              ) {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 2px 4px rgba(0,0,0,0.1)";
                                e.target.style.backgroundColor =
                                  "var(--primary-light)";
                                e.target.style.color = "var(--text-primary)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (
                                !e.target.disabled &&
                                paginationMeta.current_page !== page
                              ) {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                                e.target.style.backgroundColor = "transparent";
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
                        Page {paginationMeta.current_page} of{" "}
                        {paginationMeta.last_page}
                      </small>
                    </div>

                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, paginationMeta.last_page)
                        )
                      }
                      disabled={
                        paginationMeta.current_page ===
                          paginationMeta.last_page || isActionDisabled()
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
                      <FaChevronRight className="ms-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Modal */}
          {showForm && (
            <JournalEntryFormModal
              formData={formData}
              setFormData={setFormData}
              accounts={accounts}
              formErrors={formErrors}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              isBalanced={isBalanced}
              submitting={submitting}
              editingEntry={editingEntry}
              onAddLine={handleAddLine}
              onRemoveLine={handleRemoveLine}
              onLineChange={handleLineChange}
              onSubmit={handleSubmit}
              onClose={resetForm}
            />
          )}

          {/* View Modal */}
          {viewingEntry && (
            <JournalEntryViewModal
              entry={viewingEntry}
              onClose={() => setViewingEntry(null)}
            />
          )}

          {/* Number View Modal */}
          {numberViewModal.show && (
            <NumberViewModal
              title={numberViewModal.title}
              value={numberViewModal.formattedValue}
              onClose={() =>
                setNumberViewModal({ ...numberViewModal, show: false })
              }
            />
          )}
        </>
      )}
    </div>
  );
};

// Number View Modal Component
const NumberViewModal = ({ title, value, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match the exit animation duration
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        showToast.success("Number copied to clipboard!");
      })
      .catch(() => {
        showToast.error("Failed to copy number");
      });
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${
          isClosing
            ? "modal-backdrop-animation exit"
            : "modal-backdrop-animation"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-info-circle me-2"></i>
                {title}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body text-center py-4 bg-light">
              <div className="mb-3">
                <div
                  className="h2 mb-2 fw-bold"
                  style={{
                    color: "var(--primary-color)",
                    wordBreak: "break-word",
                    fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                  }}
                >
                  {value}
                </div>
                <p className="text-muted small mb-0">Full number value</p>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCopy}
              >
                <i className="fas fa-copy me-2"></i>
                Copy
              </button>
              <button
                type="button"
                className="btn btn-primary text-white fw-semibold"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default JournalEntries;
