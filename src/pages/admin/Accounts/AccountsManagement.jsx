import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";

const AccountsManagement = () => {
  const { request, isAdmin, currentAccount, setCurrentAccount, getUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/accounts");
      if (data?.accounts) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      showAlert.error("Error", err.message || "Failed to load accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenForm = () => {
    setForm({ name: "", code: "" });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm({ name: "", code: "" });
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (form.name || "").trim();
    if (!name) {
      setFormErrors({ name: "Business name is required." });
      return;
    }
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request("/accounts", {
        method: "POST",
        body: JSON.stringify({ name, code: (form.code || "").trim() || undefined }),
      });
      if (data?.success && data?.account) {
        showToast.success("Account created successfully.");
        const updated = [...accounts, data.account];
        setAccounts(updated);
        setCurrentAccount(data.account);
        await getUser();
        handleCloseForm();
        showToast.success("Switched to new account. You can add Chart of Accounts and data for this business.");
      } else {
        showAlert.error("Error", data?.message || "Failed to create account");
      }
    } catch (err) {
      const msg = err.message || "Failed to create account";
      if (err.message && msg.includes("validation")) {
        setFormErrors({ name: "Name is required and must be valid." });
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="container-fluid px-4 py-3 fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            Business Accounts
          </h1>
          <p className="text-muted small mb-0">
            Manage multiple businesses. Switch accounts from the topbar to work with different data.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center"
          onClick={handleOpenForm}
          style={{
            background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
            border: "none",
          }}
        >
          <i className="fas fa-plus me-2"></i>
          Add Account
        </button>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 mb-0 text-muted small">Loading accounts...</p>
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fas fa-building fa-3x text-muted mb-3" style={{ opacity: 0.5 }}></i>
            <h5 className="mb-2" style={{ color: "var(--text-primary)" }}>
              No business accounts yet
            </h5>
            <p className="text-muted small mb-3">
              Create your first business account to get started. You can add more later (e.g. Bakery Store, PPHd Real Estate).
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenForm}
              style={{
                background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                border: "none",
              }}
            >
              <i className="fas fa-plus me-2"></i>
              Add Account
            </button>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="small fw-semibold">Name</th>
                    <th className="small fw-semibold">Code</th>
                    <th className="small fw-semibold text-center">Current</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id}>
                      <td className="align-middle">
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                          {acc.name}
                        </span>
                      </td>
                      <td className="align-middle text-muted small">{acc.code || "—"}</td>
                      <td className="align-middle text-center">
                        {currentAccount?.id === acc.id ? (
                          <span className="badge bg-primary">Active</span>
                        ) : (
                          <span className="text-muted small">Switch in topbar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
          onClick={(e) => e.target === e.currentTarget && handleCloseForm()}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header border-0" style={{ backgroundColor: "#0c203f", color: "#fff" }}>
                <h5 className="modal-title">Add Business Account</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={handleCloseForm}
                  disabled={formLoading}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Create a new business (e.g. Bakery Store, PPHd Real Estate). You will be assigned to it and can switch to it from the topbar.
                  </p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Business name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Bakery Store"
                      disabled={formLoading}
                    />
                    {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                  </div>
                  <div className="mb-0">
                    <label className="form-label fw-semibold">Code (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="e.g. BAKERY (auto-generated if empty)"
                      disabled={formLoading}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={formLoading}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formLoading || !form.name?.trim()}
                    style={{ background: "#0c203f", border: "none" }}
                  >
                    {formLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsManagement;
