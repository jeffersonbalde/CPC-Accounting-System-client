import React, { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showToast } from "../../../services/notificationService";
import {
  FaBalanceScale,
  FaList,
  FaChartBar,
  FaFilter,
  FaSyncAlt,
  FaCalendarAlt,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const Reports = () => {
  const { request, currentAccount } = useAuth();
  const [activeTab, setActiveTab] = useState("trial");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [trialData, setTrialData] = useState([]);
  const [incomeData, setIncomeData] = useState(null);
  const [balanceData, setBalanceData] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [startDate, endDate]);

  const fetchAll = async () => {
    await Promise.all([
      fetchTrialBalance(),
      fetchIncomeStatement(),
      fetchBalanceSheet(),
    ]);
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const data = await request(
        `/accounting/reports/trial-balance?${params.toString()}`
      );
      setTrialData(data?.accounts || []);
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to load trial balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const data = await request(
        `/accounting/reports/income-statement?${params.toString()}`
      );
      setIncomeData(data);
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to load income statement");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const data = await request(
        `/accounting/reports/balance-sheet?${params.toString()}`
      );
      setBalanceData(data);
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  const reportSlug = {
    trial: "trial-balance",
    income: "income-statement",
    balance: "balance-sheet",
  };

  const exportPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const slug = reportSlug[activeTab];
      const data = await request(
        `/accounting/reports/${slug}/export/pdf?${params.toString()}`
      );
      if (data?.html) {
        const w = window.open("", "_blank");
        w.document.write(data.html);
        w.document.close();
        w.print();
        showToast.success("Print / PDF", "Print dialog opened. Save as PDF from the print dialog.");
      }
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to generate PDF");
    }
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const slug = reportSlug[activeTab];
      const token = localStorage.getItem("auth_token");
      const url = `${API_BASE_URL}/accounting/reports/${slug}/export/excel?${params.toString()}`;
      const headers = { Authorization: `Bearer ${token}` };
      if (currentAccount?.id) headers["X-Account-Id"] = String(currentAccount.id);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `${slug}_${new Date().toISOString().slice(0, 10)}.csv`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1].trim();
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast.success("Export", "Report exported to Excel (CSV).");
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to export Excel");
    }
  };

  const reportHeaderStyle = {
    padding: "0.875rem 1.25rem",
    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
    borderBottom: "1px solid #334155",
  };

  return (
    <div
      className="container-fluid px-3 pt-0 pb-2"
      style={{ maxWidth: "1400px", margin: "0 auto" }}
    >
      {/* Page header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary, #0f172a)" }}
          >
            <FaChartBar className="me-2" />
            Financial Reports
          </h1>
          <p
            className="mb-0 small"
            style={{ color: "var(--text-muted, #64748b)" }}
          >
            Trial Balance, Income Statement, Balance Sheet
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm"
            onClick={exportPdf}
            disabled={loading}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#1e40af",
              backgroundColor: "#fff",
              border: "1px solid #93c5fd",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
            title="Open print dialog to save as PDF"
          >
            <FaFilePdf style={{ fontSize: "0.875rem" }} /> Download PDF
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={exportExcel}
            disabled={loading}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#166534",
              backgroundColor: "#fff",
              border: "1px solid #86efac",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
            title="Export current report to CSV (opens in Excel)"
          >
            <FaFileExcel style={{ fontSize: "0.875rem" }} /> Download Excel
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#334155",
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <FaSyncAlt style={{ fontSize: "0.875rem" }} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters — corporate card with gradient header */}
      <div
        className="mb-4"
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={reportHeaderStyle}>
          <h6 className="mb-0 text-white d-flex align-items-center gap-2">
            <FaFilter style={{ fontSize: "0.9rem", opacity: 0.9 }} />
            Report period
          </h6>
          <p className="mb-0 small text-white-50 mt-1">
            Set start and end date to filter journal entries
          </p>
        </div>
        <div className="p-3 p-md-4 bg-light" style={{ borderTop: "1px solid #e2e8f0" }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-600 text-secondary mb-1">
                <FaCalendarAlt className="me-1" style={{ fontSize: "0.8rem" }} />
                Start date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ borderColor: "#cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-600 text-secondary mb-1">
                End date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ borderColor: "#cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div className="col-md-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={clearDates}
                style={{
                  borderColor: "#cbd5e1",
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
              >
                Clear dates
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — corporate pill style */}
      <div
        className="d-flex flex-wrap gap-1 mb-4 p-2 rounded-3"
        style={{
          backgroundColor: "#f1f5f9",
          border: "1px solid #e2e8f0",
        }}
      >
        {[
          { id: "trial", label: "Trial Balance", icon: FaList },
          { id: "income", label: "Income Statement", icon: FaChartBar },
          { id: "balance", label: "Balance Sheet", icon: FaBalanceScale },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className="btn btn-sm"
            style={{
              padding: "0.5rem 1rem",
              fontWeight: 600,
              borderRadius: "6px",
              backgroundColor: activeTab === id ? "#1e293b" : "transparent",
              color: activeTab === id ? "#fff" : "#475569",
              border: "none",
            }}
          >
            <Icon className="me-1" style={{ fontSize: "0.85rem" }} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading financial reports..." />
      ) : (
        <>
          {activeTab === "trial" && (
            <TrialBalanceTable
              data={trialData}
              formatCurrency={formatCurrency}
              reportHeaderStyle={reportHeaderStyle}
            />
          )}
          {activeTab === "income" && incomeData && (
            <IncomeStatement
              data={incomeData}
              formatCurrency={formatCurrency}
              reportHeaderStyle={reportHeaderStyle}
            />
          )}
          {activeTab === "balance" && balanceData && (
            <BalanceSheet
              data={balanceData}
              formatCurrency={formatCurrency}
              reportHeaderStyle={reportHeaderStyle}
            />
          )}
        </>
      )}
    </div>
  );
};

const TrialBalanceTable = ({ data, formatCurrency, reportHeaderStyle }) => {
  const totalDebit = data.reduce(
    (sum, a) => sum + (parseFloat(a.debit_balance) || 0),
    0
  );
  const totalCredit = data.reduce(
    (sum, a) => sum + (parseFloat(a.credit_balance) || 0),
    0
  );

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div style={reportHeaderStyle}>
        <h6 className="mb-0 text-white d-flex align-items-center gap-2">
          <FaList style={{ fontSize: "0.9rem", opacity: 0.9 }} />
          Trial Balance
        </h6>
        <p className="mb-0 small text-white-50 mt-1">
          Account codes, names, and debit/credit totals
        </p>
      </div>
      <div className="p-0">
        <div className="table-responsive">
          <table
            className="table table-hover mb-0"
            style={{ fontSize: "0.9rem" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#475569" }}>
                  Account code
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#475569" }}>
                  Account name
                </th>
                <th
                  className="text-end"
                  style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#475569" }}
                >
                  Debit
                </th>
                <th
                  className="text-end"
                  style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#475569" }}
                >
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center text-muted py-5"
                    style={{ fontSize: "0.9rem" }}
                  >
                    No data for the selected period
                  </td>
                </tr>
              ) : (
                data.map((a) => (
                  <tr
                    key={a.account_code}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <strong style={{ color: "#334155" }}>{a.account_code}</strong>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {a.account_name}
                    </td>
                    <td
                      className="text-end"
                      style={{
                        padding: "0.75rem 1rem",
                        fontVariantNumeric: "tabular-nums",
                        color: "#334155",
                      }}
                    >
                      {formatCurrency(a.debit_balance)}
                    </td>
                    <td
                      className="text-end"
                      style={{
                        padding: "0.75rem 1rem",
                        fontVariantNumeric: "tabular-nums",
                        color: "#334155",
                      }}
                    >
                      {formatCurrency(a.credit_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                  <td
                    colSpan="2"
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Total
                  </td>
                  <td
                    className="text-end"
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "#0f172a",
                    }}
                  >
                    {formatCurrency(totalDebit)}
                  </td>
                  <td
                    className="text-end"
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "#0f172a",
                    }}
                  >
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const IncomeStatement = ({ data, formatCurrency, reportHeaderStyle }) => {
  // Dynamic by category: backend returns revenue, expense
  const sectionOrder = ["revenue", "expense"];
  const sectionLabels = {
    revenue: "Revenue",
    expense: "Expenses",
  };
  // Use section order from API if present, else default
  const sections = data.sections
    ? sectionOrder.filter((key) => data.sections[key] != null)
    : sectionOrder;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div style={reportHeaderStyle}>
        <h6 className="mb-0 text-white d-flex align-items-center gap-2">
          <FaChartBar style={{ fontSize: "0.9rem", opacity: 0.9 }} />
          Income Statement
        </h6>
        <p className="mb-0 small text-white-50 mt-1">
          Revenue, costs, operating expenses, and net income
        </p>
      </div>
      <div className="p-3 p-md-4 bg-light">
        {sections.map((key) => {
          const lines = (data.lines || []).filter(
            (l) => l.account_type === key && l.amount !== 0
          );
          const total = data.sections?.[key]?.total ?? 0;
          const label = sectionLabels[key] ?? key;
          return (
            <div
              key={key}
              className="bg-white border rounded-3 p-3 mb-3"
              style={{ borderColor: "#e2e8f0" }}
            >
              <h6
                className="mb-2 fw-bold"
                style={{
                  color: "#334155",
                  fontSize: "0.95rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {label}
              </h6>
              <div className="table-responsive">
                <table className="table table-sm mb-0" style={{ fontSize: "0.875rem" }}>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td className="text-muted py-2">No entries</td>
                        <td className="text-end text-muted">—</td>
                      </tr>
                    ) : (
                      lines.map((line) => (
                        <tr key={line.account_code}>
                          <td style={{ color: "#475569" }}>
                            {line.account_code} — {line.account_name}
                          </td>
                          <td
                            className="text-end"
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              color: "#334155",
                            }}
                          >
                            {formatCurrency(line.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <td className="fw-bold pt-2" style={{ color: "#0f172a" }}>
                        Total {label}
                      </td>
                      <td className="text-end fw-bold pt-2" style={{ fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div
          className="bg-white border rounded-3 p-3 mt-2"
          style={{ borderColor: "#e2e8f0" }}
        >
          <div className="d-flex justify-content-between py-1">
            <span className="fw-bold" style={{ color: "#334155" }}>
              Gross profit
            </span>
            <span className="fw-bold" style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>
              {formatCurrency(data.totals?.gross_profit)}
            </span>
          </div>
          <div className="d-flex justify-content-between py-1">
            <span className="fw-bold" style={{ color: "#334155" }}>
              Operating income
            </span>
            <span className="fw-bold" style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>
              {formatCurrency(data.totals?.operating_income)}
            </span>
          </div>
          <div className="d-flex justify-content-between py-2 border-top mt-2 pt-2" style={{ borderColor: "#e2e8f0" }}>
            <span className="fw-bold" style={{ color: "#0f172a" }}>
              Net income
            </span>
            <span className="fw-bold text-success" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(data.totals?.net_income)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BalanceSheet = ({ data, formatCurrency, reportHeaderStyle }) => {
  // Dynamic by category: backend returns asset, liability, equity
  const sectionOrder = ["asset", "liability", "equity"];
  const labels = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
  };
  const sections = data.sections
    ? sectionOrder.filter((key) => data.sections[key] != null)
    : sectionOrder;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div style={reportHeaderStyle}>
        <h6 className="mb-0 text-white d-flex align-items-center gap-2">
          <FaBalanceScale style={{ fontSize: "0.9rem", opacity: 0.9 }} />
          Balance Sheet
        </h6>
        <p className="mb-0 small text-white-50 mt-1">
          Assets, liabilities, and equity as of the report period
        </p>
      </div>
      <div className="p-3 p-md-4 bg-light">
        {sections.map((section) => {
          const lines = (data.lines || []).filter(
            (l) => l.account_type === section && l.balance !== 0
          );
          const total = data.sections?.[section]?.total ?? 0;
          const label = labels[section] ?? section;
          return (
            <div
              key={section}
              className="bg-white border rounded-3 p-3 mb-3"
              style={{ borderColor: "#e2e8f0" }}
            >
              <h6
                className="mb-2 fw-bold"
                style={{
                  color: "#334155",
                  fontSize: "0.95rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {label}
              </h6>
              <div className="table-responsive">
                <table className="table table-sm mb-0" style={{ fontSize: "0.875rem" }}>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td className="text-muted py-2">No entries</td>
                        <td className="text-end text-muted">—</td>
                      </tr>
                    ) : (
                      lines.map((line) => (
                        <tr key={line.account_code}>
                          <td style={{ color: "#475569" }}>
                            {line.account_code} — {line.account_name}
                          </td>
                          <td
                            className="text-end"
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              color: "#334155",
                            }}
                          >
                            {formatCurrency(line.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <td className="fw-bold pt-2" style={{ color: "#0f172a" }}>
                        Total {label}
                      </td>
                      <td className="text-end fw-bold pt-2" style={{ fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div
          className="bg-white border rounded-3 p-3 mt-2"
          style={{ borderColor: "#e2e8f0" }}
        >
          <div className="d-flex justify-content-between py-1">
            <span className="fw-bold" style={{ color: "#334155" }}>
              Total assets
            </span>
            <span className="fw-bold" style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>
              {formatCurrency(data.totals?.assets)}
            </span>
          </div>
          <div className="d-flex justify-content-between py-1">
            <span className="fw-bold" style={{ color: "#334155" }}>
              Total liabilities + equity
            </span>
            <span className="fw-bold" style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>
              {formatCurrency(data.totals?.liabilities_equity)}
            </span>
          </div>
          <div className="d-flex justify-content-between py-2 border-top mt-2 pt-2" style={{ borderColor: "#e2e8f0" }}>
            <span className="fw-bold" style={{ color: "#334155" }}>
              Net income (included in equity)
            </span>
            <span className="fw-bold text-success" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(data.totals?.net_income)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
