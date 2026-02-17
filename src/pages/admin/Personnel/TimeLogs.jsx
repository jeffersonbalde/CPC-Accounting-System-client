import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const TimeLogs = () => {
  const { request } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_type: "",
    user_id: "",
    date_from: "",
    date_to: "",
    per_page: 15,
    page: 1,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.user_type) params.set("user_type", filters.user_type);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      params.set("per_page", filters.per_page);
      params.set("page", filters.page);
      const data = await request(`/time-logs?${params.toString()}`);
      setLogs(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.page, filters.per_page]);

  const handleFilter = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
    fetchLogs();
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.user_type) params.set("user_type", filters.user_type);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      const token = localStorage.getItem("auth_token");
      const url = `${API_BASE_URL}/time-logs/export/excel?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `time_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert(err.message || "Export failed");
    }
  };

  const exportPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.user_type) params.set("user_type", filters.user_type);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      const data = await request(`/time-logs/export/pdf?${params.toString()}`);
      if (data.html) {
        const w = window.open("", "_blank");
        w.document.write(data.html);
        w.document.close();
        w.print();
      }
    } catch (err) {
      alert(err.message || "Export failed");
    }
  };

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Time Logs</h1>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Personnel time in/out records</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={exportExcel}
            >
              Export Excel (CSV)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={exportPdf}
            >
              Print / PDF
            </button>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleFilter} className="row g-2 mb-3">
            <div className="col-auto">
              <select
                className="form-select form-select-sm"
                value={filters.user_type}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, user_type: e.target.value }))
                }
              >
                <option value="">All types</option>
                <option value="personnel">Personnel</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-auto">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="User ID"
                value={filters.user_id}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, user_id: e.target.value }))
                }
              />
            </div>
            <div className="col-auto">
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_from: e.target.value }))
                }
              />
            </div>
            <div className="col-auto">
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_to: e.target.value }))
                }
              />
            </div>
            <div className="col-auto">
              <button type="submit" className="btn btn-primary btn-sm">
                Apply
              </button>
            </div>
          </form>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User Type</th>
                      <th>User ID</th>
                      <th>User Name</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Source</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted">
                          No time logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((row) => (
                        <tr key={row.id}>
                          <td>{row.log_date}</td>
                          <td>{row.user_type}</td>
                          <td>{row.user_id}</td>
                          <td>{row.user_name || "-"}</td>
                          <td>{row.time_in || "-"}</td>
                          <td>{row.time_out || "-"}</td>
                          <td>{row.source || "-"}</td>
                          <td>{row.ip_address || "-"}</td>
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
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: f.page - 1 }))
                      }
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: f.page + 1 }))
                      }
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

export default TimeLogs;
