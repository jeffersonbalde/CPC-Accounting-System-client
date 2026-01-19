import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Portal from "../../../components/Portal";
import {
  FaKey,
  FaLock,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaShieldAlt,
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

const Settings = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("password");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Authorization Codes state
  const [authCodes, setAuthCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [codeForm, setCodeForm] = useState({
    code: "",
    description: "",
    expires_at: "",
    is_active: true,
  });
  const [codeFormLoading, setCodeFormLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const modalRef = useRef(null);
  const contentRef = useRef(null);

  // Theme matching Aurora Navy Color Scheme
  const theme = {
    primary: "#0c203f",
    primaryDark: "#050f23",
    primaryLight: "#1f3e6d",
    accent: "#f0b429",
    accentLight: "#ffd866",
    textPrimary: "#10172b",
    textSecondary: "#4c5875",
    inputBg: "#ffffff",
    inputText: "#10172b",
    inputBorder: "#d5dbe6",
  };

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  // Fetch authorization codes
  const fetchAuthorizationCodes = async () => {
    setLoadingCodes(true);
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const response = await fetch(
        `${API_BASE_URL}/admin/authorization-codes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuthCodes(data.codes || []);
        setFilteredCodes(data.codes || []);
      } else {
        throw new Error("Failed to fetch authorization codes");
      }
    } catch (error) {
      console.error("Error fetching authorization codes:", error);
      showAlert.error("Error", "Failed to load authorization codes");
      setAuthCodes([]);
      setFilteredCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    if (activeTab === "auth-codes" && authCodes.length === 0) {
      fetchAuthorizationCodes();
    }
  }, [activeTab]);

  useEffect(() => {
    setFilteredCodes(authCodes);
    setCurrentPage(1);
  }, [authCodes]);

  const isActionDisabled = (codeId = null) => {
    return actionLock || (actionLoading && actionLoading !== codeId);
  };

  // Save authorization code (create or update)
  const handleSaveCode = async () => {
    if (!codeForm.code) {
      showAlert.error("Validation Error", "Code is required");
      return;
    }

    if (actionLock || codeFormLoading) {
      showToast.warning("Please wait until current action completes");
      return;
    }

    setCodeFormLoading(true);
    setActionLock(true);

    try {
      showAlert.loading(
        editingCode
          ? "Updating Authorization Code"
          : "Creating Authorization Code"
      );

      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const url = editingCode
        ? `${API_BASE_URL}/admin/authorization-codes/${editingCode.id}`
        : `${API_BASE_URL}/admin/authorization-codes`;

      const method = editingCode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          code: codeForm.code,
          description: codeForm.description,
          expires_at: codeForm.expires_at || null,
          is_active: codeForm.is_active,
        }),
      });

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showToast.success(
          editingCode
            ? "Authorization code updated successfully!"
            : "Authorization code created successfully!"
        );
        handleCloseModal();
        fetchAuthorizationCodes();
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join("\n");
          showAlert.error("Error", errorMessages);
        } else {
          showAlert.error(
            "Error",
            data.message || "Failed to save authorization code"
          );
        }
      }
    } catch (error) {
      showAlert.close();
      console.error("Error saving authorization code:", error);
      showAlert.error(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setCodeFormLoading(false);
      setActionLock(false);
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowCodeForm(false);
      setIsClosing(false);
      setEditingCode(null);
      setCodeForm({
        code: "",
        description: "",
        expires_at: "",
        is_active: true,
      });
    }, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current && !codeFormLoading) {
      handleCloseModal();
    }
  };

  const handleEditCode = (code) => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    setEditingCode(code);
    setCodeForm({
      code: code.code,
      description: code.description || "",
      expires_at: code.expires_at ? code.expires_at.split("T")[0] : "",
      is_active: code.is_active,
    });
    setShowCodeForm(true);
  };

  // Delete authorization code
  const handleDeleteCode = async (code) => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }

    const result = await showAlert.confirm(
      "Delete Authorization Code",
      "Are you sure you want to delete this authorization code? This action cannot be undone.",
      "Yes, Delete",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    setActionLock(true);
    setActionLoading(code.id);

    try {
      showAlert.loading("Deleting Authorization Code");

      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const response = await fetch(
        `${API_BASE_URL}/admin/authorization-codes/${code.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showToast.success("Authorization code deleted successfully!");
        fetchAuthorizationCodes();
      } else {
        showAlert.error(
          "Error",
          data.message || "Failed to delete authorization code"
        );
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deleting authorization code:", error);
      showAlert.error(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  // Clear errors when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormErrors({});
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const result = await showAlert.confirm(
      "Change Password",
      "Are you sure you want to change your password?",
      "Yes, Change Password",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    showAlert.loading(
      "Changing Password...",
      "Please wait while we securely update your password",
      {
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
      }
    );

    setIsPasswordLoading(true);
    setFormErrors({});

    // Validation checks
    if (!passwordForm.current_password) {
      showAlert.close();
      setFormErrors({ current_password: ["Current password is required."] });
      setIsPasswordLoading(false);
      showAlert.error("Validation Error", "Current password is required.");
      return;
    }

    if (!passwordForm.new_password) {
      showAlert.close();
      setFormErrors({ new_password: ["New password is required."] });
      setIsPasswordLoading(false);
      showAlert.error("Validation Error", "New password is required.");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showAlert.close();
      setFormErrors({
        new_password: ["Password must be at least 6 characters long."],
      });
      setIsPasswordLoading(false);
      showAlert.error(
        "Validation Error",
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      showAlert.close();
      setFormErrors({ new_password_confirmation: ["Passwords do not match."] });
      setIsPasswordLoading(false);
      showAlert.error("Validation Error", "Passwords do not match.");
      return;
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const requestData = {
        name: user?.name || "",
        email: user?.email || "",
        contact_number: user?.contact_number || "",
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        new_password_confirmation: passwordForm.new_password_confirmation,
      };

      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showToast.success("Password changed successfully!");
        setPasswordForm({
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        });
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
          const errorMessages = Object.values(data.errors).flat().join("\n");
          showAlert.error("Password Change Failed", errorMessages);
        } else if (data.message) {
          if (data.message.includes("Current password is incorrect")) {
            setFormErrors({
              current_password: ["Current password is incorrect."],
            });
          }
          showAlert.error("Password Change Failed", data.message);
        } else {
          showAlert.error(
            "Password Change Failed",
            "An unknown error occurred."
          );
        }
      }
    } catch (error) {
      showAlert.close();
      showAlert.error(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="container-fluid px-4 py-3 fadeIn">
      {/* Header - MATCHING ADMIN SETTINGS STYLING */}
      <div className="text-center mb-4">
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center me-3"
            style={{
              width: "50px",
              height: "50px",
              background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
              color: "white",
            }}
          >
            <FaCog size={22} />
          </div>
          <div className="text-start">
            <h1
              className="h3 mb-1 fw-bold"
              style={{ color: theme.textPrimary }}
            >
              Settings
            </h1>
            <p className="text-muted mb-0 small">
              {user?.name} • {user?.role === "admin" ? "Administrator" : "User"}
            </p>
            <small className="text-muted">
              System configuration and security settings
            </small>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Sidebar Navigation - MATCHING ADMIN SETTINGS STYLING */}
        <div className="col-12 col-lg-3">
          <div
            className="card border-0 h-100"
            style={{ boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
          >
            <div className="card-header bg-transparent border-0 py-3 px-3">
              <h6 className="mb-0 fw-bold" style={{ color: theme.textPrimary }}>
                Settings Menu
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2">
                {/* Change Password Tab */}
                <button
                  className={`btn text-start p-3 d-flex align-items-center border-0 position-relative overflow-hidden ${
                    activeTab === "password" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("password")}
                  style={{
                    background:
                      activeTab === "password"
                        ? "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)"
                        : "#f8f9fa",
                    border:
                      activeTab === "password" ? "none" : "1px solid #dee2e6",
                    borderRadius: "8px",
                    color: activeTab === "password" ? "white" : "#495057",
                    fontWeight: activeTab === "password" ? "600" : "500",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "password") {
                      e.target.style.background = "#e9ecef";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "password") {
                      e.target.style.background = "#f8f9fa";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      background:
                        activeTab === "password"
                          ? "rgba(255, 255, 255, 0.2)"
                          : "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                      color: "white",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaLock size={16} />
                  </div>
                  <div className="text-start">
                    <div className="fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Change Password
                    </div>
                    <small
                      style={{
                        opacity: activeTab === "password" ? 0.9 : 0.7,
                        fontSize: "0.75rem",
                      }}
                    >
                      Update your password
                    </small>
                  </div>
                </button>

                {/* Authorization Codes Tab */}
                <button
                  className={`btn text-start p-3 d-flex align-items-center border-0 position-relative overflow-hidden ${
                    activeTab === "auth-codes" ? "active" : ""
                  }`}
                  onClick={() => {
                    handleTabChange("auth-codes");
                    if (authCodes.length === 0) {
                      fetchAuthorizationCodes();
                    }
                  }}
                  style={{
                    background:
                      activeTab === "auth-codes"
                        ? "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)"
                        : "#f8f9fa",
                    border:
                      activeTab === "auth-codes" ? "none" : "1px solid #dee2e6",
                    borderRadius: "8px",
                    color: activeTab === "auth-codes" ? "white" : "#495057",
                    fontWeight: activeTab === "auth-codes" ? "600" : "500",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "auth-codes") {
                      e.target.style.background = "#e9ecef";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "auth-codes") {
                      e.target.style.background = "#f8f9fa";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      background:
                        activeTab === "auth-codes"
                          ? "rgba(255, 255, 255, 0.2)"
                          : "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                      color: "white",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaShieldAlt size={16} />
                  </div>
                  <div className="text-start">
                    <div className="fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Authorization Codes
                    </div>
                    <small
                      style={{
                        opacity: activeTab === "auth-codes" ? 0.9 : 0.7,
                        fontSize: "0.75rem",
                      }}
                    >
                      Manage authorization codes
                    </small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-12 col-lg-9">
          {/* Password Tab */}
          {activeTab === "password" && (
            <div
              className="card border-0 h-100"
              style={{ boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
            >
              <div className="card-header bg-transparent border-0 py-3 px-3">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-2"
                    style={{
                      width: "28px",
                      height: "28px",
                      background:
                        "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                      color: "white",
                    }}
                  >
                    <FaLock size={14} />
                  </div>
                  <h6
                    className="mb-0 fw-bold"
                    style={{ color: theme.textPrimary }}
                  >
                    Change Password
                  </h6>
                </div>
              </div>
              <div className="card-body p-3">
                <div
                  className="alert alert-info mb-4"
                  style={{
                    backgroundColor: "rgba(31, 62, 109, 0.1)",
                    borderColor: "var(--primary-light)",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Note:</strong> You can change your password here.
                  Ensure your new password is at least 6 characters long and
                  keep it secure.
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="row g-3">
                    {/* Current Password */}
                    <div className="col-12">
                      <label
                        className="form-label small fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Current Password *
                      </label>
                      <div className="input-group">
                        <span
                          className="input-group-text bg-transparent border-end-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <FaLock
                            style={{ color: "var(--text-muted)" }}
                            size={16}
                          />
                        </span>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="current_password"
                          className={`form-control border-start-0 ps-2 fw-semibold ${
                            formErrors.current_password ? "is-invalid" : ""
                          }`}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            color: "var(--input-text)",
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                          value={passwordForm.current_password}
                          onChange={handlePasswordInputChange}
                          placeholder="Enter current password"
                          required
                        />
                        <span
                          className="input-group-text bg-transparent border-start-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent"
                            style={{ color: "var(--text-muted)" }}
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                          >
                            {showCurrentPassword ? (
                              <FaEyeSlash size={14} />
                            ) : (
                              <FaEye size={14} />
                            )}
                          </button>
                        </span>
                      </div>
                      {formErrors.current_password && (
                        <div className="invalid-feedback d-block small mt-1">
                          {formErrors.current_password[0]}
                        </div>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        New Password *
                      </label>
                      <div className="input-group">
                        <span
                          className="input-group-text bg-transparent border-end-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <FaLock
                            style={{ color: "var(--text-muted)" }}
                            size={16}
                          />
                        </span>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="new_password"
                          className={`form-control border-start-0 ps-2 fw-semibold ${
                            formErrors.new_password ? "is-invalid" : ""
                          }`}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            color: "var(--input-text)",
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                          value={passwordForm.new_password}
                          onChange={handlePasswordInputChange}
                          placeholder="Enter new password"
                          required
                          minLength={6}
                        />
                        <span
                          className="input-group-text bg-transparent border-start-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent"
                            style={{ color: "var(--text-muted)" }}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <FaEyeSlash size={14} />
                            ) : (
                              <FaEye size={14} />
                            )}
                          </button>
                        </span>
                      </div>
                      {formErrors.new_password && (
                        <div className="invalid-feedback d-block small mt-1">
                          {formErrors.new_password[0]}
                        </div>
                      )}
                      <div
                        className="form-text small mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Password must be at least 6 characters long
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Confirm New Password *
                      </label>
                      <div className="input-group">
                        <span
                          className="input-group-text bg-transparent border-end-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <FaLock
                            style={{ color: "var(--text-muted)" }}
                            size={16}
                          />
                        </span>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="new_password_confirmation"
                          className={`form-control border-start-0 ps-2 fw-semibold ${
                            formErrors.new_password_confirmation
                              ? "is-invalid"
                              : ""
                          }`}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            color: "var(--input-text)",
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                          value={passwordForm.new_password_confirmation}
                          onChange={handlePasswordInputChange}
                          placeholder="Confirm new password"
                          required
                          minLength={6}
                        />
                        <span
                          className="input-group-text bg-transparent border-start-0"
                          style={{
                            borderColor: "var(--input-border)",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent"
                            style={{ color: "var(--text-muted)" }}
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <FaEyeSlash size={14} />
                            ) : (
                              <FaEye size={14} />
                            )}
                          </button>
                        </span>
                      </div>
                      {formErrors.new_password_confirmation && (
                        <div className="invalid-feedback d-block small mt-1">
                          {formErrors.new_password_confirmation[0]}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn w-100 d-flex align-items-center justify-content-center py-2 border-0 position-relative overflow-hidden"
                        disabled={isPasswordLoading}
                        style={{
                          background:
                            "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                          color: "white",
                          borderRadius: "6px",
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isPasswordLoading) {
                            e.target.style.background =
                              "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)";
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow =
                              "0 4px 8px rgba(0,0,0,0.2)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPasswordLoading) {
                            e.target.style.background =
                              "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }
                        }}
                      >
                        {isPasswordLoading ? (
                          <>
                            <FaSpinner className="spinner me-2" size={12} />
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <FaKey className="me-2" size={12} />
                            Change Password
                            <FaArrowRight className="ms-2" size={10} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Authorization Codes Tab */}
          {activeTab === "auth-codes" && (
            <div
              className="card border-0 h-100"
              style={{ boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
            >
              <div className="card-header bg-transparent border-0 py-3 px-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-2"
                      style={{
                        width: "28px",
                        height: "28px",
                        background:
                          "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                        color: "white",
                      }}
                    >
                      <FaShieldAlt size={14} />
                    </div>
                    <h6
                      className="mb-0 fw-bold"
                      style={{ color: theme.textPrimary }}
                    >
                      Authorization Codes Management
                    </h6>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      if (actionLock) {
                        showToast.warning(
                          "Please wait until current action completes"
                        );
                        return;
                      }
                      setEditingCode(null);
                      setCodeForm({
                        code: "",
                        description: "",
                        expires_at: "",
                        is_active: true,
                      });
                      setShowCodeForm(true);
                    }}
                    disabled={isActionDisabled()}
                    style={{
                      background:
                        "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background =
                          "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)";
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background =
                          "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }
                    }}
                  >
                    <FaPlus className="me-1" />
                    Add Code
                  </button>
                </div>
              </div>
              <div className="card-body p-3">
                <div
                  className="alert alert-info mb-4"
                  style={{
                    backgroundColor: "rgba(31, 62, 109, 0.1)",
                    borderColor: "var(--primary-light)",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Note:</strong> Authorization codes are required for
                  sensitive operations. Only active, non-expired codes can be
                  used.
                </div>

                {loadingCodes ? (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                      <thead
                        style={{ backgroundColor: "var(--background-light)" }}
                      >
                        <tr>
                          <th
                            style={{ width: "5%" }}
                            className="text-center small fw-semibold"
                          >
                            #
                          </th>
                          <th
                            style={{ width: "15%" }}
                            className="text-center small fw-semibold"
                          >
                            Actions
                          </th>
                          <th
                            style={{ width: "20%" }}
                            className="small fw-semibold"
                          >
                            Code
                          </th>
                          <th
                            style={{ width: "25%" }}
                            className="small fw-semibold"
                          >
                            Description
                          </th>
                          <th
                            style={{ width: "10%" }}
                            className="small fw-semibold"
                          >
                            Status
                          </th>
                          <th
                            style={{ width: "20%" }}
                            className="small fw-semibold"
                          >
                            Expires At
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(5)].map((_, index) => (
                          <tr
                            key={index}
                            className="align-middle"
                            style={{ height: "70px" }}
                          >
                            <td className="text-center">
                              <div className="placeholder-wave">
                                <span
                                  className="placeholder col-4"
                                  style={{ height: "20px" }}
                                ></span>
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-1">
                                {[1, 2].map((item) => (
                                  <div
                                    key={item}
                                    className="placeholder action-placeholder"
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      borderRadius: "6px",
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className="placeholder-wave">
                                <span
                                  className="placeholder col-8"
                                  style={{ height: "16px" }}
                                ></span>
                              </div>
                            </td>
                            <td>
                              <div className="placeholder-wave">
                                <span
                                  className="placeholder col-10"
                                  style={{ height: "16px" }}
                                ></span>
                              </div>
                            </td>
                            <td>
                              <div className="placeholder-wave">
                                <span
                                  className="placeholder col-6"
                                  style={{
                                    height: "24px",
                                    borderRadius: "12px",
                                  }}
                                ></span>
                              </div>
                            </td>
                            <td>
                              <div className="placeholder-wave">
                                <span
                                  className="placeholder col-8"
                                  style={{ height: "16px" }}
                                ></span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-center py-4">
                      <div
                        className="spinner-border me-2"
                        style={{ color: "var(--primary-color)" }}
                        role="status"
                      ></div>
                      <span
                        className="small"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Loading authorization codes...
                      </span>
                    </div>
                  </div>
                ) : filteredCodes.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <i
                        className="fas fa-shield-alt fa-3x"
                        style={{ color: "var(--text-muted)", opacity: 0.5 }}
                      ></i>
                    </div>
                    <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                      No Authorization Codes
                    </h5>
                    <p
                      className="mb-3 small"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No authorization codes have been created yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead
                          style={{ backgroundColor: "var(--background-light)" }}
                        >
                          <tr>
                            <th
                              style={{ width: "5%" }}
                              className="text-center small fw-semibold"
                            >
                              #
                            </th>
                            <th
                              style={{ width: "15%" }}
                              className="text-center small fw-semibold"
                            >
                              Actions
                            </th>
                            <th
                              style={{ width: "20%" }}
                              className="small fw-semibold"
                            >
                              Code
                            </th>
                            <th
                              style={{ width: "25%" }}
                              className="small fw-semibold"
                            >
                              Description
                            </th>
                            <th
                              style={{ width: "10%" }}
                              className="small fw-semibold"
                            >
                              Status
                            </th>
                            <th
                              style={{ width: "20%" }}
                              className="small fw-semibold"
                            >
                              Expires At
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCodes
                            .slice(
                              (currentPage - 1) * itemsPerPage,
                              currentPage * itemsPerPage
                            )
                            .map((code, index) => {
                              const isExpired =
                                code.expires_at &&
                                new Date(code.expires_at) < new Date();
                              const isValid = code.is_active && !isExpired;
                              const startIndex =
                                (currentPage - 1) * itemsPerPage;
                              return (
                                <tr key={code.id} className="align-middle">
                                  <td
                                    className="text-center fw-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {startIndex + index + 1}
                                  </td>
                                  <td className="text-center">
                                    <div className="d-flex justify-content-center gap-1">
                                      <button
                                        className="btn btn-warning btn-sm text-white"
                                        onClick={() => handleEditCode(code)}
                                        disabled={isActionDisabled(code.id)}
                                        title="Edit Code"
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          borderRadius: "6px",
                                          transition: "all 0.2s ease-in-out",
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.transform =
                                              "translateY(-1px)";
                                            e.target.style.boxShadow =
                                              "0 4px 8px rgba(0,0,0,0.2)";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform =
                                            "translateY(0)";
                                          e.target.style.boxShadow = "none";
                                        }}
                                      >
                                        {actionLoading === code.id ? (
                                          <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                          ></span>
                                        ) : (
                                          <i className="fas fa-edit"></i>
                                        )}
                                      </button>

                                      <button
                                        className="btn btn-danger btn-sm text-white"
                                        onClick={() => handleDeleteCode(code)}
                                        disabled={isActionDisabled(code.id)}
                                        title="Delete Code"
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          borderRadius: "6px",
                                          transition: "all 0.2s ease-in-out",
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.transform =
                                              "translateY(-1px)";
                                            e.target.style.boxShadow =
                                              "0 4px 8px rgba(0,0,0,0.2)";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform =
                                            "translateY(0)";
                                          e.target.style.boxShadow = "none";
                                        }}
                                      >
                                        {actionLoading === code.id ? (
                                          <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                          ></span>
                                        ) : (
                                          <i className="fas fa-trash"></i>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <code
                                      className="bg-light px-2 py-1 rounded"
                                      style={{ fontSize: "0.875rem" }}
                                    >
                                      {code.code}
                                    </code>
                                  </td>
                                  <td>
                                    <div
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      {code.description || "N/A"}
                                    </div>
                                  </td>
                                  <td>
                                    {isValid ? (
                                      <span className="badge bg-success">
                                        <FaCheck className="me-1" />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="badge bg-danger">
                                        <FaTimes className="me-1" />
                                        {isExpired ? "Expired" : "Inactive"}
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <div
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      {code.expires_at
                                        ? new Date(
                                            code.expires_at
                                          ).toLocaleDateString()
                                        : "Never"}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {Math.ceil(filteredCodes.length / itemsPerPage) > 1 && (
                      <div className="card-footer bg-white border-top px-3 py-2">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                          <div className="text-center text-md-start">
                            <small style={{ color: "var(--text-muted)" }}>
                              Showing{" "}
                              <span
                                className="fw-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {(currentPage - 1) * itemsPerPage + 1}-
                                {Math.min(
                                  currentPage * itemsPerPage,
                                  filteredCodes.length
                                )}
                              </span>{" "}
                              of{" "}
                              <span
                                className="fw-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {filteredCodes.length}
                              </span>{" "}
                              authorization codes
                            </small>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <button
                              className="btn btn-sm pagination-btn"
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(prev - 1, 1))
                              }
                              disabled={currentPage === 1 || isActionDisabled()}
                            >
                              <i className="fas fa-chevron-left me-1"></i>
                              Previous
                            </button>

                            <div className="d-none d-md-flex gap-1">
                              {Array.from(
                                {
                                  length: Math.ceil(
                                    filteredCodes.length / itemsPerPage
                                  ),
                                },
                                (_, i) => i + 1
                              )
                                .filter((page) => {
                                  const totalPages = Math.ceil(
                                    filteredCodes.length / itemsPerPage
                                  );
                                  return (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 &&
                                      page <= currentPage + 1)
                                  );
                                })
                                .map((page, index, array) => {
                                  const totalPages = Math.ceil(
                                    filteredCodes.length / itemsPerPage
                                  );
                                  const prevPage = array[index - 1];
                                  const showEllipsis =
                                    prevPage && page - prevPage > 1;
                                  return (
                                    <React.Fragment key={page}>
                                      {showEllipsis && (
                                        <span className="px-2">...</span>
                                      )}
                                      <button
                                        className={`btn btn-sm pagination-page-btn ${
                                          currentPage === page ? "active" : ""
                                        }`}
                                        onClick={() => setCurrentPage(page)}
                                        disabled={isActionDisabled()}
                                      >
                                        {page}
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                            </div>

                            <div className="d-md-none">
                              <small style={{ color: "var(--text-muted)" }}>
                                Page {currentPage} of{" "}
                                {Math.ceil(filteredCodes.length / itemsPerPage)}
                              </small>
                            </div>

                            <button
                              className="btn btn-sm pagination-btn"
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(
                                    prev + 1,
                                    Math.ceil(
                                      filteredCodes.length / itemsPerPage
                                    )
                                  )
                                )
                              }
                              disabled={
                                currentPage ===
                                  Math.ceil(
                                    filteredCodes.length / itemsPerPage
                                  ) || isActionDisabled()
                              }
                            >
                              Next
                              <i className="fas fa-chevron-right ms-1"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Authorization Code Form Modal */}
      {showCodeForm && (
        <Portal>
          <div
            ref={modalRef}
            className={`modal fade show d-block modal-backdrop-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={handleBackdropClick}
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                ref={contentRef}
                className={`modal-content border-0 modal-content-animation ${
                  isClosing ? "exit" : ""
                }`}
                style={{
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  className="modal-header border-0 text-white modal-smooth"
                  style={{ backgroundColor: "#0c203f" }}
                >
                  <h5 className="modal-title fw-bold">
                    <i
                      className={`fas ${
                        editingCode ? "fa-edit" : "fa-plus"
                      } me-2`}
                    ></i>
                    {editingCode
                      ? "Edit Authorization Code"
                      : "Create Authorization Code"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    onClick={handleCloseModal}
                    aria-label="Close"
                    disabled={codeFormLoading}
                    style={{
                      transition: "all 0.2s ease",
                    }}
                  ></button>
                </div>

                {/* Body */}
                <div
                  className="modal-body modal-smooth"
                  style={{
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark mb-1">
                      Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control modal-smooth ${
                        !codeForm.code ? "is-invalid" : ""
                      }`}
                      value={codeForm.code}
                      onChange={(e) =>
                        setCodeForm({ ...codeForm, code: e.target.value })
                      }
                      placeholder="Enter authorization code"
                      disabled={codeFormLoading}
                      required
                      style={{ backgroundColor: "#ffffff" }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="form-control modal-smooth"
                      value={codeForm.description}
                      onChange={(e) =>
                        setCodeForm({
                          ...codeForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description"
                      disabled={codeFormLoading}
                      style={{ backgroundColor: "#ffffff" }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark mb-1">
                      Expires At (Optional)
                    </label>
                    <input
                      type="date"
                      className="form-control modal-smooth"
                      value={codeForm.expires_at}
                      onChange={(e) =>
                        setCodeForm({ ...codeForm, expires_at: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      disabled={codeFormLoading}
                      style={{ backgroundColor: "#ffffff" }}
                    />
                    <small className="form-text text-muted">
                      Leave empty for no expiration
                    </small>
                  </div>
                  {editingCode && (
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={codeForm.is_active}
                          onChange={(e) =>
                            setCodeForm({
                              ...codeForm,
                              is_active: e.target.checked,
                            })
                          }
                          disabled={codeFormLoading}
                          id="isActiveCheck"
                        />
                        <label
                          className="form-check-label small fw-semibold text-dark"
                          htmlFor="isActiveCheck"
                        >
                          Active
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="modal-footer border-0 modal-smooth"
                  style={{ backgroundColor: "#f8f9fa" }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-smooth"
                    onClick={handleCloseModal}
                    disabled={codeFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-smooth"
                    onClick={handleSaveCode}
                    disabled={!codeForm.code || codeFormLoading}
                    style={{
                      backgroundColor: "#0c203f",
                      borderColor: "#0c203f",
                    }}
                  >
                    {codeFormLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        {editingCode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <i
                          className={`fas ${
                            editingCode ? "fa-save" : "fa-plus"
                          } me-2`}
                        ></i>
                        {editingCode ? "Update" : "Create"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Input field focus states */
        .form-control:focus {
          border-color: var(--primary-light) !important;
          box-shadow: 0 0 0 0.2rem rgba(31, 62, 109, 0.25) !important;
        }

        /* Invalid input states */
        .form-control.is-invalid {
          border-color: #dc3545 !important;
          box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
        }
      `}</style>
    </div>
  );
};

export default Settings;
