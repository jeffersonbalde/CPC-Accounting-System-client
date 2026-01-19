import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaTruck, FaPlus, FaEdit, FaTrash, FaFileInvoice, FaMoneyBillWave, FaEye } from "react-icons/fa";
import Portal from "../../../components/Portal";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const SuppliersAP = () => {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [bills, setBills] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("suppliers");

  // Modal states
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    notes: "",
  });

  const [billForm, setBillForm] = useState({
    supplier_id: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: "",
    expense_account_id: "",
    total_amount: "",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    bill_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    cash_account_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
    fetchBills();
    fetchExpenseAccounts();
    fetchCashAccounts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/suppliers?active_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/bills?per_page=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBills(data.data || data);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const fetchExpenseAccounts = async () => {
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
        // Filter for expense and cost of services accounts
        const expenses = data.filter(
          (acc) =>
            acc.account_type === "OPERATING_EXPENSES" ||
            acc.account_type === "COST_OF_SERVICES"
        );
        setExpenseAccounts(expenses);
      }
    } catch (error) {
      console.error("Error fetching expense accounts:", error);
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

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      const url = editingSupplier
        ? `${API_BASE_URL}/accounting/suppliers/${editingSupplier.id}`
        : `${API_BASE_URL}/accounting/suppliers`;

      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplierForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save supplier");
      }

      showToast.success(editingSupplier ? "Supplier updated successfully" : "Supplier created successfully");
      resetSupplierForm();
      fetchSuppliers();
    } catch (error) {
      showToast.error("Failed to save supplier");
    }
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/bills`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...billForm,
          total_amount: parseFloat(billForm.total_amount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create bill");
      }

      showToast.success("Bill created successfully");
      resetBillForm();
      fetchBills();
      fetchSuppliers();
    } catch (error) {
      showToast.error(error.message || "Failed to create bill");
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
          payment_type: "payment",
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
      fetchBills();
      fetchSuppliers();
    } catch (error) {
      showToast.error(error.message || "Failed to record payment");
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    const result = await showAlert.confirm(
      "Delete Supplier",
      `Are you sure you want to delete ${supplier.name}?`
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/accounting/suppliers/${supplier.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          showToast.success("Supplier deleted successfully");
          fetchSuppliers();
        } else {
          throw new Error("Failed to delete supplier");
        }
      } catch (error) {
        showToast.error("Failed to delete supplier");
      }
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      notes: "",
    });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  const resetBillForm = () => {
    setBillForm({
      supplier_id: "",
      bill_date: new Date().toISOString().split("T")[0],
      due_date: "",
      expense_account_id: "",
      total_amount: "",
      description: "",
    });
    setShowBillForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      bill_id: "",
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
      received: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
    };
    return badges[status] || "secondary";
  };

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

  // Ensure bills is an array
  const billsArray = Array.isArray(bills) ? bills : [];
  
  // Calculate totals with proper number parsing
  const totalAP = suppliers.reduce((sum, supplier) => {
    const payable = parseFloat(supplier.total_payable) || 0;
    return sum + payable;
  }, 0);
  
  const totalBills = billsArray.reduce((sum, bill) => {
    const amount = parseFloat(bill.total_amount) || 0;
    return sum + amount;
  }, 0);
  
  const totalPaid = billsArray.reduce((sum, bill) => {
    const paid = parseFloat(bill.paid_amount) || 0;
    return sum + paid;
  }, 0);

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800">
            <FaTruck className="me-2" />
            Suppliers / Accounts Payable
          </h1>
          <p className="text-muted mb-0">Manage suppliers and track payables</p>
        </div>
        <div className="btn-group">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetSupplierForm();
              setShowSupplierForm(true);
            }}
          >
            <FaPlus className="me-2" />
            Add Supplier
          </button>
          <button
            className="btn btn-warning"
            onClick={() => {
              resetBillForm();
              setShowBillForm(true);
            }}
            disabled={suppliers.length === 0}
          >
            <FaFileInvoice className="me-2" />
            Create Bill
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Suppliers</h6>
              <h3 className="mb-0">{suppliers.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total AP</h6>
              <h3 className="mb-0 text-danger">{formatCurrency(totalAP)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Bills</h6>
              <h3 className="mb-0">{formatCurrency(totalBills)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Paid</h6>
              <h3 className="mb-0 text-success">{formatCurrency(totalPaid)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "suppliers" ? "active" : ""}`}
            onClick={() => setActiveTab("suppliers")}
          >
            Suppliers ({suppliers.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "bills" ? "active" : ""}`}
            onClick={() => setActiveTab("bills")}
          >
            Bills ({billsArray.length})
          </button>
        </li>
      </ul>

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <div className="card shadow">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th className="text-end">Total AP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No suppliers found
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>
                          <strong>{supplier.name}</strong>
                          {supplier.contact_person && (
                            <div className="small text-muted">Contact: {supplier.contact_person}</div>
                          )}
                        </td>
                        <td>{supplier.phone || "-"}</td>
                        <td>{supplier.email || "-"}</td>
                        <td className="text-end">
                          <strong className={supplier.total_payable > 0 ? "text-danger" : "text-success"}>
                            {formatCurrency(supplier.total_payable)}
                          </strong>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setSupplierForm({
                                  name: supplier.name,
                                  email: supplier.email || "",
                                  phone: supplier.phone || "",
                                  address: supplier.address || "",
                                  contact_person: supplier.contact_person || "",
                                  notes: supplier.notes || "",
                                });
                                setShowSupplierForm(true);
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteSupplier(supplier)}
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
      )}

      {/* Bills Tab */}
      {activeTab === "bills" && (
        <div className="card shadow">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Bill #</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th className="text-end">Amount</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billsArray.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-4">
                        No bills found
                      </td>
                    </tr>
                  ) : (
                    billsArray.map((bill) => (
                      <tr key={bill.id}>
                        <td>
                          <code>{bill.bill_number}</code>
                        </td>
                        <td>{bill.supplier?.name || "-"}</td>
                        <td>{formatDate(bill.bill_date)}</td>
                        <td>{bill.due_date ? formatDate(bill.due_date) : "-"}</td>
                        <td className="text-end">{formatCurrency(bill.total_amount)}</td>
                        <td className="text-end text-success">{formatCurrency(bill.paid_amount)}</td>
                        <td className="text-end">
                          <strong className={bill.balance > 0 ? "text-danger" : "text-success"}>
                            {formatCurrency(bill.balance)}
                          </strong>
                        </td>
                        <td>
                          <span className={`badge bg-${getStatusBadge(bill.status)}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-info"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowViewModal(true);
                              }}
                            >
                              <FaEye />
                            </button>
                            {bill.balance > 0 && (
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentForm({
                                    ...paymentForm,
                                    bill_id: bill.id.toString(),
                                    amount: bill.balance.toString(),
                                  });
                                  setShowPaymentForm(true);
                                }}
                              >
                                <FaMoneyBillWave />
                              </button>
                            )}
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
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierFormModal
          form={supplierForm}
          setForm={setSupplierForm}
          editing={editingSupplier}
          onSubmit={handleSaveSupplier}
          onClose={resetSupplierForm}
        />
      )}

      {/* Bill Form Modal */}
      {showBillForm && (
        <BillFormModal
          form={billForm}
          setForm={setBillForm}
          suppliers={suppliers}
          expenseAccounts={expenseAccounts}
          onSubmit={handleSaveBill}
          onClose={resetBillForm}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBill && (
        <PaymentFormModal
          form={paymentForm}
          setForm={setPaymentForm}
          bill={selectedBill}
          cashAccounts={cashAccounts}
          onSubmit={handleSavePayment}
          onClose={resetPaymentForm}
        />
      )}

      {/* View Bill Modal */}
      {showViewModal && selectedBill && (
        <BillViewModal bill={selectedBill} onClose={() => setShowViewModal(false)} />
      )}
    </div>
  );
};

// Supplier Form Modal Component
const SupplierFormModal = ({ form, setForm, editing, onSubmit, onClose }) => {
  return (
    <Portal>
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">{editing ? "Edit Supplier" : "New Supplier"}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? "Update" : "Create"} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Bill Form Modal Component
const BillFormModal = ({ form, setForm, suppliers, expenseAccounts, onSubmit, onClose }) => {
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
            <div className="modal-header bg-warning text-white">
              <h5 className="modal-title">Create Bill</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Supplier *</label>
                    <select
                      className="form-select"
                      value={form.supplier_id}
                      onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Bill Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.bill_date}
                      onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Expense Account *</label>
                    <select
                      className="form-select"
                      value={form.expense_account_id}
                      onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })}
                      required
                    >
                      <option value="">Select Account</option>
                      {expenseAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Total Amount *</label>
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
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Create Bill
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
const PaymentFormModal = ({ form, setForm, bill, cashAccounts, onSubmit, onClose }) => {
  return (
    <Portal>
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">Make Payment</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Bill:</strong> {bill.bill_number}
                  <br />
                  <strong>Supplier:</strong> {bill.supplier?.name}
                  <br />
                  <strong>Balance:</strong> ₱{parseFloat(bill.balance).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Cash Account *</label>
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
                  <label className="form-label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={bill.balance}
                    className="form-control"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
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
                  <label className="form-label">Reference Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    placeholder="Check number, transaction reference, etc."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Make Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Bill View Modal Component
const BillViewModal = ({ bill, onClose }) => {
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
            <div className="modal-header bg-warning text-white">
              <h5 className="modal-title">Bill Details</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Bill Number:</strong> {bill.bill_number}
                </div>
                <div className="col-md-6">
                  <strong>Date:</strong> {formatDate(bill.bill_date)}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Supplier:</strong> {bill.supplier?.name}
                </div>
                <div className="col-md-6">
                  <strong>Due Date:</strong> {bill.due_date ? formatDate(bill.due_date) : "N/A"}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <strong>Expense Account:</strong> {bill.expense_account?.account_code} -{" "}
                  {bill.expense_account?.account_name}
                </div>
              </div>
              {bill.description && (
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p>{bill.description}</p>
                </div>
              )}
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <strong>Total Amount:</strong>
                      <h4>{formatCurrency(bill.total_amount)}</h4>
                    </div>
                    <div className="col-md-4">
                      <strong>Paid Amount:</strong>
                      <h4 className="text-success">{formatCurrency(bill.paid_amount)}</h4>
                    </div>
                    <div className="col-md-4">
                      <strong>Balance:</strong>
                      <h4 className={bill.balance > 0 ? "text-danger" : "text-success"}>
                        {formatCurrency(bill.balance)}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <strong>Status:</strong>{" "}
                <span className={`badge bg-${bill.status === "paid" ? "success" : bill.status === "partial" ? "warning" : "info"}`}>
                  {bill.status}
                </span>
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

export default SuppliersAP;

