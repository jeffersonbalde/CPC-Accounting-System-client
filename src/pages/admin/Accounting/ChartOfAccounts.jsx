import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaBook, FaSearch, FaFilter } from "react-icons/fa";

const ChartOfAccounts = () => {
  const { request } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const accountTypeLabels = {
    ASSETS: "Assets",
    LIABILITIES: "Liabilities",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    COST_OF_SERVICES: "Cost of Services",
    OPERATING_EXPENSES: "Operating Expenses",
  };

  const accountTypeColors = {
    ASSETS: "success",
    LIABILITIES: "warning",
    EQUITY: "info",
    REVENUE: "primary",
    COST_OF_SERVICES: "danger",
    OPERATING_EXPENSES: "danger",
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, filterType]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await request("/accounting/chart-of-accounts");
      setAccounts(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error("Error fetching accounts:", error);
      showToast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = [...accounts];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((account) => account.account_type === filterType);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.account_code.toLowerCase().includes(search) ||
          account.account_name.toLowerCase().includes(search)
      );
    }

    setFilteredAccounts(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getBalanceColor = (balance, normalBalance) => {
    if (balance === 0) return "text-muted";
    if (normalBalance === "DR") {
      return balance >= 0 ? "text-success" : "text-danger";
    } else {
      return balance >= 0 ? "text-success" : "text-danger";
    }
  };

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="container-fluid px-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800">
            <FaBook className="me-2" />
            Chart of Accounts
          </h1>
          <p className="text-muted mb-0">Master list of all accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">
                <FaSearch className="me-1" />
                Search
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by account code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                <FaFilter className="me-1" />
                Account Type
              </label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {Object.keys(groupedAccounts).length === 0 ? (
        <div className="card shadow">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">No accounts found</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
          <div key={type} className="card shadow mb-4">
            <div className={`card-header bg-${accountTypeColors[type]} text-white`}>
              <h5 className="mb-0">
                {accountTypeLabels[type]} ({typeAccounts.length} accounts)
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Account Code</th>
                      <th>Account Name</th>
                      <th>Normal Balance</th>
                      <th className="text-end">Current Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeAccounts.map((account) => {
                      const balance = account.balance || 0;
                      return (
                        <tr key={account.id}>
                          <td>
                            <strong>{account.account_code}</strong>
                          </td>
                          <td>{account.account_name}</td>
                          <td>
                            <span className={`badge bg-${account.normal_balance === "DR" ? "danger" : "success"}`}>
                              {account.normal_balance}
                            </span>
                          </td>
                          <td className={`text-end ${getBalanceColor(balance, account.normal_balance)}`}>
                            <strong>{formatCurrency(balance)}</strong>
                          </td>
                          <td>
                            <span className={`badge bg-${account.is_active ? "success" : "secondary"}`}>
                              {account.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Summary */}
      <div className="card shadow mt-4">
        <div className="card-body">
          <div className="row text-center">
            <div className="col-md-3">
              <h6 className="text-muted mb-1">Total Accounts</h6>
              <h4 className="mb-0">{accounts.length}</h4>
            </div>
            <div className="col-md-3">
              <h6 className="text-muted mb-1">Active Accounts</h6>
              <h4 className="mb-0 text-success">
                {accounts.filter((a) => a.is_active).length}
              </h4>
            </div>
            <div className="col-md-3">
              <h6 className="text-muted mb-1">Filtered Results</h6>
              <h4 className="mb-0">{filteredAccounts.length}</h4>
            </div>
            <div className="col-md-3">
              <h6 className="text-muted mb-1">Total Balance</h6>
              <h4 className="mb-0">
                {formatCurrency(
                  accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
                )}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartOfAccounts;


