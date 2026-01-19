import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaUserShield, FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaSync } from "react-icons/fa";
import AddAdminModal from "./AddAdminModal";
import EditAdminModal from "./EditAdminModal";

const API_BASE_URL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const AdminManagement = () => {
  const { user: currentUser, token } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const filterAndSortAdmins = useCallback(() => {
    let filtered = [...admins];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((admin) => {
        const name = admin.name || "";
        const username = admin.username || "";
        const fieldsToSearch = [name, username];
        return fieldsToSearch.some(
          (field) =>
            typeof field === "string" &&
            field.toLowerCase().includes(loweredSearch)
        );
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = a[sortField] ? new Date(a[sortField]) : new Date(0);
        const bDate = b[sortField] ? new Date(b[sortField]) : new Date(0);

        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "name" || sortField === "username") {
        const aValue = String(a[sortField] || "").toLowerCase();
        const bValue = String(b[sortField] || "").toLowerCase();
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredAdmins(filtered);
    setCurrentPage(1);
  }, [admins, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortAdmins();
  }, [filterAndSortAdmins]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const adminsList = data.admins || data.data || data || [];
        setAdmins(adminsList);
      } else {
        throw new Error("Failed to fetch admins");
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      showAlert.error("Error", "Failed to load admins");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await fetchAdmins();
    showToast.info("Data refreshed successfully");
  };

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAdd = () => {
    if (actionLock) return;
    setEditingAdmin(null);
    setShowAddModal(true);
  };

  const handleEdit = (admin) => {
    if (actionLock) return;
    setEditingAdmin(admin);
    setShowEditModal(true);
  };

  const handleView = (admin) => {
    if (actionLock) return;
    setSelectedAdmin(admin);
  };

  const handleDelete = async (admin) => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }

    const confirmed = await showAlert.confirm(
      "Delete Admin",
      `Are you sure you want to delete admin "${admin.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setActionLock(true);
    setActionLoading(admin.id);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admins/${admin.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success("Admin deleted successfully");
        await fetchAdmins();
      } else {
        throw new Error(data.message || "Failed to delete admin");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      showAlert.error("Error", error.message || "Failed to delete admin");
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingAdmin(null);
    setSelectedAdmin(null);
  };

  const handleModalSuccess = async () => {
    handleModalClose();
    await fetchAdmins();
  };

  // Pagination
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, endIndex);

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800">
            <FaUserShield className="me-2" />
            Admin Management
          </h1>
          <p className="text-muted small mb-0">
            Manage system administrators and their access
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={refreshAllData}
            disabled={actionLock || loading}
            title="Refresh"
          >
            <FaSync className={loading ? "fa-spin" : ""} />
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={actionLock}
          >
            <FaPlus className="me-1" />
            Add Admin
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Admins
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {admins.length}
                  </div>
                </div>
                <div className="col-auto">
                  <FaUserShield className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Admins
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {admins.length}
                  </div>
                </div>
                <div className="col-auto">
                  <FaUserShield className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Admin List</h6>
          <div className="d-flex gap-2 align-items-center">
            <div className="input-group" style={{ width: "300px" }}>
              <span className="input-group-text">
                <FaSearch />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="form-select"
              style={{ width: "auto" }}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-5">
              <FaUserShield className="fa-3x text-gray-300 mb-3" />
              <p className="text-muted">
                {searchTerm
                  ? "No admins found matching your search."
                  : "No admins found. Click 'Add Admin' to create one."}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("name")}
                      >
                        Name {getSortIcon("name")}
                      </th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("username")}
                      >
                        Username {getSortIcon("username")}
                      </th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("created_at")}
                      >
                        Created {getSortIcon("created_at")}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td>{admin.name || "N/A"}</td>
                        <td>{admin.username}</td>
                        <td>
                          {admin.created_at
                            ? new Date(admin.created_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => handleView(admin)}
                              disabled={actionLock}
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleEdit(admin)}
                              disabled={
                                actionLock ||
                                actionLoading === admin.id ||
                                (currentUser?.id && admin.id === currentUser.id)
                              }
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(admin)}
                              disabled={
                                actionLock ||
                                actionLoading === admin.id ||
                                (currentUser?.id && admin.id === currentUser.id) ||
                                admins.length <= 1
                              }
                              title={
                                admins.length <= 1
                                  ? "Cannot delete the last admin"
                                  : currentUser?.id && admin.id === currentUser.id
                                  ? "Cannot delete your own account"
                                  : "Delete"
                              }
                            >
                              {actionLoading === admin.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                >
                                  <span className="visually-hidden">
                                    Loading...
                                  </span>
                                </span>
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredAdmins.length)} of{" "}
                    {filteredAdmins.length} admins
                  </div>
                  <nav>
                    <ul className="pagination mb-0">
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <li
                              key={page}
                              className={`page-item ${
                                currentPage === page ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <li key={page} className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }
                        return null;
                      })}
                      <li
                        className={`page-item ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAdminModal
          show={showAddModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showEditModal && editingAdmin && (
        <EditAdminModal
          show={showEditModal}
          admin={editingAdmin}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default AdminManagement;

