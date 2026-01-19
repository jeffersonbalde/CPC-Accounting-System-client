import React, { useState, useEffect } from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../contexts/AuthContext";
import Preloader from "../../components/Preloader";
import { useNavigate } from "react-router-dom";
import {
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaFileInvoice,
  FaUsers,
  FaTruck,
  FaChartLine,
  FaChartBar,
  FaPlus,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaEye,
} from "react-icons/fa";
import Portal from "../../components/Portal";

const API_BASE_URL =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const AdminDashboard = () => {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("current_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && user && token) {
      fetchDashboardData();
    }
  }, [authLoading, user, token, dateRange, customStartDate, customEndDate]);

  const getDateRangeParams = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split("T")[0];
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        ).toISOString().split("T")[0];
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = now.toISOString().split("T")[0];
    }

    return { start_date: startDate, end_date: endDate };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dateParams = getDateRangeParams();
      const params = new URLSearchParams(dateParams);

      const response = await fetch(
        `${API_BASE_URL}/accounting/dashboard?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Fallback: fetch data manually if API doesn't exist yet
      fetchDashboardDataManually();
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardDataManually = async () => {
    try {
      // Fetch all data manually and aggregate
      const [
        incomeRes,
        expenseRes,
        journalRes,
        cashRes,
        clientsRes,
        suppliersRes,
        invoicesRes,
        billsRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/accounting/invoices?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/bills?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/journal-entries?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/cash-bank`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/clients?per_page=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/suppliers?per_page=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/invoices?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/accounting/bills?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dateParams = getDateRangeParams();
      const startDate = new Date(dateParams.start_date);
      const endDate = new Date(dateParams.end_date);

      const incomeData = incomeRes.ok ? await incomeRes.json() : { data: [] };
      const expenseData = expenseRes.ok ? await expenseRes.json() : { data: [] };
      const journalData = journalRes.ok ? await journalRes.json() : { data: [] };
      const cashData = cashRes.ok ? await cashRes.json() : { data: [] };
      const clientsData = clientsRes.ok ? await clientsRes.json() : { data: [] };
      const suppliersData = suppliersRes.ok
        ? await suppliersRes.json()
        : { data: [] };
      const invoicesData = invoicesRes.ok
        ? await invoicesRes.json()
        : { data: [] };
      const billsData = billsRes.ok ? await billsRes.json() : { data: [] };

      const invoices = invoicesData.data || invoicesData || [];
      const bills = billsData.data || billsData || [];
      const journals = journalData.data || journalData || [];
      const cashAccounts = cashData.data || cashData || [];
      const clients = clientsData.data || clientsData || [];
      const suppliers = suppliersData.data || suppliersData || [];

      // Filter by date range
      const filterByDate = (item) => {
        const itemDate = new Date(item.invoice_date || item.bill_date || item.entry_date || item.created_at);
        return itemDate >= startDate && itemDate <= endDate;
      };

      const filteredInvoices = invoices.filter(filterByDate);
      const filteredBills = bills.filter(filterByDate);
      const filteredJournals = journals.filter(filterByDate);

      // Calculate totals
      const totalIncome = filteredInvoices.reduce(
        (sum, inv) => sum + (parseFloat(inv.total_amount) || 0),
        0
      );
      const totalExpenses = filteredBills.reduce(
        (sum, bill) => sum + (parseFloat(bill.total_amount) || 0),
        0
      );
      const netIncome = totalIncome - totalExpenses;

      // Cash balance (from cash accounts)
      const totalCashBalance = cashAccounts.reduce(
        (sum, acc) => sum + (parseFloat(acc.current_balance || acc.balance) || 0),
        0
      );

      // Accounts Receivable (unpaid invoices)
      const totalAR = invoices
        .filter((inv) => inv.status !== "paid")
        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

      // Accounts Payable (unpaid bills)
      const totalAP = bills
        .filter((bill) => bill.status !== "paid")
        .reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);

      // Recent transactions
      const recentJournals = journals
        .sort(
          (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        )
        .slice(0, 5);
      const recentInvoices = invoices
        .sort(
          (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        )
        .slice(0, 5);
      const recentBills = bills
        .sort(
          (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        )
        .slice(0, 5);

      // Monthly data for charts
      const monthlyData = {};
      [...filteredInvoices, ...filteredBills].forEach((item) => {
        const date = new Date(
          item.invoice_date || item.bill_date || item.created_at
        );
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        if (item.invoice_date) {
          monthlyData[monthKey].income += parseFloat(item.total_amount) || 0;
        } else {
          monthlyData[monthKey].expenses += parseFloat(item.total_amount) || 0;
        }
      });

      // Top accounts
      const incomeByAccount = {};
      filteredInvoices.forEach((inv) => {
        const accId = inv.income_account_id || "other";
        if (!incomeByAccount[accId]) {
          incomeByAccount[accId] = {
            account_name: inv.income_account?.account_name || "Other",
            total: 0,
          };
        }
        incomeByAccount[accId].total += parseFloat(inv.total_amount) || 0;
      });

      const expenseByAccount = {};
      filteredBills.forEach((bill) => {
        const accId = bill.expense_account_id || "other";
        if (!expenseByAccount[accId]) {
          expenseByAccount[accId] = {
            account_name: bill.expense_account?.account_name || "Other",
            total: 0,
          };
        }
        expenseByAccount[accId].total += parseFloat(bill.total_amount) || 0;
      });

      // Top clients
      const clientRevenue = {};
      filteredInvoices.forEach((inv) => {
        const clientId = inv.client_id || "other";
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = {
            client_name: inv.client?.name || "Other",
            total: 0,
          };
        }
        clientRevenue[clientId].total += parseFloat(inv.total_amount) || 0;
      });

      // Top suppliers
      const supplierExpenses = {};
      filteredBills.forEach((bill) => {
        const supplierId = bill.supplier_id || "other";
        if (!supplierExpenses[supplierId]) {
          supplierExpenses[supplierId] = {
            supplier_name: bill.supplier?.name || "Other",
            total: 0,
          };
        }
        supplierExpenses[supplierId].total += parseFloat(bill.total_amount) || 0;
      });

      // Alerts
      const overdueInvoices = invoices.filter((inv) => {
        if (inv.status === "paid") return false;
        const dueDate = new Date(inv.due_date || inv.invoice_date);
        return dueDate < new Date();
      });

      const overdueBills = bills.filter((bill) => {
        if (bill.status === "paid") return false;
        const dueDate = new Date(bill.due_date || bill.bill_date);
        return dueDate < new Date();
      });

      const lowCashAccounts = cashAccounts.filter(
        (acc) => parseFloat(acc.balance) < 10000
      );

      const unbalancedEntries = journals.filter((entry) => {
        const debit = parseFloat(entry.total_debit) || 0;
        const credit = parseFloat(entry.total_credit) || 0;
        return Math.abs(debit - credit) > 0.01;
      });

      setDashboardData({
        overview: {
          totalIncome,
          totalExpenses,
          netIncome,
          cashBalance: totalCashBalance,
          accountsReceivable: totalAR,
          accountsPayable: totalAP,
          totalJournalEntries: journals.length,
        },
        recentTransactions: {
          journals: recentJournals,
          invoices: recentInvoices,
          bills: recentBills,
        },
        monthlyData: Object.entries(monthlyData)
          .sort()
          .map(([month, data]) => ({
            month,
            income: data.income,
            expenses: data.expenses,
          })),
        topAccounts: {
          income: Object.values(incomeByAccount)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
          expenses: Object.values(expenseByAccount)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
        },
        topClients: Object.values(clientRevenue)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),
        topSuppliers: Object.values(supplierExpenses)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),
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

  if (authLoading || loading || !user) {
    return <Preloader />;
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="container-fluid px-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { overview, recentTransactions, monthlyData, topAccounts, topClients, topSuppliers, alerts } = dashboardData;

  return (
    <Layout>
      <div className="container-fluid px-4 py-3">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 style={{ color: "#171D5B", marginBottom: "10px" }}>
              Admin Dashboard
            </h1>
            <p className="text-muted mb-0">
              Welcome, {user?.name || "Admin"}! Here's your financial overview.
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <select
              className="form-select form-select-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: "auto" }}
            >
              <option value="current_month">Current Month</option>
              <option value="last_month">Last Month</option>
              <option value="current_year">Current Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateRange === "custom" && (
              <>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ width: "auto" }}
                />
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ width: "auto" }}
                />
              </>
            )}
          </div>
        </div>

        {/* Phase 5: Alerts */}
        {(alerts.overdueInvoices > 0 ||
          alerts.overdueBills > 0 ||
          alerts.lowCashAccounts > 0 ||
          alerts.unbalancedEntries > 0) && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">
                    <FaExclamationTriangle className="me-2" />
                    Alerts & Notifications
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {alerts.overdueInvoices > 0 && (
                      <div className="col-md-3">
                        <div className="alert alert-danger mb-0">
                          <FaClock className="me-2" />
                          <strong>{alerts.overdueInvoices}</strong> Overdue
                          Invoices
                        </div>
                      </div>
                    )}
                    {alerts.overdueBills > 0 && (
                      <div className="col-md-3">
                        <div className="alert alert-danger mb-0">
                          <FaClock className="me-2" />
                          <strong>{alerts.overdueBills}</strong> Overdue Bills
                        </div>
                      </div>
                    )}
                    {alerts.lowCashAccounts > 0 && (
                      <div className="col-md-3">
                        <div className="alert alert-warning mb-0">
                          <FaExclamationTriangle className="me-2" />
                          <strong>{alerts.lowCashAccounts}</strong> Low Cash
                          Accounts
                        </div>
                      </div>
                    )}
                    {alerts.unbalancedEntries > 0 && (
                      <div className="col-md-3">
                        <div className="alert alert-warning mb-0">
                          <FaExclamationTriangle className="me-2" />
                          <strong>{alerts.unbalancedEntries}</strong> Unbalanced
                          Entries
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1: Financial Overview Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Total Income</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.totalIncome)}</h4>
                  </div>
                  <FaArrowUp className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Total Expenses</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.totalExpenses)}</h4>
                  </div>
                  <FaArrowDown className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: overview.netIncome >= 0 ? "linear-gradient(135deg, #007bff 0%, #0056b3 100%)" : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Net Income</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.netIncome)}</h4>
                  </div>
                  <FaChartLine className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Cash Balance</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.cashBalance)}</h4>
                  </div>
                  <FaWallet className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Accounts Receivable</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.accountsReceivable)}</h4>
                  </div>
                  <FaUsers className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: "linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)" }}>
              <div className="card-body text-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-white-50 mb-2">Accounts Payable</h6>
                    <h4 className="mb-0 fw-bold">{formatCurrency(overview.accountsPayable)}</h4>
                  </div>
                  <FaTruck className="fs-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          {/* Phase 4: Quick Actions */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0">
                  <FaPlus className="me-2" />
                  Quick Actions
                </h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigate("/admin/journal-entries")}
                  >
                    <FaFileInvoice className="me-2" />
                    New Journal Entry
                  </button>
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={() => navigate("/admin/income")}
                  >
                    <FaArrowUp className="me-2" />
                    Add Income
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => navigate("/admin/expenses")}
                  >
                    <FaArrowDown className="me-2" />
                    Add Expense
                  </button>
                  <button
                    className="btn btn-outline-info btn-sm"
                    onClick={() => navigate("/admin/cash-bank")}
                  >
                    <FaWallet className="me-2" />
                    Cash & Bank
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2: Recent Transactions */}
          <div className="col-12 col-md-6 col-lg-9">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaClock className="me-2" />
                  Recent Transactions
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.journals.slice(0, 3).map((entry) => (
                        <tr key={`journal-${entry.id}`}>
                          <td>
                            <span className="badge bg-info">Journal</span>
                          </td>
                          <td>{entry.entry_number}</td>
                          <td>{formatDate(entry.entry_date)}</td>
                          <td>{formatCurrency(entry.total_debit)}</td>
                          <td>
                            <span className="badge bg-success">Balanced</span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                navigate("/admin/journal-entries")
                              }
                            >
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {recentTransactions.invoices.slice(0, 2).map((invoice) => (
                        <tr key={`invoice-${invoice.id}`}>
                          <td>
                            <span className="badge bg-success">Invoice</span>
                          </td>
                          <td>{invoice.invoice_number}</td>
                          <td>{formatDate(invoice.invoice_date)}</td>
                          <td>{formatCurrency(invoice.total_amount)}</td>
                          <td>
                            <span
                              className={`badge ${
                                invoice.status === "paid"
                                  ? "bg-success"
                                  : "bg-warning"
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate("/admin/clients-ar")}
                            >
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          {/* Phase 3: Charts */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaChartBar className="me-2" />
                  Income vs Expenses Trend
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px", position: "relative" }}>
                  <SimpleBarChart data={monthlyData} />
                </div>
              </div>
            </div>
          </div>

          {/* Phase 6: Summary Tables */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaChartLine className="me-2" />
                  Top Income Accounts
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Account</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAccounts.income.map((acc, idx) => (
                        <tr key={idx}>
                          <td>{acc.account_name}</td>
                          <td className="text-end">
                            {formatCurrency(acc.total)}
                          </td>
                        </tr>
                      ))}
                      {topAccounts.income.length === 0 && (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* Top Clients */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaUsers className="me-2" />
                  Top Clients
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Client</th>
                        <th className="text-end">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((client, idx) => (
                        <tr key={idx}>
                          <td>{client.client_name}</td>
                          <td className="text-end">
                            {formatCurrency(client.total)}
                          </td>
                        </tr>
                      ))}
                      {topClients.length === 0 && (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaTruck className="me-2" />
                  Top Suppliers
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Supplier</th>
                        <th className="text-end">Expenses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSuppliers.map((supplier, idx) => (
                        <tr key={idx}>
                          <td>{supplier.supplier_name}</td>
                          <td className="text-end">
                            {formatCurrency(supplier.total)}
                          </td>
                        </tr>
                      ))}
                      {topSuppliers.length === 0 && (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Top Expense Accounts */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <FaChartLine className="me-2" />
                  Top Expense Accounts
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Account</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAccounts.expenses.map((acc, idx) => (
                        <tr key={idx}>
                          <td>{acc.account_name}</td>
                          <td className="text-end">
                            {formatCurrency(acc.total)}
                          </td>
                        </tr>
                      ))}
                      {topAccounts.expenses.length === 0 && (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Simple Bar Chart Component
const SimpleBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <p className="text-muted">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expenses))
  );

  return (
    <div className="d-flex align-items-end justify-content-around h-100" style={{ padding: "20px 0" }}>
      {data.map((item, idx) => {
        const incomeHeight = (item.income / maxValue) * 100;
        const expenseHeight = (item.expenses / maxValue) * 100;
        const monthLabel = new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short" });

        return (
          <div key={idx} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
            <div className="d-flex align-items-end gap-1 mb-2" style={{ height: "200px", width: "100%" }}>
              <div
                className="bg-success rounded-top"
                style={{
                  width: "45%",
                  height: `${incomeHeight}%`,
                  minHeight: incomeHeight > 0 ? "4px" : "0",
                }}
                title={`Income: ${item.income.toLocaleString()}`}
              />
              <div
                className="bg-danger rounded-top"
                style={{
                  width: "45%",
                  height: `${expenseHeight}%`,
                  minHeight: expenseHeight > 0 ? "4px" : "0",
                }}
                title={`Expenses: ${item.expenses.toLocaleString()}`}
              />
            </div>
            <small className="text-muted" style={{ fontSize: "0.7rem" }}>
              {monthLabel}
            </small>
          </div>
        );
      })}
    </div>
  );
};

export default AdminDashboard;
