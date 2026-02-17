import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaFileInvoice, FaPlus, FaTrash, FaEdit, FaEye, FaSave, FaTimes } from "react-icons/fa";
import Portal from "../../../components/Portal";

const JournalEntries = () => {
  const { request } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

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

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await request("/accounting/chart-of-accounts?active_only=true");
      setAccounts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = await request("/accounting/journal-entries?per_page=20");
      setEntries(Array.isArray(data) ? data : data?.data || data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      showToast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { account_id: "", debit_amount: "", credit_amount: "", description: "" },
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
        errors[`line_${index}_amount`] = "Either debit or credit amount is required";
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
      errors.balance = `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`;
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
        ? `/accounting/journal-entries/${editingEntry.id}`
        : "/accounting/journal-entries";

      const method = editingEntry ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify(payload),
      });

      showToast.success(
        editingEntry ? "Journal entry updated successfully" : "Journal entry created successfully"
      );
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      showToast.error(error.message || "Failed to save journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split("T")[0],
      description: "",
      reference_number: "",
      lines: [
        { account_id: "", debit_amount: "", credit_amount: "", description: "" },
        { account_id: "", debit_amount: "", credit_amount: "", description: "" },
      ],
    });
    setFormErrors({});
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleEdit = (entry) => {
    if (entry.source_document) {
      showToast.warning(entry.source_document.edit_hint);
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
        credit_amount: line.credit_amount > 0 ? line.credit_amount.toString() : "",
        description: line.description || "",
      })),
    });
    setShowForm(true);
  };

  const handleDelete = async (entry) => {
    if (entry.source_document) {
      showToast.warning(entry.source_document.edit_hint);
      return;
    }

    const result = await showAlert.confirm(
      "Delete Journal Entry",
      `Are you sure you want to delete entry ${entry.entry_number}? This action cannot be undone.`
    );

    if (result.isConfirmed) {
      try {
        await request(`/accounting/journal-entries/${entry.id}`, {
          method: "DELETE",
        });

        showToast.success("Journal entry deleted successfully");
        fetchEntries();
      } catch (error) {
        console.error("Error deleting entry:", error);
        showToast.error(error.message || "Failed to delete journal entry");
      }
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
            <FaFileInvoice className="me-2" />
            Journal Entries
          </h1>
          <p className="text-muted mb-0">Record all financial transactions</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <FaPlus className="me-2" />
          New Entry
        </button>
      </div>

      {/* Journal Entries List */}
      <div className="card shadow">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Entry Number</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th className="text-end">Total Debit</th>
                  <th className="text-end">Total Credit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No journal entries found
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.entry_number}</strong>
                      </td>
                      <td>{formatDate(entry.entry_date)}</td>
                      <td>
                        <div>{entry.description}</div>
                        {entry.source_document && (
                          <span
                            className="badge bg-secondary mt-1"
                            style={{ fontSize: "0.65rem" }}
                            title={entry.source_document.edit_hint}
                          >
                            From {entry.source_document.type}: {entry.source_document.reference}
                          </span>
                        )}
                      </td>
                      <td>{entry.reference_number || "-"}</td>
                      <td className="text-end text-danger">
                        <strong>{formatCurrency(entry.total_debit)}</strong>
                      </td>
                      <td className="text-end text-success">
                        <strong>{formatCurrency(entry.total_credit)}</strong>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            onClick={() => setViewingEntry(entry)}
                            title="View"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(entry)}
                            disabled={!!entry.source_document}
                            title={entry.source_document ? entry.source_document.edit_hint : "Edit"}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(entry)}
                            disabled={!!entry.source_document}
                            title={entry.source_document ? entry.source_document.edit_hint : "Delete"}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
        <JournalEntryViewModal entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      )}
    </div>
  );
};

// Journal Entry Form Modal Component
const JournalEntryFormModal = ({
  formData,
  setFormData,
  accounts,
  formErrors,
  totalDebit,
  totalCredit,
  isBalanced,
  submitting,
  editingEntry,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onSubmit,
  onClose,
}) => {
  return (
    <Portal>
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                <FaFileInvoice className="me-2" />
                {editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Entry Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Description *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.description ? "is-invalid" : ""}`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                    {formErrors.description && (
                      <div className="invalid-feedback">{formErrors.description}</div>
                    )}
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-12">
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

                <div className="card mb-3">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>Journal Entry Lines</strong>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={onAddLine}
                    >
                      <FaPlus className="me-1" />
                      Add Line
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th style={{ width: "30%" }}>Account *</th>
                            <th style={{ width: "20%" }}>Debit Amount</th>
                            <th style={{ width: "20%" }}>Credit Amount</th>
                            <th style={{ width: "25%" }}>Description</th>
                            <th style={{ width: "5%" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.lines.map((line, index) => (
                            <tr key={index}>
                              <td>
                                <select
                                  className={`form-select form-select-sm ${
                                    formErrors[`line_${index}_account`] ? "is-invalid" : ""
                                  }`}
                                  value={line.account_id}
                                  onChange={(e) => onLineChange(index, "account_id", e.target.value)}
                                  required
                                >
                                  <option value="">Select Account</option>
                                  {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.account_code} - {account.account_name}
                                    </option>
                                  ))}
                                </select>
                                {formErrors[`line_${index}_account`] && (
                                  <div className="invalid-feedback d-block">
                                    {formErrors[`line_${index}_account`]}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className={`form-control form-control-sm ${
                                    formErrors[`line_${index}_amount`] ? "is-invalid" : ""
                                  }`}
                                  value={line.debit_amount}
                                  onChange={(e) => onLineChange(index, "debit_amount", e.target.value)}
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className={`form-control form-control-sm ${
                                    formErrors[`line_${index}_amount`] ? "is-invalid" : ""
                                  }`}
                                  value={line.credit_amount}
                                  onChange={(e) => onLineChange(index, "credit_amount", e.target.value)}
                                  placeholder="0.00"
                                />
                                {formErrors[`line_${index}_amount`] && (
                                  <div className="invalid-feedback d-block">
                                    {formErrors[`line_${index}_amount`]}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={line.description}
                                  onChange={(e) => onLineChange(index, "description", e.target.value)}
                                  placeholder="Optional"
                                />
                              </td>
                              <td>
                                {formData.lines.length > 2 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => onRemoveLine(index)}
                                  >
                                    <FaTrash />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-light">
                            <td colSpan="1">
                              <strong>Totals:</strong>
                            </td>
                            <td className="text-end">
                              <strong className={isBalanced ? "text-danger" : "text-danger"}>
                                {totalDebit.toFixed(2)}
                              </strong>
                            </td>
                            <td className="text-end">
                              <strong className={isBalanced ? "text-success" : "text-danger"}>
                                {totalCredit.toFixed(2)}
                              </strong>
                            </td>
                            <td colSpan="2">
                              {isBalanced ? (
                                <span className="badge bg-success">Balanced</span>
                              ) : (
                                <span className="badge bg-danger">
                                  Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {formErrors.balance && (
                      <div className="alert alert-danger mt-2">{formErrors.balance}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                  <FaTimes className="me-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !isBalanced}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      {editingEntry ? "Update Entry" : "Create Entry"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Journal Entry View Modal Component
const JournalEntryViewModal = ({ entry, onClose }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
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
            <div className="modal-header bg-info text-white">
              <h5 className="modal-title">
                <FaEye className="me-2" />
                Journal Entry Details
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Entry Number:</strong> {entry.entry_number}
                </div>
                <div className="col-md-6">
                  <strong>Date:</strong> {formatDate(entry.entry_date)}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <strong>Description:</strong> {entry.description}
                </div>
              </div>
              {entry.reference_number && (
                <div className="row mb-3">
                  <div className="col-md-12">
                    <strong>Reference Number:</strong> {entry.reference_number}
                  </div>
                </div>
              )}
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Account</th>
                      <th className="text-end">Debit</th>
                      <th className="text-end">Credit</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines?.map((line, index) => (
                      <tr key={index}>
                        <td>
                          {line.account?.account_code} - {line.account?.account_name}
                        </td>
                        <td className="text-end text-danger">
                          {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : "-"}
                        </td>
                        <td className="text-end text-success">
                          {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : "-"}
                        </td>
                        <td>{line.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td>
                        <strong>Totals:</strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-danger">{formatCurrency(entry.total_debit)}</strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-success">{formatCurrency(entry.total_credit)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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

export default JournalEntries;

