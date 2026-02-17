import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Preloader from "../../components/Preloader";
import { useNavigate } from "react-router-dom";
import Portal from "../../components/Portal";
import { showToast } from "../../services/notificationService";
import {
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaFileInvoice,
  FaUsers,
  FaTruck,
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaPlus,
  FaExclamationTriangle,
  FaClock,
  FaEye,
  FaCalendarAlt,
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

const REPORT_HEADER_STYLE = {
  padding: "0.875rem 1.25rem",
  background: "linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)",
  borderBottom: "1px solid #334155",
};

const AdminDashboard = ({ variant = "admin" }) => {
  const { user, loading: authLoading, request, currentAccount } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("current_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStart, setAppliedCustomStart] = useState("");
  const [appliedCustomEnd, setAppliedCustomEnd] = useState("");
  const [contentKey, setContentKey] = useState(0);
  const [numberViewModal, setNumberViewModal] = useState({ show: false, title: "", value: "", formattedValue: "" });

  useEffect(() => {
    if (!authLoading && user && currentAccount) {
      const isRefetch = !!dashboardData;
      fetchDashboardData(isRefetch);
    }
  }, [authLoading, user, currentAccount?.id, dateRange, appliedCustomStart, appliedCustomEnd]);

  const getDateRangeParams = () => {
    const now = new Date();
    let startDate, endDate;
    switch (dateRange) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      case "last_month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
        break;
      }
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      case "custom":
        if (appliedCustomStart && appliedCustomEnd) {
          startDate = appliedCustomStart;
          endDate = appliedCustomEnd;
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          endDate = now.toISOString().split("T")[0];
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
    }
    return { start_date: startDate, end_date: endDate };
  };

  const fetchDashboardData = async (skipFullLoading = false) => {
    try {
      if (!skipFullLoading) setLoading(true);
      const dateParams = getDateRangeParams();
      const params = new URLSearchParams(dateParams);
      const data = await request(`/accounting/dashboard?${params.toString()}`);
      setDashboardData(data);
      if (skipFullLoading) setContentKey((k) => k + 1);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      fetchDashboardDataManually();
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardDataManually = async () => {
    try {
      const [invoicesData, billsData, journalData, cashData, clientsData, suppliersData] = await Promise.all([
        request("/accounting/invoices?per_page=1000").catch(() => ({ data: [] })),
        request("/accounting/bills?per_page=1000").catch(() => ({ data: [] })),
        request("/accounting/journal-entries?per_page=1000").catch(() => ({ data: [] })),
        request("/accounting/cash-bank").catch(() => ({ accounts: [] })),
        request("/accounting/clients?per_page=100").catch(() => ({ data: [] })),
        request("/accounting/suppliers?per_page=100").catch(() => ({ data: [] })),
      ]);

      const dateParams = getDateRangeParams();
      const startDate = new Date(dateParams.start_date);
      const endDate = new Date(dateParams.end_date);

      const invoices = Array.isArray(invoicesData) ? invoicesData : invoicesData?.data || [];
      const bills = Array.isArray(billsData) ? billsData : billsData?.data || [];
      const journals = Array.isArray(journalData) ? journalData : journalData?.data || [];
      const cashAccounts = Array.isArray(cashData) ? cashData : cashData?.accounts || cashData?.data || [];
      const clients = Array.isArray(clientsData) ? clientsData : clientsData?.data || [];
      const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || [];

      const filterByDate = (item) => {
        const itemDate = new Date(item.invoice_date || item.bill_date || item.entry_date || item.created_at);
        return itemDate >= startDate && itemDate <= endDate;
      };

      const filteredInvoices = invoices.filter(filterByDate);
      const filteredBills = bills.filter(filterByDate);
      const filteredJournals = journals.filter(filterByDate);

      const totalIncome = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
      const totalExpenses = filteredBills.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);
      const netIncome = totalIncome - totalExpenses;
      const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance || acc.balance) || 0), 0);
      const totalAR = invoices.filter((inv) => inv.status !== "paid").reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
      const totalAP = bills.filter((bill) => bill.status !== "paid").reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);

      const recentJournals = journals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      const recentInvoices = invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      const recentBills = bills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

      const monthlyData = {};
      [...filteredInvoices, ...filteredBills].forEach((item) => {
        const date = new Date(item.invoice_date || item.bill_date || item.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0, month: monthKey };
        if (item.invoice_date) monthlyData[monthKey].income += parseFloat(item.total_amount) || 0;
        else monthlyData[monthKey].expenses += parseFloat(item.total_amount) || 0;
      });

      const incomeByAccount = {};
      filteredInvoices.forEach((inv) => {
        const accId = inv.income_account_id || "other";
        if (!incomeByAccount[accId]) incomeByAccount[accId] = { account_name: inv.income_account?.account_name || "Other", total: 0 };
        incomeByAccount[accId].total += parseFloat(inv.total_amount) || 0;
      });
      const expenseByAccount = {};
      filteredBills.forEach((bill) => {
        const accId = bill.expense_account_id || "other";
        if (!expenseByAccount[accId]) expenseByAccount[accId] = { account_name: bill.expense_account?.account_name || "Other", total: 0 };
        expenseByAccount[accId].total += parseFloat(bill.total_amount) || 0;
      });
      const clientRevenue = {};
      filteredInvoices.forEach((inv) => {
        const id = inv.client_id || "other";
        if (!clientRevenue[id]) clientRevenue[id] = { client_name: inv.client?.name || "Other", total: 0 };
        clientRevenue[id].total += parseFloat(inv.total_amount) || 0;
      });
      const supplierExpenses = {};
      filteredBills.forEach((bill) => {
        const id = bill.supplier_id || "other";
        if (!supplierExpenses[id]) supplierExpenses[id] = { supplier_name: bill.supplier?.name || "Other", total: 0 };
        supplierExpenses[id].total += parseFloat(bill.total_amount) || 0;
      });

      const overdueInvoices = invoices.filter((inv) => inv.status !== "paid" && new Date(inv.due_date || inv.invoice_date) < new Date());
      const overdueBills = bills.filter((bill) => bill.status !== "paid" && new Date(bill.due_date || bill.bill_date) < new Date());
      const lowCashAccounts = cashAccounts.filter((acc) => parseFloat(acc.balance) < 10000);
      const unbalancedEntries = journals.filter((entry) => Math.abs((parseFloat(entry.total_debit) || 0) - (parseFloat(entry.total_credit) || 0)) > 0.01);

      setDashboardData({
        overview: { totalIncome, totalExpenses, netIncome, cashBalance: totalCashBalance, accountsReceivable: totalAR, accountsPayable: totalAP, totalJournalEntries: journals.length },
        recentTransactions: { journals: recentJournals, invoices: recentInvoices, bills: recentBills },
        monthlyData: Object.entries(monthlyData)
          .sort()
          .map(([month, data]) => ({ month: month.slice(0, 7), monthLabel: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }), income: data.income, expenses: data.expenses })),
        incomeExpensePie: [
          { name: "Income", value: totalIncome, fill: "#198754" },
          { name: "Expenses", value: totalExpenses, fill: "#dc3545" },
        ].filter((d) => d.value > 0),
        topAccounts: {
          income: Object.values(incomeByAccount).sort((a, b) => b.total - a.total).slice(0, 5),
          expenses: Object.values(expenseByAccount).sort((a, b) => b.total - a.total).slice(0, 5),
        },
        topClients: Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5),
        topSuppliers: Object.values(supplierExpenses).sort((a, b) => b.total - a.total).slice(0, 5),
        alerts: {
          overdueInvoices: overdueInvoices.length,
          overdueBills: overdueBills.length,
          lowCashAccounts: lowCashAccounts.length,
          unbalancedEntries: unbalancedEntries.length,
          overdueInvoicesList: overdueInvoices.slice(0, 5),
          overdueBillsList: overdueBills.slice(0, 5),
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data manually:", error);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(amount || 0);

  const abbreviateNumber = (amount, isCurrency = false) => {
    if (amount === null || amount === undefined || amount === 0) return isCurrency ? "₱0.00" : "0";
    const num = Math.abs(amount);
    let abbreviated = "";
    let suffix = "";
    if (num >= 1000000000) { abbreviated = (num / 1000000000).toFixed(1); suffix = "B"; }
    else if (num >= 1000000) { abbreviated = (num / 1000000).toFixed(1); suffix = "M"; }
    else if (num >= 1000) { abbreviated = (num / 1000).toFixed(1); suffix = "K"; }
    else { abbreviated = num.toFixed(2); }
    abbreviated = parseFloat(abbreviated).toString();
    const sign = amount < 0 ? "-" : "";
    return isCurrency ? `${sign}₱${abbreviated}${suffix}` : `${sign}${abbreviated}${suffix}`;
  };

  const formatFullNumber = (amount, isCurrency = false) => {
    if (isCurrency) return formatCurrency(amount);
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount || 0);
  };

  const handleNumberClick = (title, value, isCurrency = false) => {
    setNumberViewModal({ show: true, title, value, formattedValue: formatFullNumber(value, isCurrency) });
  };

  const formatDate = (dateString) =>
    !dateString ? "N/A" : new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (authLoading || loading || !user || !dashboardData) return <Preloader text="Loading dashboard..." />;

  const { overview, recentTransactions, monthlyData: rawMonthly, incomeExpensePie: rawPie, topAccounts, topClients, topSuppliers, alerts } = dashboardData;
  const monthlyData = (rawMonthly || []).map((d) => ({ ...d, monthLabel: d.monthLabel || (d.month ? new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "") }));
  const incomeExpensePie = rawPie?.length > 0 ? rawPie : [ { name: "Income", value: overview.totalIncome, fill: "#198754" }, { name: "Expenses", value: overview.totalExpenses, fill: "#dc3545" } ].filter((d) => d.value > 0);

  const applyCustomFilter = () => {
    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
  };

  const clearCustomDates = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setAppliedCustomStart("");
    setAppliedCustomEnd("");
  };

  return (
    <div className="container-fluid px-3 pt-0 pb-2 dashboard-container">
        {/* Page header */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: "1.25rem" }}>
          <div style={REPORT_HEADER_STYLE}>
            <h1 className="h5 mb-0 text-white d-flex align-items-center gap-2">
              <FaChartLine style={{ opacity: 0.9 }} />
              Overview
            </h1>
            <p className="mb-0 small text-white-50 mt-1">Financial summary for the selected period.</p>
          </div>
          <div className="p-3 bg-light d-flex flex-wrap align-items-center gap-3" style={{ borderTop: "1px solid #e2e8f0" }}>
            <span className="small fw-600 text-secondary d-flex align-items-center gap-1">
              <FaCalendarAlt /> Period
            </span>
            <select className="form-select form-select-sm" value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width: "auto", maxWidth: "200px", borderColor: "#cbd5e1", borderRadius: "6px" }}>
              <option value="current_month">Current month</option>
              <option value="last_month">Last month</option>
              <option value="current_year">Year to date</option>
              <option value="custom">Custom range</option>
            </select>
            {dateRange === "custom" && (
              <>
                <label className="small text-secondary mb-0 align-self-center">From</label>
                <input type="date" className="form-control form-control-sm" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: "auto", borderColor: "#cbd5e1", borderRadius: "6px" }} />
                <label className="small text-secondary mb-0 align-self-center">To</label>
                <input type="date" className="form-control form-control-sm" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: "auto", borderColor: "#cbd5e1", borderRadius: "6px" }} />
                <button type="button" className="btn btn-sm btn-primary" style={{ borderRadius: "6px" }} onClick={applyCustomFilter} disabled={!customStartDate || !customEndDate}>Filter</button>
                <button type="button" className="btn btn-sm dashboard-period-clear-btn" onClick={clearCustomDates}>Clear</button>
              </>
            )}
          </div>
        </div>

        <div key={contentKey} className="fadeIn">
        {/* Alerts */}
        {(alerts.overdueInvoices > 0 || alerts.overdueBills > 0 || alerts.lowCashAccounts > 0 || alerts.unbalancedEntries > 0) && (
          <div className="mb-4" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ ...REPORT_HEADER_STYLE, background: "linear-gradient(180deg, #b45309 0%, #92400e 100%)" }}>
              <h6 className="mb-0 text-white d-flex align-items-center gap-2"><FaExclamationTriangle /> Alerts & notifications</h6>
                </div>
            <div className="p-3 d-flex flex-wrap gap-2">
              {alerts.overdueInvoices > 0 && <span className="badge bg-danger px-3 py-2"><FaClock className="me-1" /> {alerts.overdueInvoices} Overdue invoices</span>}
              {alerts.overdueBills > 0 && <span className="badge bg-danger px-3 py-2"><FaClock className="me-1" /> {alerts.overdueBills} Overdue bills</span>}
              {alerts.lowCashAccounts > 0 && <span className="badge bg-warning text-dark px-3 py-2"><FaExclamationTriangle className="me-1" /> {alerts.lowCashAccounts} Low cash accounts</span>}
              {alerts.unbalancedEntries > 0 && <span className="badge bg-warning text-dark px-3 py-2"><FaExclamationTriangle className="me-1" /> {alerts.unbalancedEntries} Unbalanced entries</span>}
            </div>
          </div>
        )}

        {/* KPI cards – corporate greyish style, smooth hover transition, click to view full number */}
        <style>{`
          .dashboard-kpi-card {
            background-color: #ffffff;
            border-left: 4px solid #94a3b8;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: background-color 0.28s ease, border-left-color 0.28s ease, box-shadow 0.28s ease;
          }
          .dashboard-kpi-card:hover {
            background-color: #f1f5f9;
            border-left-color: #475569;
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          }
          .dashboard-kpi-card .kpi-value {
            transition: color 0.2s ease, opacity 0.2s ease;
          }
          .dashboard-kpi-card:hover .kpi-value {
            color: #0f172a;
          }
          /* Full-value modal: smooth open/close like Journal Entries */
          @keyframes dashboardModalBackdropFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes dashboardModalBackdropFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes dashboardModalContentSlideIn {
            from { opacity: 0; transform: translateY(-24px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes dashboardModalContentSlideOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-16px) scale(0.98); }
          }
          .dashboard-modal-backdrop {
            animation: dashboardModalBackdropFadeIn 0.28s ease-out forwards;
          }
          .dashboard-modal-backdrop.exit {
            animation: dashboardModalBackdropFadeOut 0.2s ease-in forwards;
          }
          .dashboard-modal-content {
            animation: dashboardModalContentSlideIn 0.28s ease-out forwards;
          }
          .dashboard-modal-content.exit {
            animation: dashboardModalContentSlideOut 0.2s ease-in forwards;
          }
          /* Quick actions – corporate button styling */
          .dashboard-quick-action-btn {
            border-radius: 6px;
            border: 1px solid #d4dbe5;
            background-color: #f9fafb;
            color: #0f172a;
            font-size: 0.85rem;
            font-weight: 500;
            padding: 0.5rem 0.75rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            text-align: left;
            transition: background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, transform 0.12s ease;
          }
          .dashboard-quick-action-btn:hover:not(:disabled) {
            background-color: #e5edf7;
            border-color: #1e3a5f;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
            transform: translateY(-1px);
          }
          .dashboard-quick-action-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            box-shadow: none;
          }
          .dashboard-quick-action-main {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .dashboard-quick-action-icon {
            width: 26px;
            height: 26px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            background-color: #e5e7eb;
            color: #1f2937;
          }
          .dashboard-quick-action-icon.income {
            background-color: rgba(22, 163, 74, 0.08);
            color: #166534;
          }
          .dashboard-quick-action-icon.expense {
            background-color: rgba(220, 38, 38, 0.08);
            color: #b91c1c;
          }
          .dashboard-quick-action-icon.cash {
            background-color: rgba(37, 99, 235, 0.08);
            color: #1d4ed8;
          }
          .dashboard-quick-action-meta {
            font-size: 0.7rem;
            color: #94a3b8;
          }
          .dashboard-period-clear-btn {
            border: 1px solid #cbd5e1;
            background-color: #fff;
            color: #475569;
            border-radius: 6px;
            font-weight: 500;
            transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          }
          .dashboard-period-clear-btn:hover {
            background-color: #f1f5f9;
            border-color: #94a3b8;
            color: #334155;
          }
          /* Recent transactions table – corporate row hover & styling */
          .dashboard-recent-table {
            font-size: 0.8125rem;
          }
          .dashboard-recent-table thead tr {
            background-color: #f1f5f9 !important;
            border-bottom: 1px solid #e2e8f0;
          }
          .dashboard-recent-table thead th {
            padding: 0.625rem 0.75rem;
            font-weight: 600;
            color: #475569;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .dashboard-recent-table tbody tr {
            border-bottom: 1px solid #f1f5f9;
            transition: background-color 0.22s ease;
          }
          .dashboard-recent-table tbody tr:hover {
            background-color: #f8fafc !important;
          }
          .dashboard-recent-table tbody td {
            padding: 0.5rem 0.75rem;
            color: #334155;
            vertical-align: middle;
          }
          .dashboard-recent-table .dashboard-tx-badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
          }
          .dashboard-recent-table .dashboard-tx-badge.journal {
            background-color: rgba(100, 116, 139, 0.12);
            color: #475569;
          }
          .dashboard-recent-table .dashboard-tx-badge.invoice {
            background-color: rgba(22, 163, 74, 0.1);
            color: #166534;
          }
          .dashboard-recent-table .dashboard-tx-badge.balanced,
          .dashboard-recent-table .dashboard-tx-badge.paid {
            background-color: rgba(22, 163, 74, 0.1);
            color: #166534;
          }
          .dashboard-recent-table .dashboard-tx-badge.partial {
            background-color: rgba(180, 83, 9, 0.12);
            color: #b45309;
          }
          .dashboard-recent-table .dashboard-tx-view-btn {
            width: 32px;
            height: 32px;
            padding: 0;
            border: 1px solid #d4dbe5;
            background-color: #f9fafb;
            color: #475569;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          }
          .dashboard-recent-table .dashboard-tx-view-btn:hover {
            background-color: #e5edf7;
            border-color: #1e3a5f;
            color: #1e3a5f;
          }
        `}</style>
        <div className="row g-3 mb-4 row-cols-2 row-cols-md-3 row-cols-lg-6">
          {[
            { label: "Total income", value: overview.totalIncome, icon: FaArrowUp, accent: "#64748b" },
            { label: "Total expenses", value: overview.totalExpenses, icon: FaArrowDown, accent: "#64748b" },
            { label: "Net income", value: overview.netIncome, icon: FaChartLine, accent: overview.netIncome >= 0 ? "#475569" : "#78716c" },
            { label: "Cash balance", value: overview.cashBalance, icon: FaWallet, accent: "#64748b" },
            { label: "Accounts receivable", value: overview.accountsReceivable, icon: FaUsers, accent: "#57534e" },
            { label: "Accounts payable", value: overview.accountsPayable, icon: FaTruck, accent: "#475569" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="col">
              <div className="dashboard-kpi-card h-100 rounded border-0 overflow-hidden">
                <div className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-uppercase small fw-semibold" style={{ color: "#64748b", letterSpacing: "0.02em", fontSize: "0.7rem" }}>{label}</span>
                    <Icon style={{ color: accent, fontSize: "1rem", opacity: 0.85, transition: "color 0.28s ease" }} />
                  </div>
                  <div
                    className="kpi-value fw-bold text-truncate"
              style={{
                      color: "#334155",
                      fontSize: "clamp(0.875rem, 2vw, 1.15rem)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleNumberClick(label, value, true)}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    title="Click to view full number"
                  >
                    {abbreviateNumber(value, true)}
                  </div>
                  <div className="mt-1 small" style={{ color: "#94a3b8", fontSize: "0.65rem", fontStyle: "italic" }}>
                    <i className="fas fa-info-circle me-1" style={{ opacity: 0.8 }} /> Click to view full number
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>

        <div className="row g-3 mb-4 align-items-stretch">
          {/* Quick actions – stretches to match height; footer link uses empty space */}
          <div className="col-12 col-md-6 col-lg-3 d-flex">
            <div className="rounded overflow-hidden d-flex flex-column w-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={REPORT_HEADER_STYLE}>
                <h6 className="mb-0 text-white d-flex align-items-center gap-2"><FaPlus /> Quick actions</h6>
              </div>
              <div className="p-3 d-flex flex-column flex-grow-1">
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="dashboard-quick-action-btn"
                    onClick={() => navigate("/admin/accounting/journal-entries")}
                  >
                    <span className="dashboard-quick-action-main">
                      <span className="dashboard-quick-action-icon">
                        <FaFileInvoice />
                      </span>
                      <span>New journal entry</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-quick-action-btn"
                    onClick={() => navigate("/admin/accounting/income")}
                  >
                    <span className="dashboard-quick-action-main">
                      <span className="dashboard-quick-action-icon income">
                        <FaArrowUp />
                      </span>
                      <span>Add income</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-quick-action-btn"
                    onClick={() => navigate("/admin/accounting/expenses")}
                  >
                    <span className="dashboard-quick-action-main">
                      <span className="dashboard-quick-action-icon expense">
                        <FaArrowDown />
                      </span>
                      <span>Add expense</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-quick-action-btn"
                    onClick={() => navigate("/admin/accounting/cash-bank")}
                  >
                    <span className="dashboard-quick-action-main">
                      <span className="dashboard-quick-action-icon cash">
                        <FaWallet />
                      </span>
                      <span>Cash & bank</span>
                    </span>
                  </button>
                </div>
                <div className="mt-auto pt-3 border-top" style={{ borderColor: "#e2e8f0" }}>
                  <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" style={{ color: "#1e3a5f" }} onClick={() => navigate("/admin/accounting/reports")}>View Financial Reports →</button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent transactions – corporate table with smooth row hover */}
          <div className="col-12 col-md-6 col-lg-9 d-flex">
            <div className="rounded overflow-hidden d-flex flex-column w-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={REPORT_HEADER_STYLE}>
                <h6 className="mb-0 text-white d-flex align-items-center gap-2"><FaClock /> Recent transactions</h6>
              </div>
                <div className="table-responsive">
                <table className="table mb-0 dashboard-recent-table">
                  <thead>
                      <tr>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Date</th>
                      <th className="text-end">Amount</th>
                        <th>Status</th>
                      <th className="text-end" style={{ width: "56px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.journals.slice(0, 3).map((entry) => (
                      <tr key={`j-${entry.id}`}>
                        <td><span className="dashboard-tx-badge journal">Journal</span></td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{entry.entry_number}</td>
                          <td>{formatDate(entry.entry_date)}</td>
                        <td className="text-end" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(entry.total_debit)}</td>
                        <td><span className="dashboard-tx-badge balanced">Balanced</span></td>
                        <td className="text-end">
                          <button type="button" className="dashboard-tx-view-btn" onClick={() => navigate("/admin/accounting/journal-entries")} title="View"><FaEye /></button>
                          </td>
                        </tr>
                      ))}
                    {recentTransactions.invoices.slice(0, 2).map((inv) => (
                      <tr key={`i-${inv.id}`}>
                        <td><span className="dashboard-tx-badge invoice">Invoice</span></td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{inv.invoice_number}</td>
                        <td>{formatDate(inv.invoice_date)}</td>
                        <td className="text-end" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(inv.total_amount)}</td>
                        <td><span className={`dashboard-tx-badge ${inv.status === "paid" ? "paid" : "partial"}`}>{inv.status}</span></td>
                        <td className="text-end">
                          <button type="button" className="dashboard-tx-view-btn" onClick={() => navigate("/admin/accounting/clients-ar")} title="View"><FaEye /></button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>
        </div>

        {/* Charts row – recharts */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-8">
            <div className="rounded overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={REPORT_HEADER_STYLE}>
                <h6 className="mb-0 text-white d-flex align-items-center gap-2"><FaChartBar /> Income vs expenses trend</h6>
              </div>
              <div className="p-3">
                {monthlyData && monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [formatCurrency(v), ""]} labelFormatter={(l) => l} contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#198754" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#dc3545" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="d-flex align-items-center justify-content-center" style={{ height: 300, color: "#64748b" }}>No trend data for the selected period.</div>
                )}
                </div>
              </div>
            </div>
          <div className="col-12 col-lg-4">
            <div className="rounded overflow-hidden h-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={REPORT_HEADER_STYLE}>
                <h6 className="mb-0 text-white d-flex align-items-center gap-2"><FaChartPie /> Income vs expenses</h6>
              </div>
              <div className="p-3" style={{ minHeight: 280 }}>
                {incomeExpensePie && incomeExpensePie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie data={incomeExpensePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#64748b" }}>
                        {incomeExpensePie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100" style={{ color: "#64748b" }}>No data for the selected period.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top analytics – horizontal bar charts, corporate style */}
        <div className="row g-3">
          {[
            { title: "Top income accounts", data: topAccounts.income, colKey: "account_name", valKey: "total", icon: FaChartLine, barFill: "#475569" },
            { title: "Top clients", data: topClients, colKey: "client_name", valKey: "total", icon: FaUsers, barFill: "#334155" },
            { title: "Top suppliers", data: topSuppliers, colKey: "supplier_name", valKey: "total", icon: FaTruck, barFill: "#64748b" },
            { title: "Top expense accounts", data: topAccounts.expenses, colKey: "account_name", valKey: "total", icon: FaChartLine, barFill: "#57534e" },
          ].map(({ title, data, colKey, valKey, icon: Icon, barFill }) => {
            const chartData = (data.slice(0, 6) || []).map((row) => ({
              name: (row[colKey] || "").length > 18 ? (row[colKey] || "").slice(0, 16) + "…" : (row[colKey] || ""),
              fullName: row[colKey] || "",
              value: parseFloat(row[valKey]) || 0,
            }));
            const maxVal = chartData.length ? Math.max(...chartData.map((d) => d.value)) : 0;
            return (
              <div key={title} className="col-12 col-md-6 col-lg-3">
                <div className="h-100 rounded overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={REPORT_HEADER_STYLE}>
                    <h6 className="mb-0 text-white d-flex align-items-center gap-2"><Icon /> {title}</h6>
              </div>
                  <div className="p-2 p-sm-3" style={{ minHeight: 220 }}>
                    {chartData.length === 0 ? (
                      <div className="d-flex align-items-center justify-content-center h-100" style={{ minHeight: 200, color: "#94a3b8", fontSize: "0.8125rem" }}>No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 12, left: 2, bottom: 6 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => (v >= 1e6 ? `₱${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₱${(v / 1e3).toFixed(0)}k` : `₱${v}`)} axisLine={{ stroke: "#e2e8f0" }} tickLine={{ stroke: "#e2e8f0" }} />
                          <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(value) => [formatCurrency(value), "Amount"]}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                            contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem" }}
                            cursor={{ fill: "rgba(100, 116, 139, 0.06)" }}
                          />
                          <Bar dataKey="value" fill={barFill} radius={[0, 2, 2, 0]} maxBarSize={22} isAnimationActive animationDuration={400} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </div>
              </div>
            </div>
            );
          })}
          </div>

          </div>

        {numberViewModal.show && (
          <DashboardNumberViewModal
            title={numberViewModal.title}
            value={numberViewModal.formattedValue}
            onClose={() => setNumberViewModal((p) => ({ ...p, show: false }))}
          />
        )}
                </div>
  );
};

function DashboardNumberViewModal({ title, value, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 220);
  };
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) handleClose(); };
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => showToast.success("Copied to clipboard")).catch(() => showToast.error("Failed to copy"));
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Portal>
      <div
        className={`modal fade show d-block dashboard-modal-backdrop ${isClosing ? "exit" : ""}`}
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div
            className={`modal-content border-0 shadow dashboard-modal-content ${isClosing ? "exit" : ""}`}
            style={{ borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="modal-header border-0 text-white" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}>
              <h5 className="modal-title fw-bold">{title}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose} aria-label="Close" />
            </div>
            <div className="modal-body text-center py-4 bg-light">
              <div className="h2 mb-2 fw-bold" style={{ color: "var(--primary-color)", fontSize: "clamp(1.25rem, 3vw, 2rem)", wordBreak: "break-word" }}>{value}</div>
              <p className="text-muted small mb-0">Full number value</p>
          </div>
            <div className="modal-footer border-top bg-white">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCopy}><i className="fas fa-copy me-1" /> Copy</button>
              <button type="button" className="btn btn-primary btn-sm text-white" onClick={handleClose}>Close</button>
    </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default AdminDashboard;
