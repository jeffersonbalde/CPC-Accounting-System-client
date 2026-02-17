import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showToast } from "../../../services/notificationService";
import {
  FaMoneyBillWave,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaChartBar,
  FaChartPie,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import CashBankTransactionViewModal from "./CashBankTransactionViewModal";

const CashBank = () => {
  const { request } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewingTransaction, setViewingTransaction] = useState(null);

  // Number view modal state
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  useEffect(() => {
    fetchCashAccounts();
  }, [startDate, endDate]);

  useEffect(() => {
    if (selectedAccount) {
      setCurrentPage(1);
    }
  }, [selectedAccount, searchTerm, sortField, sortDirection]);

  const fetchCashAccounts = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const data = await request(`/accounting/cash-bank?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data?.accounts || data || []);
      setAccounts(list);

      // Select first account by default
      if (list.length > 0 && !selectedAccount) {
        setSelectedAccount(list[0].id);
      }
    } catch (error) {
      console.error("Error fetching cash accounts:", error);
      showToast.error("Failed to load cash accounts");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const currentAccount = accounts.find((acc) => acc.id === selectedAccount);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    if (!currentAccount || !currentAccount.transactions) return [];

    let filtered = [...currentAccount.transactions];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((transaction) => {
        const description = (transaction.description || "").toLowerCase();
        const entryNumber = (transaction.entry_number || "").toLowerCase();
        const reference = (transaction.reference || "").toLowerCase();
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

      if (sortField === "date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (
        sortField === "description" ||
        sortField === "entry_number" ||
        sortField === "reference"
      ) {
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

    return filtered;
  }, [currentAccount, searchTerm, sortField, sortDirection]);

  // Pagination
  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);

  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginationMeta = useMemo(() => {
    return {
      current_page: currentPage,
      last_page: totalPages,
      total: filteredTransactions.length,
      from: filteredTransactions.length > 0 ? startIndex + 1 : 0,
      to: Math.min(endIndex, filteredTransactions.length),
    };
  }, [
    currentPage,
    totalPages,
    filteredTransactions.length,
    startIndex,
    endIndex,
  ]);

  // Calculate statistics
  const stats = useMemo(() => {
    // If "All Accounts" is selected, aggregate from all accounts
    if (!selectedAccount || selectedAccount === "") {
      const allTransactions = accounts.flatMap((acc) => acc.transactions || []);
      const totalDebit = allTransactions.reduce(
        (sum, t) => sum + (parseFloat(t.debit) || 0),
        0
      );
      const totalCredit = allTransactions.reduce(
        (sum, t) => sum + (parseFloat(t.credit) || 0),
        0
      );
      const totalBalance = accounts.reduce(
        (sum, acc) => sum + (parseFloat(acc.current_balance) || 0),
        0
      );

      return {
        totalTransactions: allTransactions.length,
        totalDebit,
        totalCredit,
        currentBalance: totalBalance,
      };
    }

    // If specific account is selected, calculate from that account
    if (!currentAccount) {
      return {
        totalTransactions: 0,
        totalDebit: 0,
        totalCredit: 0,
        currentBalance: 0,
      };
    }

    const transactions = currentAccount.transactions || [];
    const totalDebit = transactions.reduce(
      (sum, t) => sum + (parseFloat(t.debit) || 0),
      0
    );
    const totalCredit = transactions.reduce(
      (sum, t) => sum + (parseFloat(t.credit) || 0),
      0
    );

    return {
      totalTransactions: transactions.length,
      totalDebit,
      totalCredit,
      currentBalance: currentAccount.current_balance || 0,
    };
  }, [selectedAccount, currentAccount, accounts]);

  // Analytics chart data for "All Accounts" view (corporate dashboard)
  const analyticsData = useMemo(() => {
    if (!accounts.length) {
      return {
        balanceByAccount: [],
        debitCreditSummary: [],
        distributionPie: [],
        transactionCountByAccount: [],
        totalCashPosition: 0,
      };
    }
    const balanceByAccount = accounts.map((acc) => ({
      name: `${acc.account_code} ${acc.account_name}`,
      shortName: acc.account_name,
      code: acc.account_code,
      balance: parseFloat(acc.current_balance) || 0,
      transactions: (acc.transactions || []).length,
    }));
    const totalBalance = balanceByAccount.reduce((s, d) => s + d.balance, 0);
    const totalDebit = accounts.flatMap((a) => a.transactions || []).reduce(
      (s, t) => s + (parseFloat(t.debit) || 0),
      0
    );
    const totalCredit = accounts.flatMap((a) => a.transactions || []).reduce(
      (s, t) => s + (parseFloat(t.credit) || 0),
      0
    );
    const palette = ["#0d6efd", "#198754", "#fd7e14", "#6f42c1"];
    const shortLabel = (sn) =>
      sn === "Cash on Hand" ? "On Hand" : sn === "Cash in Bank" ? "In Bank" : sn === "Petty Cash Fund" ? "Petty Cash" : sn;
    const distributionPie = balanceByAccount
      .map((d, i) => ({
        name: d.shortName,
        chartLabel: shortLabel(d.shortName),
        value: Math.max(0, d.balance),
        fill: palette[i % 4],
      }))
      .filter((d) => d.value > 0);
    return {
      balanceByAccount,
      debitCreditSummary: [
        { name: "Inflows (Credit)", value: totalCredit, fill: "#28a745" },
        { name: "Outflows (Debit)", value: totalDebit, fill: "#dc3545" },
      ],
      distributionPie: distributionPie.length ? distributionPie : [{ name: "No balance", chartLabel: "No balance", value: 1, fill: "#dee2e6" }],
      transactionCountByAccount: balanceByAccount.map((d) => ({
        name: d.shortName,
        count: d.transactions,
      })),
      totalCashPosition: totalBalance,
    };
  }, [accounts]);

  const handleSort = (field) => {
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

  const hasActiveFilters =
    searchTerm ||
    startDate ||
    endDate ||
    sortField !== "date" ||
    sortDirection !== "desc";

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSortField("date");
    setSortDirection("desc");
  };

  const isActionDisabled = () => {
    return actionLock;
  };

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 cash-bank-container ${
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

        /* Mobile: sticky # and Actions columns when table scrolls horizontally */
        @media (max-width: 767.98px) {
          .cash-bank-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }

          .cash-bank-table-wrap table {
            min-width: 820px;
            border-collapse: separate;
            border-spacing: 0;
          }

          .cash-bank-table-wrap .je-col-index,
          .cash-bank-table-wrap .je-col-actions {
            position: sticky;
            background-color: #fff;
            z-index: 10;
            box-shadow: 1px 0 0 0 rgba(0, 0, 0, 0.05);
          }

          .cash-bank-table-wrap thead .je-col-index,
          .cash-bank-table-wrap thead .je-col-actions {
            z-index: 12;
            background-color: #f8f9fa;
          }

          .cash-bank-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }

          .cash-bank-table-wrap .je-col-actions {
            left: 44px;
            min-width: 56px;
            width: 56px;
          }

          .cash-bank-table-wrap table.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .cash-bank-table-wrap table.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: #f9f9f9;
          }

          .cash-bank-table-wrap table.table-hover > tbody > tr:hover > .je-col-index,
          .cash-bank-table-wrap table.table-hover > tbody > tr:hover > .je-col-actions {
            background-color: #e9ecef;
          }
        }

        .cash-bank-pie-chart .recharts-pie-label text,
        .cash-bank-pie-chart .recharts-pie-label-text,
        .cash-bank-pie-chart .recharts-label-text {
          font-size: 10px !important;
        }
      `}</style>

      {loading ? (
        <LoadingSpinner text="Loading cash and bank accounts..." />
      ) : (
        <>
          {/* Page Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <div className="flex-grow-1 mb-2 mb-md-0">
              <h1
                className="h4 mb-1 fw-bold"
                style={{ color: "var(--text-primary)" }}
              >
                <FaMoneyBillWave className="me-2" />
                Cash & Bank
              </h1>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                Track cash and bank transactions
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-sm"
                onClick={fetchCashAccounts}
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
                        Total Transactions
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Transactions",
                            stats.totalTransactions,
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
                          : abbreviateNumber(stats.totalTransactions, false)}
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
                        className="fas fa-list"
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
                        style={{
                          color:
                            stats.currentBalance >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
                        }}
                      >
                        Current Balance
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Current Balance",
                            stats.currentBalance,
                            true
                          )
                        }
                        style={{
                          color:
                            stats.currentBalance >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
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
                          : abbreviateNumber(stats.currentBalance, true)}
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
                        className="fas fa-wallet"
                        style={{
                          color:
                            stats.currentBalance >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
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

          {/* Search and Filter Controls - Corporate style */}
          <div
            className="card border-0 shadow-sm mb-3"
            style={{
              backgroundColor: "var(--background-white)",
              borderLeft: "4px solid var(--primary-color)",
            }}
          >
            <div
              className="card-header py-2 px-3"
              style={{
                backgroundColor: "#f8f9fa",
                borderBottom: "1px solid #dee2e6",
              }}
            >
              <span className="fw-semibold small" style={{ color: "var(--text-primary)" }}>
                <FaFilter className="me-1" style={{ color: "var(--primary-color)" }} />
                Filters &amp; View
              </span>
              <span className="small text-muted ms-2">Account • Date range • Search</span>
            </div>
            <div className="card-body p-3">
              <div className="row g-2 align-items-start">
                <div className="col-12 col-md-3 col-lg-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Account
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedAccount || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedAccount(v === "" ? "" : parseInt(v, 10));
                    }}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2 col-lg-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  />
                </div>
                <div className="col-6 col-md-2 col-lg-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  />
                </div>
                <div className="col-12 col-md-5 col-lg-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Search Transactions
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
                <div className="col-6 col-md-2 col-lg-1">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
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
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
                <div className="col-6 col-md-auto col-lg-auto">
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

          {/* Overview - Show when "All Accounts" is selected */}
          {(!selectedAccount || selectedAccount === "") && accounts.length > 0 && (
            <div
              className="card border-0 shadow-sm mb-4"
              style={{
                backgroundColor: "var(--background-white)",
                borderLeft: "4px solid var(--primary-color)",
              }}
            >
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "1px solid #dee2e6",
                }}
              >
                <h5 className="card-title mb-0 fw-semibold d-flex align-items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <FaChartBar style={{ color: "var(--primary-color)" }} />
                  Cash & Bank
                </h5>
                <p className="mb-0 small mt-1" style={{ color: "var(--text-muted)" }}>
                  Overview across all cash accounts • Based on selected date range
                </p>
              </div>
              <div className="card-body">
                {/* KPI Row - responsive layout, click to view full amount */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="border rounded p-3 h-100" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minWidth: 0 }}>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>Total Cash Position</div>
                      <div
                        className="fw-bold d-inline-block text-truncate w-100"
                        style={{
                          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                          color: "var(--primary-color)",
                          cursor: "pointer",
                          maxWidth: "100%",
                        }}
                        title={formatCurrency(analyticsData.totalCashPosition)}
                        onClick={() => handleNumberClick("Total Cash Position", analyticsData.totalCashPosition, true)}
                      >
                        {formatCurrency(analyticsData.totalCashPosition)}
                      </div>
                      <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="border rounded p-3 h-100" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minWidth: 0 }}>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>Total Inflows</div>
                      <div
                        className="fw-bold text-success d-inline-block text-truncate w-100"
                        style={{
                          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                          cursor: "pointer",
                          maxWidth: "100%",
                        }}
                        title={formatCurrency(analyticsData.debitCreditSummary[0]?.value ?? 0)}
                        onClick={() => handleNumberClick("Total Inflows (Credit)", analyticsData.debitCreditSummary[0]?.value ?? 0, true)}
                      >
                        {formatCurrency(analyticsData.debitCreditSummary[0]?.value ?? 0)}
                      </div>
                      <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="border rounded p-3 h-100" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minWidth: 0 }}>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>Total Outflows</div>
                      <div
                        className="fw-bold text-danger d-inline-block text-truncate w-100"
                        style={{
                          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                          cursor: "pointer",
                          maxWidth: "100%",
                        }}
                        title={formatCurrency(analyticsData.debitCreditSummary[1]?.value ?? 0)}
                        onClick={() => handleNumberClick("Total Outflows (Debit)", analyticsData.debitCreditSummary[1]?.value ?? 0, true)}
                      >
                        {formatCurrency(analyticsData.debitCreditSummary[1]?.value ?? 0)}
                      </div>
                      <div className="text-xxs mt-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Click to view full number
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="border rounded p-3 h-100" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minWidth: 0 }}>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>Accounts</div>
                      <div
                        className="fw-bold d-inline-block text-truncate w-100"
                        style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: "var(--text-primary)", cursor: "pointer", maxWidth: "100%" }}
                        title={`${accounts.length} accounts`}
                        onClick={() => handleNumberClick("Number of Accounts", accounts.length, false)}
                      >
                        {accounts.length}
                      </div>
                      <div className="small text-muted">Cash in Bank, Hand, Petty</div>
                    </div>
                  </div>
                </div>
                {/* Charts Row */}
                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="border rounded p-3 h-100" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minHeight: "280px" }}>
                      <div className="small fw-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                        <FaChartBar className="me-2" style={{ color: "var(--primary-color)" }} />
                        Balance by Account
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analyticsData.balanceByAccount} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="shortName" tick={{ fontSize: 11 }} stroke="#6c757d" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#6c757d" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => [formatCurrency(v), "Balance"]} labelFormatter={(l) => l} />
                          <Bar dataKey="balance" name="Balance" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="border rounded p-3 h-100 cash-bank-pie-wrapper" style={{ backgroundColor: "#fff", borderColor: "#e9ecef", minHeight: "280px", overflow: "visible" }}>
                      <div className="small fw-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                        <FaChartPie className="me-2" style={{ color: "var(--primary-color)" }} />
                        Balance Distribution
                      </div>
                      <div className="cash-bank-pie-chart" style={{ width: "100%", height: "clamp(220px, 40vw, 260px)", overflow: "visible" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                            <Pie
                              data={analyticsData.distributionPie}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius="75%"
                              label={({ chartLabel, name, percent }) =>
                                percent > 0.05 ? `${chartLabel || name} ${(percent * 100).toFixed(0)}%` : ""
                              }
                              labelLine={{ strokeWidth: 1 }}
                            >
                              {analyticsData.distributionPie.map((entry, i) => (
                                <Cell key={i} fill={entry.fill || ["#0d6efd", "#198754", "#fd7e14", "#6f42c1"][i % 4]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row g-4 mt-2">
                  <div className="col-12">
                    <div className="border rounded p-3" style={{ backgroundColor: "#fff", borderColor: "#e9ecef" }}>
                      <div className="small fw-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                        Inflows vs Outflows
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={analyticsData.debitCreditSummary}
                          layout="vertical"
                          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#6c757d" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#6c757d" width={120} />
                          <Tooltip formatter={(v) => [formatCurrency(v), "Amount"]} />
                          <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                            {analyticsData.debitCreditSummary.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedAccount && currentAccount ? (
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
                    <i className="fas fa-money-bill-wave me-2"></i>
                    {currentAccount.account_code} -{" "}
                    {currentAccount.account_name}
                    {!loading && (
                      <small className="opacity-75 ms-2 text-white">
                        ({paginationMeta.total} transactions)
                      </small>
                    )}
                  </h5>
                </div>
              </div>

              <div className="card-body p-0">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <i
                        className="fas fa-money-bill-wave fa-3x"
                        style={{ color: "var(--text-muted)", opacity: 0.5 }}
                      ></i>
                    </div>
                    <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                      No Transactions Found
                    </h5>
                    <p
                      className="mb-3 small"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {searchTerm || startDate || endDate
                        ? "Try adjusting your search criteria"
                        : "No transactions found for this account."}
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive cash-bank-table-wrap">
                    <table className="table table-striped table-hover mb-0">
                      <thead
                        style={{ backgroundColor: "var(--background-light)" }}
                      >
                        <tr>
                          <th
                            className="text-center small fw-semibold je-col-index"
                            style={{ width: "4%" }}
                          >
                            #
                          </th>
                          <th
                            className="text-center small fw-semibold je-col-actions"
                            style={{ width: "10%" }}
                          >
                            Actions
                          </th>
                          <th
                            className="small fw-semibold"
                            style={{ width: "12%" }}
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("date")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Date
                              <i className={`ms-1 ${getSortIcon("date")}`}></i>
                            </button>
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
                                className={`ms-1 ${getSortIcon(
                                  "entry_number"
                                )}`}
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
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("reference")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Reference
                              <i
                                className={`ms-1 ${getSortIcon("reference")}`}
                              ></i>
                            </button>
                          </th>
                          <th
                            className="text-end small fw-semibold"
                            style={{ width: "12%" }}
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                              onClick={() => handleSort("debit")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Debit
                              <i className={`ms-1 ${getSortIcon("debit")}`}></i>
                            </button>
                          </th>
                          <th
                            className="text-end small fw-semibold"
                            style={{ width: "12%" }}
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                              onClick={() => handleSort("credit")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Credit
                              <i
                                className={`ms-1 ${getSortIcon("credit")}`}
                              ></i>
                            </button>
                          </th>
                          <th
                            className="text-end small fw-semibold"
                            style={{ width: "12%" }}
                          >
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTransactions.map((transaction, index) => (
                          <tr key={index} className="align-middle">
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
                                  onClick={() =>
                                    setViewingTransaction(transaction)
                                  }
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
                              </div>
                            </td>
                            <td className="text-muted small">
                              {formatDate(transaction.date)}
                            </td>
                            <td
                              style={{ maxWidth: "150px", overflow: "hidden" }}
                            >
                              <div
                                className="fw-medium"
                                style={{
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={transaction.entry_number}
                              >
                                <code>{transaction.entry_number}</code>
                              </div>
                            </td>
                            <td
                              style={{ maxWidth: "300px", overflow: "hidden" }}
                            >
                              <div
                                className="small"
                                style={{
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={transaction.description}
                              >
                                {transaction.description}
                              </div>
                            </td>
                            <td
                              style={{ maxWidth: "150px", overflow: "hidden" }}
                            >
                              <div
                                className="small text-muted"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={transaction.reference || "—"}
                              >
                                {transaction.reference || "—"}
                              </div>
                            </td>
                            <td className="text-end text-danger fw-semibold">
                              <span
                                className="d-inline-block text-truncate"
                                style={{ maxWidth: "140px", cursor: "pointer" }}
                                title={
                                  transaction.debit > 0
                                    ? formatCurrency(transaction.debit)
                                    : "—"
                                }
                                onClick={() =>
                                  handleNumberClick(
                                    "Debit",
                                    transaction.debit ?? 0,
                                    true
                                  )
                                }
                              >
                                {transaction.debit > 0
                                  ? formatCurrency(transaction.debit)
                                  : "—"}
                              </span>
                            </td>
                            <td className="text-end text-success fw-semibold">
                              <span
                                className="d-inline-block text-truncate"
                                style={{ maxWidth: "140px", cursor: "pointer" }}
                                title={
                                  transaction.credit > 0
                                    ? formatCurrency(transaction.credit)
                                    : "—"
                                }
                                onClick={() =>
                                  handleNumberClick(
                                    "Credit",
                                    transaction.credit ?? 0,
                                    true
                                  )
                                }
                              >
                                {transaction.credit > 0
                                  ? formatCurrency(transaction.credit)
                                  : "—"}
                              </span>
                            </td>
                            <td
                              className={`text-end fw-bold ${
                                transaction.balance >= 0
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              <span
                                className="d-inline-block text-truncate"
                                style={{ maxWidth: "140px", cursor: "pointer" }}
                                title={formatCurrency(transaction.balance)}
                                onClick={() =>
                                  handleNumberClick(
                                    "Balance",
                                    transaction.balance,
                                    true
                                  )
                                }
                              >
                                {formatCurrency(transaction.balance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {filteredTransactions.length > 0 && (
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="6">
                              <strong>Totals:</strong>
                            </td>
                            <td className="text-end">
                              <strong className="text-danger">
                                <span
                                  className="d-inline-block text-truncate"
                                  style={{
                                    maxWidth: "140px",
                                    cursor: "pointer",
                                  }}
                                  title={formatCurrency(stats.totalDebit)}
                                  onClick={() =>
                                    handleNumberClick(
                                      "Total Debit",
                                      stats.totalDebit,
                                      true
                                    )
                                  }
                                >
                                  {formatCurrency(stats.totalDebit)}
                                </span>
                              </strong>
                            </td>
                            <td className="text-end">
                              <strong className="text-success">
                                <span
                                  className="d-inline-block text-truncate"
                                  style={{
                                    maxWidth: "140px",
                                    cursor: "pointer",
                                  }}
                                  title={formatCurrency(stats.totalCredit)}
                                  onClick={() =>
                                    handleNumberClick(
                                      "Total Credit",
                                      stats.totalCredit,
                                      true
                                    )
                                  }
                                >
                                  {formatCurrency(stats.totalCredit)}
                                </span>
                              </strong>
                            </td>
                            <td className="text-end">
                              <strong
                                className={
                                  stats.currentBalance >= 0
                                    ? "text-success"
                                    : "text-danger"
                                }
                              >
                                <span
                                  className="d-inline-block text-truncate"
                                  style={{
                                    maxWidth: "140px",
                                    cursor: "pointer",
                                  }}
                                  title={formatCurrency(stats.currentBalance)}
                                  onClick={() =>
                                    handleNumberClick(
                                      "Current Balance",
                                      stats.currentBalance,
                                      true
                                    )
                                  }
                                >
                                  {formatCurrency(stats.currentBalance)}
                                </span>
                              </strong>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>

              {!loading && filteredTransactions.length > 0 && (
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
                              startIndex + currentTransactions.length,
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
                        transactions
                      </small>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={
                          paginationMeta.current_page === 1 ||
                          isActionDisabled()
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
                                  e.target.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  !e.target.disabled &&
                                  paginationMeta.current_page !== page
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
          ) : accounts.length === 0 ? (
            <div
              className="card border-0 shadow-sm"
              style={{ backgroundColor: "var(--background-white)" }}
            >
              <div className="card-body text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-money-bill-wave fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Accounts Found
                </h5>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  No cash or bank accounts are available.
                </p>
              </div>
            </div>
          ) : selectedAccount ? (
            <div
              className="card border-0 shadow-sm"
              style={{ backgroundColor: "var(--background-white)" }}
            >
              <div className="card-body text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-money-bill-wave fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  Account Not Found
                </h5>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  The selected account could not be found. Please select a
                  different account.
                </p>
              </div>
            </div>
          ) : null}

          {/* View Transaction Modal */}
          {viewingTransaction && currentAccount && (
            <CashBankTransactionViewModal
              transaction={viewingTransaction}
              account={currentAccount}
              onClose={() => setViewingTransaction(null)}
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
    }, 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
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

export default CashBank;
