import React, { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showToast } from "../../../services/notificationService";
import { FaBalanceScale, FaList, FaChartBar, FaFilter } from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const Reports = () => {
  const { token } = useAuth();
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
    await Promise.all([fetchTrialBalance(), fetchIncomeStatement(), fetchBalanceSheet()]);
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const res = await fetch(`${API_BASE_URL}/accounting/reports/trial-balance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load trial balance");
      const data = await res.json();
      setTrialData(data.accounts || []);
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
      const res = await fetch(`${API_BASE_URL}/accounting/reports/income-statement?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load income statement");
      const data = await res.json();
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
      const res = await fetch(`${API_BASE_URL}/accounting/reports/balance-sheet?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load balance sheet");
      const data = await res.json();
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

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800">
            <FaChartBar className="me-2" />
            Financial Reports
          </h1>
          <p className="text-muted mb-0">Trial Balance, Income Statement, Balance Sheet</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">
                <FaFilter className="me-1" />
                Start Date
              </label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-secondary" onClick={() => { setStartDate(""); setEndDate(""); }}>
                Clear Dates
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "trial" ? "active" : ""}`} onClick={() => setActiveTab("trial")}>
            Trial Balance
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "income" ? "active" : ""}`} onClick={() => setActiveTab("income")}>
            Income Statement
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "balance" ? "active" : ""}`} onClick={() => setActiveTab("balance")}>
            Balance Sheet
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "trial" && <TrialBalanceTable data={trialData} formatCurrency={formatCurrency} />}
          {activeTab === "income" && incomeData && <IncomeStatement data={incomeData} formatCurrency={formatCurrency} />}
          {activeTab === "balance" && balanceData && <BalanceSheet data={balanceData} formatCurrency={formatCurrency} />}
        </>
      )}
    </div>
  );
};

const TrialBalanceTable = ({ data, formatCurrency }) => {
  const totalDebit = data.reduce((sum, a) => sum + (parseFloat(a.debit_balance) || 0), 0);
  const totalCredit = data.reduce((sum, a) => sum + (parseFloat(a.credit_balance) || 0), 0);

  return (
    <div className="card shadow">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <FaList className="me-2" />
          Trial Balance
        </h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">
                    No data
                  </td>
                </tr>
              ) : (
                data.map((a) => (
                  <tr key={a.account_code}>
                    <td>
                      <strong>{a.account_code}</strong>
                    </td>
                    <td>{a.account_name}</td>
                    <td className="text-end">{formatCurrency(a.debit_balance)}</td>
                    <td className="text-end">{formatCurrency(a.credit_balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="table-light">
                <tr>
                  <td colSpan="2">
                    <strong>Total</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalDebit)}</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(totalCredit)}</strong>
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

const IncomeStatement = ({ data, formatCurrency }) => {
  const sectionOrder = ["REVENUE", "COST_OF_SERVICES", "OPERATING_EXPENSES", "OTHER_INCOME_EXPENSES"];
  const sectionLabels = {
    REVENUE: "Revenue",
    COST_OF_SERVICES: "Cost of Services",
    OPERATING_EXPENSES: "Operating Expenses",
    OTHER_INCOME_EXPENSES: "Other Income & Expenses",
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-success text-white">
        <h5 className="mb-0">Income Statement</h5>
      </div>
      <div className="card-body">
        {sectionOrder.map((key) => {
          const lines = (data.lines || []).filter((l) => l.account_type === key && l.amount !== 0);
          const total = data.sections?.[key]?.total || 0;
          return (
            <div key={key} className="mb-3">
              <h6 className="fw-bold">{sectionLabels[key]}</h6>
              <div className="table-responsive">
                <table className="table table-sm mb-2">
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td className="text-muted">No entries</td>
                        <td className="text-end text-muted">-</td>
                      </tr>
                    ) : (
                      lines.map((line) => (
                        <tr key={line.account_code}>
                          <td>
                            {line.account_code} - {line.account_name}
                          </td>
                          <td className="text-end">{formatCurrency(line.amount)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="table-light">
                      <td>
                        <strong>Total {sectionLabels[key]}</strong>
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(total)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="border-top pt-2">
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Gross Profit</span>
            <span className="fw-bold">{formatCurrency(data.totals?.gross_profit)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Operating Income</span>
            <span className="fw-bold">{formatCurrency(data.totals?.operating_income)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Net Income</span>
            <span className="fw-bold text-success">{formatCurrency(data.totals?.net_income)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BalanceSheet = ({ data, formatCurrency }) => {
  const sections = ["ASSETS", "LIABILITIES", "EQUITY"];
  const labels = {
    ASSETS: "Assets",
    LIABILITIES: "Liabilities",
    EQUITY: "Equity",
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <FaBalanceScale className="me-2" />
          Balance Sheet
        </h5>
      </div>
      <div className="card-body">
        {sections.map((section) => {
          const lines = (data.lines || []).filter((l) => l.account_type === section && l.balance !== 0);
          const total = data.sections?.[section]?.total || 0;
          return (
            <div key={section} className="mb-3">
              <h6 className="fw-bold">{labels[section]}</h6>
              <div className="table-responsive">
                <table className="table table-sm mb-2">
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td className="text-muted">No entries</td>
                        <td className="text-end text-muted">-</td>
                      </tr>
                    ) : (
                      lines.map((line) => (
                        <tr key={line.account_code}>
                          <td>
                            {line.account_code} - {line.account_name}
                          </td>
                          <td className="text-end">{formatCurrency(line.balance)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="table-light">
                      <td>
                        <strong>Total {labels[section]}</strong>
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(total)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="border-top pt-2">
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Total Assets</span>
            <span className="fw-bold">{formatCurrency(data.totals?.assets)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Total Liabilities + Equity</span>
            <span className="fw-bold">{formatCurrency(data.totals?.liabilities_equity)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">Net Income (included in Equity)</span>
            <span className="fw-bold text-success">{formatCurrency(data.totals?.net_income)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;


