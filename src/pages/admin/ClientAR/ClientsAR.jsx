import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaUserTie, FaPlus, FaEdit, FaTrash, FaFileInvoice, FaMoneyBillWave, FaEye, FaSyncAlt, FaSearch, FaFilter } from "react-icons/fa";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const ClientsAR = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clients"); // clients, invoices

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal states
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showClientViewModal, setShowClientViewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  // Number view modal state
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  // Form states
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    notes: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    client_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    income_account_id: "",
    total_amount: "",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    cash_account_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchInvoices();
    fetchIncomeAccounts();
    fetchCashAccounts();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/accounting/clients?active_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/invoices?per_page=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchIncomeAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/accounting/chart-of-accounts?account_type=REVENUE&active_only=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIncomeAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching income accounts:", error);
    }
  };

  const fetchCashAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts?active_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const cash = data.filter((acc) => ["1010", "1020", "1030"].includes(acc.account_code));
        setCashAccounts(cash);
      }
    } catch (error) {
      console.error("Error fetching cash accounts:", error);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      const url = editingClient
        ? `${API_BASE_URL}/accounting/clients/${editingClient.id}`
        : `${API_BASE_URL}/accounting/clients`;

      const method = editingClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save client");
      }

      showToast.success(editingClient ? "Client updated successfully" : "Client created successfully");
      resetClientForm();
      fetchClients();
    } catch (error) {
      showToast.error("Failed to save client");
    }
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...invoiceForm,
          total_amount: parseFloat(invoiceForm.total_amount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create invoice");
      }

      showToast.success("Invoice created successfully");
      resetInvoiceForm();
      fetchInvoices();
      fetchClients();
    } catch (error) {
      showToast.error(error.message || "Failed to create invoice");
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_type: "receipt",
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to record payment");
      }

      showToast.success("Payment recorded successfully");
      resetPaymentForm();
      fetchInvoices();
      fetchClients();
    } catch (error) {
      showToast.error(error.message || "Failed to record payment");
    }
  };

  const handleDeleteClient = async (client) => {
    const result = await showAlert.confirm(
      "Delete Client",
      `Are you sure you want to delete ${client.name}?`
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/accounting/clients/${client.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          showToast.success("Client deleted successfully");
          fetchClients();
        } else {
          throw new Error("Failed to delete client");
        }
      } catch (error) {
        showToast.error("Failed to delete client");
      }
    }
  };

  const resetClientForm = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      notes: "",
    });
    setEditingClient(null);
    setShowClientForm(false);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      client_id: "",
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: "",
      income_account_id: "",
      total_amount: "",
      description: "",
    });
    setShowInvoiceForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      invoice_id: "",
      payment_date: new Date().toISOString().split("T")[0],
      cash_account_id: "",
      amount: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
    setShowPaymentForm(false);
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
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

  const getStatusBadge = (status) => {
    const badges = {
      draft: "secondary",
      sent: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
    };
    return badges[status] || "secondary";
  };

  // Ensure invoices is an array
  const invoicesArray = Array.isArray(invoices) ? invoices : [];
  
  // Calculate totals with proper number parsing
  const totalAR = clients.reduce((sum, client) => {
    const receivable = parseFloat(client.total_receivable) || 0;
    return sum + receivable;
  }, 0);
  
  const totalInvoices = invoicesArray.reduce((sum, inv) => {
    const amount = parseFloat(inv.total_amount) || 0;
    return sum + amount;
  }, 0);
  
  const totalPaid = invoicesArray.reduce((sum, inv) => {
    const paid = parseFloat(inv.paid_amount) || 0;
    return sum + paid;
  }, 0);

  // Filter clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];
    if (searchTerm.trim() && activeTab === "clients") {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name?.toLowerCase().includes(search) ||
          client.email?.toLowerCase().includes(search) ||
          client.phone?.toLowerCase().includes(search) ||
          client.contact_person?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [clients, searchTerm, activeTab]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoicesArray];
    if (searchTerm.trim() && activeTab === "invoices") {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number?.toLowerCase().includes(search) ||
          invoice.client?.name?.toLowerCase().includes(search) ||
          invoice.description?.toLowerCase().includes(search)
      );
    }
    if (filterStatus !== "all" && activeTab === "invoices") {
      filtered = filtered.filter((invoice) => invoice.status === filterStatus);
    }
    return filtered;
  }, [invoicesArray, searchTerm, filterStatus, activeTab]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchTerm || filterStatus !== "all";

  if (loading && initialLoading) {
    return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading clients and invoices..." />
      </div>
    );
  }

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 clients-ar-container ${
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

        /* Modern SaaS Tab Animations */
        @keyframes tabSlideIn {
          from {
            opacity: 0;
            transform: translateY(-3px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes tabPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes tabGlow {
          0%, 100% {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          }
          50% {
            box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.2);
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

        /* Modern SaaS Tab Classes */
        .active-saas-tab {
          animation: tabSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .active-saas-tab .badge {
          animation: tabPulse 0.4s ease-out;
        }

        .inactive-saas-tab:hover {
          transform: translateY(-1px);
        }
      `}</style>

      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaUserTie className="me-2" />
            Clients / Accounts Receivable
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage clients and track receivables
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={() => {
              resetClientForm();
              setShowClientForm(true);
            }}
            style={{
              transition: "all 0.2s ease-in-out",
              borderWidth: "2px",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <FaPlus className="me-1" />
            Add Client
          </button>
          <button
            className="btn btn-sm btn-success text-white"
            onClick={() => {
              resetInvoiceForm();
              setShowInvoiceForm(true);
            }}
            disabled={clients.length === 0}
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
            <FaFileInvoice className="me-1" />
            Create Invoice
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              fetchClients();
              fetchInvoices();
            }}
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
                    Total Clients
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick(
                        "Total Clients",
                        clients.length,
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
                      : abbreviateNumber(clients.length, false)}
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
                    className="fas fa-users"
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
                    Total AR
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total AR", totalAR, true)
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
                      : abbreviateNumber(totalAR, true)}
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
                    className="fas fa-money-bill-wave"
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
                    Total Invoices
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total Invoices", totalInvoices, true)
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
                      : abbreviateNumber(totalInvoices, true)}
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
                    style={{ color: "var(--success-color)" }}
                  >
                    Total Paid
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total Paid", totalPaid, true)
                    }
                    style={{
                      color: "var(--success-color)",
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
                      : abbreviateNumber(totalPaid, true)}
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
                    className="fas fa-check-circle"
                    style={{
                      color: "var(--success-light)",
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
                <FaSearch className="me-1" />
                Search
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
                  placeholder={
                    activeTab === "clients"
                      ? "Search by name, email, phone..."
                      : "Search by invoice number, client..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
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
                    disabled={loading}
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
                    <i className="fas fa-times" style={{ color: "inherit" }}></i>
                  </button>
                )}
              </div>
            </div>
            {activeTab === "invoices" && (
              <div className="col-6 col-md-2">
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <FaFilter className="me-1" />
                  Status
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
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
                disabled={loading || !hasActiveFilters}
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

      {/* Modern SaaS-Style Tabs */}
      <div className="mb-4">
        <div
          className="d-inline-flex align-items-center p-1 rounded-3"
          style={{
            backgroundColor: "var(--background-light)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            gap: "0.5rem",
          }}
        >
          <button
            className={`d-flex align-items-center gap-2 px-4 border-0 rounded-2 position-relative ${
              activeTab === "clients" ? "active-saas-tab" : "inactive-saas-tab"
            }`}
            onClick={() => setActiveTab("clients")}
            style={{
              backgroundColor: activeTab === "clients" ? "white" : "transparent",
              color: activeTab === "clients" ? "var(--primary-color)" : "var(--text-muted)",
              fontWeight: activeTab === "clients" ? "600" : "500",
              fontSize: "0.9375rem",
              padding: "0.625rem 1rem",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
              boxShadow: activeTab === "clients" ? "0 1px 3px rgba(0, 0, 0, 0.12)" : "none",
              transform: activeTab === "clients" ? "translateY(0)" : "translateY(0)",
              minWidth: "140px",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "clients") {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.target.style.color = "var(--primary-color)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "clients") {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "var(--text-muted)";
              }
            }}
          >
            <i
              className="fas fa-users"
              style={{
                fontSize: "1rem",
                opacity: activeTab === "clients" ? "1" : "0.7",
                transition: "opacity 0.25s ease",
              }}
            ></i>
            <span>Clients</span>
            <span
              className={`badge rounded-pill ${
                activeTab === "clients"
                  ? "bg-primary text-white"
                  : "bg-white text-dark"
              }`}
              style={{
                fontSize: "0.6875rem",
                padding: "0.125rem 0.5rem",
                fontWeight: "600",
                transition: "all 0.25s ease",
                boxShadow: activeTab === "clients" ? "0 1px 2px rgba(0, 0, 0, 0.1)" : "none",
              }}
            >
              {filteredClients.length}
            </span>
          </button>
          <button
            className={`d-flex align-items-center gap-2 px-4 border-0 rounded-2 position-relative ${
              activeTab === "invoices" ? "active-saas-tab" : "inactive-saas-tab"
            }`}
            onClick={() => setActiveTab("invoices")}
            style={{
              backgroundColor: activeTab === "invoices" ? "white" : "transparent",
              color: activeTab === "invoices" ? "var(--primary-color)" : "var(--text-muted)",
              fontWeight: activeTab === "invoices" ? "600" : "500",
              fontSize: "0.9375rem",
              padding: "0.625rem 1rem",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
              boxShadow: activeTab === "invoices" ? "0 1px 3px rgba(0, 0, 0, 0.12)" : "none",
              transform: activeTab === "invoices" ? "translateY(0)" : "translateY(0)",
              minWidth: "140px",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "invoices") {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.target.style.color = "var(--primary-color)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "invoices") {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "var(--text-muted)";
              }
            }}
          >
            <i
              className="fas fa-file-invoice"
              style={{
                fontSize: "1rem",
                opacity: activeTab === "invoices" ? "1" : "0.7",
                transition: "opacity 0.25s ease",
              }}
            ></i>
            <span>Invoices</span>
            <span
              className={`badge rounded-pill ${
                activeTab === "invoices"
                  ? "bg-primary text-white"
                  : "bg-white text-dark"
              }`}
              style={{
                fontSize: "0.6875rem",
                padding: "0.125rem 0.5rem",
                fontWeight: "600",
                transition: "all 0.25s ease",
                boxShadow: activeTab === "invoices" ? "0 1px 2px rgba(0, 0, 0, 0.1)" : "none",
              }}
            >
              {filteredInvoices.length}
            </span>
          </button>
        </div>
      </div>

      {/* Clients Tab */}
      {activeTab === "clients" && (
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
                <i className="fas fa-users me-2"></i>
                Clients
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    ({filteredClients.length} total)
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {filteredClients.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-users fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Clients Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Start by creating your first client."}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead
                    style={{ backgroundColor: "var(--background-light)" }}
                  >
                    <tr>
                      <th className="text-center small fw-semibold" style={{ width: "5%" }}>
                        #
                      </th>
                      <th className="small fw-semibold" style={{ width: "25%" }}>
                        Name
                      </th>
                      <th className="small fw-semibold" style={{ width: "15%" }}>
                        Contact
                      </th>
                      <th className="small fw-semibold" style={{ width: "20%" }}>
                        Email
                      </th>
                      <th className="text-end small fw-semibold" style={{ width: "15%" }}>
                        Total AR
                      </th>
                      <th className="text-center small fw-semibold" style={{ width: "20%" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, index) => (
                      <tr key={client.id} className="align-middle">
                        <td
                          className="text-center fw-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {index + 1}
                        </td>
                        <td>
                          <div
                            className="fw-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {client.name}
                          </div>
                          {client.contact_person && (
                            <div className="small text-muted">
                              Contact: {client.contact_person}
                            </div>
                          )}
                        </td>
                        <td className="text-muted small">{client.phone || "-"}</td>
                        <td className="text-muted small">{client.email || "-"}</td>
                        <td className="text-end">
                          <strong
                            className={
                              client.total_receivable > 0
                                ? "text-warning"
                                : "text-success"
                            }
                          >
                            {formatCurrency(client.total_receivable)}
                          </strong>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowClientViewModal(true);
                              }}
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
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
                              onClick={() => {
                                setEditingClient(client);
                                setClientForm({
                                  name: client.name,
                                  email: client.email || "",
                                  phone: client.phone || "",
                                  address: client.address || "",
                                  contact_person: client.contact_person || "",
                                  notes: client.notes || "",
                                });
                                setShowClientForm(true);
                              }}
                              title="Edit Client"
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
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
                              onClick={() => handleDeleteClient(client)}
                              title="Delete Client"
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaTrash style={{ fontSize: "0.875rem" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
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
                Invoices
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    ({filteredInvoices.length} total)
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-file-invoice fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Invoices Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search criteria"
                    : "Start by creating your first invoice."}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead
                    style={{ backgroundColor: "var(--background-light)" }}
                  >
                    <tr>
                      <th className="text-center small fw-semibold" style={{ width: "4%" }}>
                        #
                      </th>
                      <th className="text-center small fw-semibold" style={{ width: "10%" }}>
                        Actions
                      </th>
                      <th className="small fw-semibold" style={{ width: "12%" }}>
                        Invoice #
                      </th>
                      <th className="small fw-semibold" style={{ width: "15%" }}>
                        Client
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        Date
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        Due Date
                      </th>
                      <th className="text-end small fw-semibold" style={{ width: "12%" }}>
                        Amount
                      </th>
                      <th className="text-end small fw-semibold" style={{ width: "12%" }}>
                        Paid
                      </th>
                      <th className="text-end small fw-semibold" style={{ width: "12%" }}>
                        Balance
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice, index) => (
                      <tr key={invoice.id} className="align-middle">
                        <td
                          className="text-center fw-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {index + 1}
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowViewModal(true);
                              }}
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaEye style={{ fontSize: "0.875rem" }} />
                            </button>
                            {invoice.balance > 0 && (
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentForm({
                                    ...paymentForm,
                                    invoice_id: invoice.id.toString(),
                                    amount: invoice.balance.toString(),
                                  });
                                  setShowPaymentForm(true);
                                }}
                                title="Record Payment"
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
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                <FaMoneyBillWave style={{ fontSize: "0.875rem" }} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="small">{invoice.invoice_number}</code>
                        </td>
                        <td className="small">{invoice.client?.name || "-"}</td>
                        <td className="text-muted small">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="text-muted small">
                          {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                        </td>
                        <td className="text-end fw-semibold">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="text-end text-success fw-semibold">
                          {formatCurrency(invoice.paid_amount)}
                        </td>
                        <td className="text-end">
                          <strong
                            className={
                              invoice.balance > 0 ? "text-warning" : "text-success"
                            }
                          >
                            {formatCurrency(invoice.balance)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`badge bg-${getStatusBadge(invoice.status)}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientFormModal
          form={clientForm}
          setForm={setClientForm}
          editing={editingClient}
          onSubmit={handleSaveClient}
          onClose={resetClientForm}
        />
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceFormModal
          form={invoiceForm}
          setForm={setInvoiceForm}
          clients={clients}
          incomeAccounts={incomeAccounts}
          onSubmit={handleSaveInvoice}
          onClose={resetInvoiceForm}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <PaymentFormModal
          form={paymentForm}
          setForm={setPaymentForm}
          invoice={selectedInvoice}
          cashAccounts={cashAccounts}
          onSubmit={handleSavePayment}
          onClose={resetPaymentForm}
        />
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* View Client Modal */}
      {showClientViewModal && selectedClient && (
        <ClientViewModal
          client={selectedClient}
          onClose={() => setShowClientViewModal(false)}
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
    </div>
  );
};

// Client Form Modal Component
const ClientFormModal = ({ form, setForm, editing, onSubmit, onClose }) => {
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
    }, 200);
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
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                {editing ? "Edit Client" : "New Client"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="mb-3">
                  <label className="form-label fw-semibold">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-white fw-semibold">
                  {editing ? "Update" : "Create"} Client
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Invoice Form Modal Component
const InvoiceFormModal = ({ form, setForm, clients, incomeAccounts, onSubmit, onClose }) => {
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
    }, 200);
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
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--success-color) 0%, #198754 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">Create Invoice</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Client *</label>
                    <select
                      className="form-select"
                      value={form.client_id}
                      onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Invoice Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.invoice_date}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Income Account *</label>
                    <select
                      className="form-select"
                      value={form.income_account_id}
                      onChange={(e) => setForm({ ...form, income_account_id: e.target.value })}
                      required
                    >
                      <option value="">Select Account</option>
                      {incomeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Total Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={form.total_amount}
                      onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success text-white fw-semibold">
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Payment Form Modal Component
const PaymentFormModal = ({ form, setForm, invoice, cashAccounts, onSubmit, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

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
    }, 200);
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
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--success-color) 0%, #198754 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">Record Payment</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="alert alert-info mb-3">
                  <strong>Invoice:</strong> {invoice.invoice_number}
                  <br />
                  <strong>Client:</strong> {invoice.client?.name}
                  <br />
                  <strong>Balance:</strong> {formatCurrency(invoice.balance)}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Payment Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Cash Account *</label>
                  <select
                    className="form-select"
                    value={form.cash_account_id}
                    onChange={(e) => setForm({ ...form, cash_account_id: e.target.value })}
                    required
                  >
                    <option value="">Select Account</option>
                    {cashAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.balance}
                    className="form-control"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Payment Method</label>
                  <select
                    className="form-select"
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Reference Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    placeholder="Check number, transaction reference, etc."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success text-white fw-semibold">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Invoice View Modal Component
const InvoiceViewModal = ({ invoice, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
    }, 200);
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
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <FaEye className="me-2" />
                Invoice Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div
              className="modal-body bg-light"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Invoice Number</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {invoice.invoice_number}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Date</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {formatDate(invoice.invoice_date)}
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {invoice.client?.name || "N/A"}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Due Date</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {invoice.due_date ? formatDate(invoice.due_date) : "N/A"}
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <label className="form-label fw-semibold">Income Account</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {invoice.income_account?.account_code} -{" "}
                    {invoice.income_account?.account_name}
                  </div>
                </div>
              </div>
              {invoice.description && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {invoice.description}
                  </div>
                </div>
              )}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Total Amount</label>
                      <h4 className="mb-0">{formatCurrency(invoice.total_amount)}</h4>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Paid Amount</label>
                      <h4 className="mb-0 text-success">{formatCurrency(invoice.paid_amount)}</h4>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Balance</label>
                      <h4
                        className={`mb-0 ${
                          invoice.balance > 0 ? "text-warning" : "text-success"
                        }`}
                      >
                        {formatCurrency(invoice.balance)}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Status</label>
                <div>
                  <span
                    className={`badge bg-${
                      invoice.status === "paid"
                        ? "success"
                        : invoice.status === "partial"
                        ? "warning"
                        : "info"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
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

// Client View Modal Component
const ClientViewModal = ({ client, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

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
    }, 200);
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
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <FaEye className="me-2" />
                Client Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div
              className="modal-body bg-light"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div className="row mb-3">
                <div className="col-md-12">
                  <label className="form-label fw-semibold">Client Name</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {client.name}
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Email</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {client.email || "N/A"}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Phone</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {client.phone || "N/A"}
                  </div>
                </div>
              </div>
              {client.contact_person && (
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">Contact Person</label>
                    <div
                      className="form-control bg-white"
                      style={{ border: "1px solid var(--input-border)" }}
                    >
                      {client.contact_person}
                    </div>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">Address</label>
                    <div
                      className="form-control bg-white"
                      style={{ border: "1px solid var(--input-border)" }}
                    >
                      {client.address}
                    </div>
                  </div>
                </div>
              )}
              {client.notes && (
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">Notes</label>
                    <div
                      className="form-control bg-white"
                      style={{ border: "1px solid var(--input-border)" }}
                    >
                      {client.notes}
                    </div>
                  </div>
                </div>
              )}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-body">
                  <label className="form-label fw-semibold">Total Accounts Receivable</label>
                  <h4
                    className={`mb-0 ${
                      client.total_receivable > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {formatCurrency(client.total_receivable)}
                  </h4>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
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
    }, 200);
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

export default ClientsAR;

