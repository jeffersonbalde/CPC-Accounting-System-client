import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";

const ACTION_OPTIONS = [
  "delete_client",
  "delete_invoice",
  "delete_supplier",
  "delete_bill",
];

const AuthorizationCodes = () => {
  const { request } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    for_action: "delete_client",
    valid_minutes: 10,
  });
  const [generatedCode, setGeneratedCode] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const fetchCodes = async (page = 1) => {
    setLoading(true);
    try {
      const data = await request(
        `/authorization-codes?per_page=20&page=${page}`
      );
      setCodes(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error(err);
      setCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedCode(null);
    try {
      const data = await request("/authorization-codes", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setGeneratedCode({
        code: data.code,
        expires_at: data.expires_at,
        for_action: data.for_action,
      });
      fetchCodes(1);
    } catch (err) {
      alert(err.message || "Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (s) => (s ? new Date(s).toLocaleString() : "-");

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Authorization Codes</h1>

      <div className="card mb-4">
        <div className="card-header">Generate new code</div>
        <div className="card-body">
          <form onSubmit={handleGenerate} className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small">For action</label>
              <select
                className="form-select form-select-sm"
                value={form.for_action}
                onChange={(e) =>
                  setForm((f) => ({ ...f, for_action: e.target.value }))
                }
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Valid (minutes)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                min={1}
                max={1440}
                value={form.valid_minutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    valid_minutes: parseInt(e.target.value, 10) || 10,
                  }))
                }
              />
            </div>
            <div className="col-auto">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate code"}
              </button>
            </div>
          </form>
          {generatedCode && (
            <div className="alert alert-success mt-3 mb-0 small">
              <strong>Code: {generatedCode.code}</strong> — for{" "}
              {generatedCode.for_action}, expires{" "}
              {formatDate(generatedCode.expires_at)}. Share with personnel for
              one-time use.
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">Recent codes</div>
        <div className="card-body">
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>For action</th>
                      <th>Expires at</th>
                      <th>Used at</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">
                          No codes yet.
                        </td>
                      </tr>
                    ) : (
                      codes.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <code>{row.code}</code>
                          </td>
                          <td>{row.for_action}</td>
                          <td>{formatDate(row.expires_at)}</td>
                          <td>{row.used_at ? formatDate(row.used_at) : "—"}</td>
                          <td>{formatDate(row.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {pagination.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">
                    Page {pagination.current_page} of {pagination.last_page} (
                    {pagination.total} total)
                  </small>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={pagination.current_page <= 1}
                      onClick={() => fetchCodes(pagination.current_page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() => fetchCodes(pagination.current_page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorizationCodes;
