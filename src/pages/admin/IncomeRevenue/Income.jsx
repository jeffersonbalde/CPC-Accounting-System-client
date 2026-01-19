import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showToast } from "../../../services/notificationService";
import { FaArrowUp, FaPlus, FaEye, FaFilter, FaSearch } from "react-icons/fa";
import Portal from "../../../components/Portal";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const Income = () => {
  const { token } = useAuth();
  const [incomeTransactions, setIncomeTransactions] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    income_date: new Date().toISOString().split("T")[0],
    income_account_id: "",
    client_id: "",
    cash_account_id: "",
    amount: "",
    description: "",
    reference_number: "",
  });

  useEffect(() => {
    // Fetch accounts first, then transactions (transactions need account codes)
    const loadData = async () => {
      await fetchIncomeAccounts();
      await fetchCashAccounts();
      await fetchClients();
      await fetchIncomeTransactions();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (incomeAccounts.length > 0) {
      fetchIncomeTransactions();
    }
  }, [filterAccount, startDate, endDate]);

  const fetchIncomeTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = [];

      // Get all invoices (they represent income)
      const invoicesResponse = await fetch(`${API_BASE_URL}/accounting/invoices?per_page=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        const invoices = invoicesData.data || invoicesData;

        // Transform invoices to income transactions
        const invoiceTransactions = invoices.map((invoice) => ({
          id: `invoice-${invoice.id}`,
          type: "invoice",
          date: invoice.invoice_date,
          account_code: invoice.income_account?.account_code || "",
          account_name: invoice.income_account?.account_name || "",
          client_name: invoice.client?.name || "",
          amount: parseFloat(invoice.total_amount) || 0,
          description: invoice.description || `Invoice ${invoice.invoice_number}`,
          reference: invoice.invoice_number,
          status: invoice.status,
          journal_entry_id: invoice.journal_entry_id,
        }));

        allTransactions.push(...invoiceTransactions);
      }

      // Get all journal entries to find manual income entries
      // Fetch multiple pages to get all entries
      let allJournalEntries = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= 10) { // Limit to 10 pages to prevent infinite loop
        const journalEntriesResponse = await fetch(
          `${API_BASE_URL}/accounting/journal-entries?per_page=50&page=${currentPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (journalEntriesResponse.ok) {
          const journalData = await journalEntriesResponse.json();
          const entries = journalData.data || journalData;

          if (entries.length === 0) {
            hasMorePages = false;
          } else {
            allJournalEntries.push(...entries);
            // Check if there are more pages
            if (journalData.last_page && currentPage >= journalData.last_page) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }
        } else {
          hasMorePages = false;
        }
      }

      // Filter journal entries that have income accounts in credit lines
      allJournalEntries.forEach((entry) => {
        if (entry.lines && Array.isArray(entry.lines)) {
          // Find lines with income accounts (credit side)
          entry.lines.forEach((line) => {
            if (
              line.account &&
              line.account.account_type === "REVENUE" &&
              parseFloat(line.credit_amount) > 0
            ) {
              // Check if this entry is already included as an invoice
              const isInvoiceEntry = allTransactions.some(
                (t) => t.journal_entry_id === entry.id && t.type === "invoice"
              );

              // Check if reference_number indicates it's an invoice or bill
              const isInvoiceReference = entry.reference_number?.startsWith("INV-");
              const isBillReference = entry.reference_number?.startsWith("BILL-");

              if (!isInvoiceEntry && !isInvoiceReference && !isBillReference) {
                // This is a manual income entry
                const existingTransaction = allTransactions.find(
                  (t) => t.journal_entry_id === entry.id && t.account_code === line.account.account_code
                );

                if (!existingTransaction) {
                  allTransactions.push({
                    id: `journal-${entry.id}-${line.id}`,
                    type: "manual",
                    date: entry.entry_date,
                    account_code: line.account.account_code || "",
                    account_name: line.account.account_name || "",
                    client_name: "", // Manual entries may not have client
                    amount: parseFloat(line.credit_amount) || 0,
                    description: line.description || entry.description || "Manual income entry",
                    reference: entry.reference_number || entry.entry_number,
                    status: null,
                    journal_entry_id: entry.id,
                  });
                }
              }
            }
          });
        }
      });

      // Filter transactions
      let filtered = allTransactions;

        if (filterAccount !== "all") {
          filtered = filtered.filter((t) => t.account_code === filterAccount);
        }

        if (startDate) {
          filtered = filtered.filter((t) => t.date >= startDate);
        }

        if (endDate) {
          filtered = filtered.filter((t) => t.date <= endDate);
        }

        if (searchTerm.trim()) {
          const search = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.client_name.toLowerCase().includes(search) ||
              t.description.toLowerCase().includes(search) ||
              t.reference.toLowerCase().includes(search)
          );
        }

      setIncomeTransactions(filtered);
    } catch (error) {
      console.error("Error fetching income transactions:", error);
      showToast.error("Failed to load income transactions");
    } finally {
      setLoading(false);
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

  const fetchClients = async () => {
    try {
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
    }
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    try {
      // Create journal entry for manual income
      const response = await fetch(`${API_BASE_URL}/accounting/journal-entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entry_date: formData.income_date,
          description: formData.description || `Income: ${formData.income_account_id}`,
          reference_number: formData.reference_number || null,
          lines: [
            {
              account_id: parseInt(formData.cash_account_id),
              debit_amount: parseFloat(formData.amount),
              credit_amount: 0,
              description: formData.description || "Income received",
            },
            {
              account_id: parseInt(formData.income_account_id),
              debit_amount: 0,
              credit_amount: parseFloat(formData.amount),
              description: formData.description || "Income received",
            },
          ],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to record income");
      }

      showToast.success("Income recorded successfully");
      resetForm();
      fetchIncomeTransactions();
    } catch (error) {
      showToast.error(error.message || "Failed to record income");
    }
  };

  const resetForm = () => {
    setFormData({
      income_date: new Date().toISOString().split("T")[0],
      income_account_id: "",
      client_id: "",
      cash_account_id: "",
      amount: "",
      description: "",
      reference_number: "",
    });
    setShowForm(false);
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

  const formatDate = (dateString) => {
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

  // Calculate totals
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  // Group by account
  const incomeByAccount = incomeTransactions.reduce((acc, transaction) => {
    const key = transaction.account_code || "Other";
    if (!acc[key]) {
      acc[key] = {
        account_code: transaction.account_code,
        account_name: transaction.account_name,
        total: 0,
        count: 0,
      };
    }
    acc[key].total += parseFloat(transaction.amount) || 0;
    acc[key].count += 1;
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
            <FaArrowUp className="me-2" />
            Income / Revenue
          </h1>
          <p className="text-muted mb-0">Track all income and revenue transactions</p>
        </div>
        <button
          className="btn btn-success"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <FaPlus className="me-2" />
          Add Income
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Transactions</h6>
              <h3 className="mb-0">{incomeTransactions.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Income</h6>
              <h3 className="mb-0 text-success">{formatCurrency(totalIncome)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Income Accounts</h6>
              <h3 className="mb-0">{Object.keys(incomeByAccount).length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">
                <FaSearch className="me-1" />
                Search
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by client, description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchIncomeTransactions();
                }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">
                <FaFilter className="me-1" />
                Income Account
              </label>
              <select
                className="form-select"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              >
                <option value="all">All Accounts</option>
                {incomeAccounts.map((account) => (
                  <option key={account.id} value={account.account_code}>
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Income by Account Summary */}
      {Object.keys(incomeByAccount).length > 0 && (
        <div className="card shadow mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Income by Account</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Account Code</th>
                    <th>Account Name</th>
                    <th className="text-end">Count</th>
                    <th className="text-end">Total Income</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(incomeByAccount)
                    .sort((a, b) => b.total - a.total)
                    .map((item, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{item.account_code}</strong>
                        </td>
                        <td>{item.account_name}</td>
                        <td className="text-end">{item.count}</td>
                        <td className="text-end">
                          <strong className="text-success">{formatCurrency(item.total)}</strong>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Income Transactions Table */}
      <div className="card shadow">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Client</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th className="text-end">Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No income transactions found
                    </td>
                  </tr>
                ) : (
                  incomeTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>
                      <td>
                        <strong>{transaction.account_code}</strong>
                        <div className="small text-muted">{transaction.account_name}</div>
                      </td>
                      <td>{transaction.client_name || "-"}</td>
                      <td>{transaction.description}</td>
                      <td>
                        <code>{transaction.reference}</code>
                      </td>
                      <td className="text-end">
                        <strong className="text-success">{formatCurrency(transaction.amount)}</strong>
                      </td>
                      <td>
                        {transaction.status && (
                          <span className={`badge bg-${getStatusBadge(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowViewModal(true);
                          }}
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {incomeTransactions.length > 0 && (
                <tfoot className="table-light">
                  <tr>
                    <td colSpan="5">
                      <strong>Total:</strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">{formatCurrency(totalIncome)}</strong>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add Income Form Modal */}
      {showForm && (
        <IncomeFormModal
          formData={formData}
          setFormData={setFormData}
          incomeAccounts={incomeAccounts}
          cashAccounts={cashAccounts}
          clients={clients}
          onSubmit={handleSaveIncome}
          onClose={resetForm}
        />
      )}

      {/* View Transaction Modal */}
      {showViewModal && selectedTransaction && (
        <IncomeViewModal transaction={selectedTransaction} onClose={() => setShowViewModal(false)} />
      )}
    </div>
  );
};

// Income Form Modal Component
const IncomeFormModal = ({ formData, setFormData, incomeAccounts, cashAccounts, clients, onSubmit, onClose }) => {
  return (
    <Portal>
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title">Add Income</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Income Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.income_date}
                      onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Income Account *</label>
                    <select
                      className="form-select"
                      value={formData.income_account_id}
                      onChange={(e) => setFormData({ ...formData, income_account_id: e.target.value })}
                      required
                    >
                      <option value="">Select Income Account</option>
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
                    <label className="form-label">Cash Account *</label>
                    <select
                      className="form-select"
                      value={formData.cash_account_id}
                      onChange={(e) => setFormData({ ...formData, cash_account_id: e.target.value })}
                      required
                    >
                      <option value="">Select Cash Account</option>
                      {cashAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Client (Optional)</label>
                    <select
                      className="form-select"
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    >
                      <option value="">Select Client (Optional)</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Reference Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the income source..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Record Income
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Income View Modal Component
const IncomeViewModal = ({ transaction, onClose }) => {
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Portal>
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title">Income Transaction Details</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Date:</strong> {formatDate(transaction.date)}
                </div>
                <div className="col-md-6">
                  <strong>Reference:</strong> {transaction.reference}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Account:</strong> {transaction.account_code} - {transaction.account_name}
                </div>
                <div className="col-md-6">
                  <strong>Client:</strong> {transaction.client_name || "N/A"}
                </div>
              </div>
              <div className="mb-3">
                <strong>Description:</strong>
                <p>{transaction.description}</p>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="text-center">
                    <h6 className="text-muted mb-2">Amount</h6>
                    <h2 className="text-success mb-0">{formatCurrency(transaction.amount)}</h2>
                  </div>
                </div>
              </div>
              {transaction.status && (
                <div className="mt-3">
                  <strong>Status:</strong>{" "}
                  <span className={`badge bg-${transaction.status === "paid" ? "success" : "info"}`}>
                    {transaction.status}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default Income;

