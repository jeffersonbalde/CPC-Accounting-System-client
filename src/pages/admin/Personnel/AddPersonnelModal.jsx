import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "../../../components/Portal";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Swal from "sweetalert2";

const DEFAULT_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  phone: "",
  password: "",
  password_confirmation: "",
  is_active: true,
  // All permissions selected by default when creating new personnel
  sidebar_access: [
    "dashboard",
    "journal_entries",
    "cash_bank",
    "clients_ar",
    "suppliers_ap",
    "income",
    "expenses",
    "reports",
  ],
};

/** Navigation & permissions options for personnel (keys must match Sidebar personnelMenuItems) */
const PERSONNEL_ACCESS_OPTIONS = [
  {
    section: "Core",
    description: "Primary navigation and overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "fas fa-tachometer-alt" },
    ],
  },
  {
    section: "Transactions",
    description: "Journal entries and cash & bank",
    items: [
      {
        key: "journal_entries",
        label: "Journal Entries",
        icon: "fas fa-file-invoice",
      },
      {
        key: "cash_bank",
        label: "Cash & Bank",
        icon: "fas fa-money-bill-wave",
      },
    ],
  },
  {
    section: "Receivables & Payables",
    description: "Clients, suppliers, invoices, and bills",
    items: [
      {
        key: "clients_ar",
        label: "Clients / AR",
        icon: "fas fa-user-tie",
      },
      {
        key: "suppliers_ap",
        label: "Suppliers / AP",
        icon: "fas fa-truck",
      },
    ],
  },
  {
    section: "Income & Expenses",
    description: "Income, revenue, and expense tracking",
    items: [
      {
        key: "income",
        label: "Income / Revenue",
        icon: "fas fa-arrow-up",
      },
      {
        key: "expenses",
        label: "Expenses",
        icon: "fas fa-arrow-down",
      },
    ],
  },
  {
    section: "Reports",
    description: "Financial reports",
    items: [
      {
        key: "reports",
        label: "Financial Reports",
        icon: "fas fa-chart-line",
      },
    ],
  },
];

/** Valid keys for API (used when building payload and normalizing legacy data) */
const VALID_SIDEBAR_KEYS = PERSONNEL_ACCESS_OPTIONS.flatMap((g) =>
  g.items.map((i) => i.key)
);

const AddPersonnelModal = ({ personnel, onClose, onSave }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingPersonnel, setExistingPersonnel] = useState([]);
  const [personnelLoading, setPersonnelLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });

  const isEdit = !!personnel;
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(DEFAULT_FORM);

  const formatContactPhone = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Limit to 11 digits
    const limited = digits.slice(0, 11);

    // Format as 0951-341-9336
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 7)}-${limited.slice(
        7
      )}`;
    }
  };

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[a-zA-Z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };

    setPasswordValidation(validation);

    // Return true only if all validations pass
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const validators = {
    username: (value) => {
      if (!value.trim()) return "Username is required";

      // Ensure existingPersonnel is an array before using .find()
      if (!Array.isArray(existingPersonnel)) {
        return "";
      }

      // Check for duplicate username (excluding current personnel in edit mode)
      const duplicate = existingPersonnel.find(
        (p) =>
          p.username.toLowerCase() === value.trim().toLowerCase() &&
          (!isEdit || p.id !== personnel?.id)
      );
      if (duplicate) {
        return "This username is already taken";
      }
      return "";
    },
    first_name: (value) => (value.trim() ? "" : "First name is required"),
    last_name: (value) => (value.trim() ? "" : "Last name is required"),
    phone: (value) => {
      if (!value) return "";
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) return "";
      if (digits.length !== 11) {
        return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
      }
      return "";
    },
    password: (value) => {
      if (!isEdit && !value) {
        return "Password is required";
      }
      if (value && value.length < 8) {
        return "Password must be at least 8 characters";
      }
      if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
        return "Password must include uppercase, lowercase, and a number";
      }
      // Real-time validation is handled by validatePassword function
      return "";
    },
    password_confirmation: (value) => {
      if (formData.password && value !== formData.password) {
        return "Passwords do not match";
      }
      return "";
    },
  };

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity) return "";

    if (entity.avatar_path) {
      // Ensure API base URL ends with /api
      const apiBase =
        (
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";

      let cleanFilename = entity.avatar_path;

      // Handle different path formats
      if (entity.avatar_path.includes("personnel-avatars/")) {
        cleanFilename = entity.avatar_path.replace("personnel-avatars/", "");
      } else if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }

      // Get just the filename
      cleanFilename = cleanFilename.split("/").pop();

      return `${apiBase}/personnel-avatar/${cleanFilename}`;
    }

    return "";
  }, []);

  const fetchExistingPersonnel = useCallback(async () => {
    setPersonnelLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/admin/personnel?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Handle different response structures
        const personnelList = Array.isArray(data.personnel)
          ? data.personnel
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setExistingPersonnel(personnelList);
      } else {
        throw new Error("Failed to load existing personnel");
      }
    } catch (error) {
      console.error(error);
      setExistingPersonnel([]);
    } finally {
      setPersonnelLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExistingPersonnel();
  }, [fetchExistingPersonnel]);

  const computeHasChanges = (currentForm, file, removed) => {
    const initial = initialStateRef.current;
    const accessEqual =
      Array.isArray(currentForm.sidebar_access) &&
      Array.isArray(initial.sidebar_access) &&
      currentForm.sidebar_access.length === initial.sidebar_access.length &&
      currentForm.sidebar_access.every((k) =>
        initial.sidebar_access.includes(k)
      );
    return (
      JSON.stringify({ ...currentForm, sidebar_access: null }) !==
        JSON.stringify({ ...initial, sidebar_access: null }) ||
      !accessEqual ||
      currentForm.password ||
      currentForm.password_confirmation ||
      file !== null ||
      removed
    );
  };

  const updateAvatarPreview = useCallback((source, isFile = false) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!source) {
      setAvatarPreview("");
      return;
    }

    if (isFile) {
      const url = URL.createObjectURL(source);
      previewUrlRef.current = url;
      setAvatarPreview(url);
    } else {
      setAvatarPreview(source);
    }
  }, []);

  useEffect(() => {
    if (personnel) {
      const existingAvatar = resolveAvatarUrl(personnel);
      console.log("Personnel object:", personnel);
      console.log("Avatar path:", personnel.avatar_path);
      console.log("Resolved avatar URL:", existingAvatar);
      const phoneValue = personnel.phone || "";
      const formattedPhone = phoneValue ? formatContactPhone(phoneValue) : "";

      // Use first_name and last_name directly, fallback to splitting name if needed (for backward compatibility)
      const firstName =
        personnel.first_name ||
        (personnel.name ? personnel.name.split(" ")[0] : "") ||
        "";
      const lastName =
        personnel.last_name ||
        (personnel.name ? personnel.name.split(" ").slice(1).join(" ") : "") ||
        "";

      let access = Array.isArray(personnel.sidebar_access)
        ? personnel.sidebar_access
        : ["dashboard", "journal_entries", "clients_ar", "reports"];
      // Normalize legacy key 'invoices' -> 'clients_ar' so form shows correct checkboxes
      access = access.map((k) => (k === "invoices" ? "clients_ar" : k));
      access = [...new Set(access)].filter((k) =>
        VALID_SIDEBAR_KEYS.includes(k)
      );
      const personnelFormState = {
        username: personnel.username || "",
        first_name: firstName,
        last_name: lastName,
        phone: formattedPhone,
        password: "",
        password_confirmation: "",
        is_active: personnel.is_active !== false, // Default to true if not explicitly false
        sidebar_access: access,
      };
      setFormData(personnelFormState);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
      initialStateRef.current = personnelFormState;
      setHasUnsavedChanges(false);
      // Reset password validation
      setPasswordValidation({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
      });
    } else {
      setFormData(DEFAULT_FORM);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview("");
      initialStateRef.current = DEFAULT_FORM;
      setHasUnsavedChanges(false);
      // Reset password validation
      setPasswordValidation({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [personnel, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      value = formatContactPhone(value);
    }

    // Handle password validation with real-time feedback
    if (name === "password") {
      validatePassword(value);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setHasUnsavedChanges(computeHasChanges(next, avatarFile, avatarRemoved));
      return next;
    });

    let errorMessage = "";
    if (name === "username") {
      if (!value.trim()) {
        errorMessage = "Username is required";
      } else {
        // Ensure existingPersonnel is an array before using .find()
        if (Array.isArray(existingPersonnel)) {
          const duplicate = existingPersonnel.find(
            (p) =>
              p.username.toLowerCase() === value.trim().toLowerCase() &&
              (!isEdit || p.id !== personnel?.id)
          );
          if (duplicate) {
            errorMessage = "This username is already taken";
          }
        }
      }
    } else if (validators[name]) {
      errorMessage = validators[name](value);
    }

    setErrors((prev) => ({ ...prev, [name]: errorMessage }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Only image files (PNG, JPG, GIF, SVG, WebP) are allowed",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Please upload an image no larger than 2MB",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: "" }));
    setAvatarRemoved(false);
    setAvatarFile(file);
    setHasUnsavedChanges(computeHasChanges(formData, file, false));
    updateAvatarPreview(file, true);
  };

  const handleAvatarClear = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setFormData((prev) => {
      const next = { ...prev };
      setHasUnsavedChanges(computeHasChanges(next, null, true));
      return next;
    });
    updateAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, avatar: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    const currentValidators = {
      username: (value) => {
        if (!value.trim()) return "Username is required";

        // Ensure existingPersonnel is an array before using .find()
        if (!Array.isArray(existingPersonnel)) {
          return "";
        }

        const duplicate = existingPersonnel.find(
          (p) =>
            p.username.toLowerCase() === value.trim().toLowerCase() &&
            (!isEdit || p.id !== personnel?.id)
        );
        if (duplicate) {
          return "This username is already taken";
        }
        return "";
      },
      first_name: (value) => (value.trim() ? "" : "First name is required"),
      last_name: (value) => (value.trim() ? "" : "Last name is required"),
      phone: (value) => {
        if (!value) return "";
        const digits = value.replace(/\D/g, "");
        if (digits.length === 0) return "";
        if (digits.length !== 11) {
          return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
        }
        return "";
      },
      password: (value) => {
        if (!isEdit && !value) {
          return "Password is required";
        }
        if (value) {
          // Use the passwordValidation state for real-time validation
          if (
            !passwordValidation.minLength ||
            !passwordValidation.hasLetter ||
            !passwordValidation.hasNumber
          ) {
            return "Password must meet all requirements";
          }
        }
        return "";
      },
      password_confirmation: (value) => {
        if (formData.password && value !== formData.password) {
          return "Passwords do not match";
        }
        return "";
      },
    };

    Object.entries(currentValidators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

    if (!formData.username || !formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!formData.last_name || !formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    const filteredErrors = {};
    Object.entries(newErrors).forEach(([field, message]) => {
      if (message && message.trim()) {
        filteredErrors[field] = message;
      }
    });

    setErrors(filteredErrors);

    if (Object.keys(filteredErrors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(filteredErrors)[0];
        const errorElement = document.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          errorElement.focus();
        }
      }, 100);
      return { isValid: false, errors: filteredErrors };
    }

    return { isValid: true, errors: {} };
  };

  const sidebarAccessForPayload = () =>
    Array.isArray(formData.sidebar_access)
      ? formData.sidebar_access.filter((k) => VALID_SIDEBAR_KEYS.includes(k))
      : [];

  /** JSON body for update when no file upload – ensures backend receives is_active and sidebar_access */
  const buildUpdateJsonPayload = () => {
    const payload = {
      username: formData.username,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone ? formData.phone.replace(/\D/g, "") : "",
      is_active: !!formData.is_active,
      sidebar_access: sidebarAccessForPayload(),
    };
    if (formData.password && formData.password.trim()) {
      payload.password = formData.password;
      payload.password_confirmation =
        formData.password_confirmation || formData.password;
    }
    if (avatarRemoved && !avatarFile) payload.remove_avatar = true;
    return payload;
  };

  const buildFormPayload = () => {
    const payload = new FormData();

    payload.append("first_name", formData.first_name.trim());
    payload.append("last_name", formData.last_name.trim());
    payload.append("username", formData.username);

    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      payload.append("phone", phoneDigits);
    }

    payload.append("is_active", formData.is_active ? "1" : "0");
    const sidebarAccess = sidebarAccessForPayload();
    payload.append("sidebar_access", JSON.stringify(sidebarAccess));

    if (formData.password && formData.password.trim()) {
      payload.append("password", formData.password);
      if (formData.password_confirmation) {
        payload.append("password_confirmation", formData.password_confirmation);
      }
    }

    if (avatarFile) payload.append("avatar", avatarFile);
    if (avatarRemoved && !avatarFile) payload.append("remove_avatar", "1");
    if (isEdit) payload.append("_method", "PATCH");
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (personnelLoading) {
      showAlert.error(
        "Please wait",
        "Data is still loading. Please wait before submitting."
      );
      return;
    }

    const validationResult = validateForm();
    if (!validationResult.isValid) {
      const fieldLabels = {
        username: "Username",
        first_name: "First Name",
        last_name: "Last Name",
        phone: "Contact Number",
        password: "Password",
        password_confirmation: "Confirm Password",
        avatar: "Avatar",
      };

      const errorList = Object.entries(validationResult.errors)
        .map(([field, message]) => {
          if (!message) return null;
          const fieldLabel = fieldLabels[field] || field;
          return `<li style="margin-bottom: 8px;"><strong>${fieldLabel}:</strong> ${message}</li>`;
        })
        .filter(Boolean)
        .join("");

      Swal.fire({
        title: "Validation Error",
        html: `
          <div style="text-align: left; color: #0E254B;">
            <p style="margin-bottom: 15px;">Please fix the following errors before submitting:</p>
            <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
              ${errorList}
            </ul>
          </div>
        `,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#0E254B",
        background: "#fff",
        color: "#0E254B",
        iconColor: "#dc3545",
        width: "500px",
      });

      const formElement = document.querySelector(".modal-body");
      if (formElement) {
        formElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const confirmation = await showAlert.confirm(
      isEdit ? "Update Personnel?" : "Create Personnel?",
      isEdit
        ? `Are you sure you want to update "${formData.first_name} ${formData.last_name}"? This will save all the changes you've made.`
        : `Are you sure you want to create a personnel account for "${formData.first_name} ${formData.last_name}"? Please verify all information is correct before proceeding.`,
      isEdit ? "Update Personnel" : "Create Personnel",
      "Cancel"
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      showAlert.loading(
        isEdit ? "Updating Personnel" : "Creating Personnel",
        "Please wait while we save the personnel information..."
      );

      // Use same API base as auth (login/user) so updates hit the same backend
      const apiBase =
        (
          import.meta.env.VITE_API_URL ||
          import.meta.env.VITE_LARAVEL_API ||
          "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";

      const url = isEdit
        ? `${apiBase}/admin/personnel/${personnel.id}`
        : `${apiBase}/admin/personnel`;

      let response;
      if (isEdit && !avatarFile && !avatarRemoved) {
        response = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildUpdateJsonPayload()),
        });
      } else {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: buildFormPayload(),
        });
      }

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showAlert.success(
          isEdit ? "Personnel Updated" : "Personnel Created",
          isEdit
            ? "Personnel information has been updated successfully."
            : "Personnel has been created successfully."
        );

        if (onSave) {
          onSave(data.personnel || data);
        }

        const refreshedAvatar = resolveAvatarUrl(data.personnel || data);
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        const saved = data.personnel || data;
        const normalizedPersonnel = {
          username: saved.username || "",
          first_name: saved.first_name ?? formData.first_name,
          last_name: saved.last_name ?? formData.last_name,
          phone: saved.phone ?? formData.phone ?? "",
          password: "",
          password_confirmation: "",
          is_active:
            saved.is_active !== undefined
              ? saved.is_active
              : formData.is_active,
          sidebar_access: Array.isArray(saved.sidebar_access)
            ? saved.sidebar_access
            : formData.sidebar_access || [
                "dashboard",
                "journal_entries",
                "clients_ar",
                "reports",
              ],
        };
        initialStateRef.current = normalizedPersonnel;
        setFormData(normalizedPersonnel);
        setHasUnsavedChanges(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        updateAvatarPreview(refreshedAvatar || "");
      } else {
        if (data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach((key) => {
            backendErrors[key] = Array.isArray(data.errors[key])
              ? data.errors[key][0]
              : data.errors[key];
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }

        const errorMessage =
          data.message || "Failed to save personnel information";
        showAlert.error("Error", errorMessage);
      }
    } catch (error) {
      showAlert.close();
      console.error("Form submission error:", error);
      showAlert.error(
        "Error",
        error.message ||
          "Failed to save personnel information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const performClose = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onClose();
  };

  const handleCloseAttempt = async () => {
    if (hasUnsavedChanges) {
      const confirmation = await showAlert.confirm(
        "Discard changes?",
        "You have unsaved changes. Close without saving?",
        "Discard",
        "Continue editing"
      );
      if (!confirmation.isConfirmed) {
        return;
      }
    }
    await performClose();
  };

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await handleCloseAttempt();
    }
  };

  const handleEscapeKey = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      await handleCloseAttempt();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <style>{`
      `}</style>
      <div
        ref={modalRef}
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        onClick={handleBackdropClick}
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div
            ref={contentRef}
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className={`fas ${isEdit ? "fa-edit" : "fa-plus"} me-2`}></i>
                {isEdit ? "Edit Personnel" : "Add New Personnel"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseAttempt}
                aria-label="Close"
                disabled={loading}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="container-fluid px-1">
                  <div className="row gy-4">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                          <div className="d-flex flex-column align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center mb-3"
                              style={{
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                border: "4px solid #e4e7ef",
                                backgroundColor: "#f4f6fb",
                                overflow: "hidden",
                              }}
                            >
                              {avatarPreview ? (
                                <img
                                  src={avatarPreview}
                                  alt="Personnel avatar preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Failed to load avatar:",
                                      avatarPreview
                                    );
                                    e.target.style.display = "none";
                                    setAvatarPreview("");
                                  }}
                                />
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-user fa-3x" />
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                              <label
                                htmlFor="personnel-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </label>
                              <input
                                id="personnel-avatar-input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={handleAvatarChange}
                                disabled={loading}
                              />
                              {avatarPreview && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={handleAvatarClear}
                                  disabled={loading}
                                >
                                  <i className="fas fa-trash me-2" />
                                  Remove Photo
                                </button>
                              )}
                            </div>
                            <small className="text-muted mt-2">
                              Recommended: square image up to 2MB (JPG, PNG,
                              GIF, SVG, WebP)
                            </small>
                            {errors.avatar && (
                              <div className="text-danger small mt-2">
                                {errors.avatar}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Username <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.username ? "is-invalid" : ""
                            }`}
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={loading || personnelLoading}
                            placeholder="Unique login username"
                          />
                          {errors.username && (
                            <div className="invalid-feedback">
                              {errors.username}
                            </div>
                          )}
                          {personnelLoading && (
                            <small className="text-muted">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Checking username availability...
                            </small>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.phone ? "is-invalid" : ""
                            }`}
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., 0951-341-9336"
                            maxLength={13}
                          />
                          {errors.phone && (
                            <div className="invalid-feedback">
                              {errors.phone}
                            </div>
                          )}
                          <small className="text-muted">
                            Enter 11 digits (e.g., 0951-341-9336)
                          </small>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            First Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.first_name ? "is-invalid" : ""
                            }`}
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Enter first name"
                          />
                          {errors.first_name && (
                            <div className="invalid-feedback">
                              {errors.first_name}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Last Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.last_name ? "is-invalid" : ""
                            }`}
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Enter last name"
                          />
                          {errors.last_name && (
                            <div className="invalid-feedback">
                              {errors.last_name}
                            </div>
                          )}
                        </div>

                        <div className="col-12">
                          <div className="card border-0 shadow-sm bg-white">
                            <div className="card-body p-3">
                              <div className="form-check form-switch d-flex align-items-center">
                                <input
                                  className="form-check-input me-3"
                                  type="checkbox"
                                  role="switch"
                                  id="is_active_switch"
                                  checked={formData.is_active}
                                  onChange={(e) => {
                                    setFormData((prev) => {
                                      const next = {
                                        ...prev,
                                        is_active: e.target.checked,
                                      };
                                      setHasUnsavedChanges(
                                        computeHasChanges(
                                          next,
                                          avatarFile,
                                          avatarRemoved
                                        )
                                      );
                                      return next;
                                    });
                                  }}
                                  disabled={loading}
                                  style={{
                                    width: "3rem",
                                    height: "1.5rem",
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                />
                                <label
                                  className="form-check-label fw-semibold mb-0"
                                  htmlFor="is_active_switch"
                                  style={{
                                    cursor: loading ? "not-allowed" : "pointer",
                                    color: formData.is_active
                                      ? "#28a745"
                                      : "#6c757d",
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  <i
                                    className={`fas me-2 ${
                                      formData.is_active
                                        ? "fa-user-check text-success"
                                        : "fa-user-slash text-secondary"
                                    }`}
                                  ></i>
                                  {formData.is_active
                                    ? "Active Personnel"
                                    : "Inactive Personnel"}
                                </label>
                              </div>
                              <small className="text-muted mt-2 d-block">
                                {formData.is_active
                                  ? "This personnel account is active and can access the system."
                                  : "This personnel account is inactive and cannot access the system."}
                              </small>
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <div
                            className="card border-0 shadow-sm"
                            style={{
                              borderLeft: "4px solid #0E254B",
                              backgroundColor: "#fafbfc",
                            }}
                          >
                            <div
                              className="card-header py-3 border-0 d-flex align-items-center"
                              style={{
                                backgroundColor: "rgba(14, 37, 75, 0.06)",
                              }}
                            >
                              <i
                                className="fas fa-shield-alt me-2"
                                style={{ color: "#0E254B", fontSize: "1.1rem" }}
                              />
                              <h6
                                className="mb-0 fw-semibold"
                                style={{ color: "#0E254B" }}
                              >
                                Navigation &amp; Permissions
                              </h6>
                            </div>
                            <div className="card-body pt-3 pb-4">
                              <p className="text-muted small mb-3">
                                Choose which menu sections and functions this
                                personnel can see and use. Only selected items
                                will appear in their sidebar.
                              </p>
                              {PERSONNEL_ACCESS_OPTIONS.map((group) => {
                                const selectedInGroup = (
                                  formData.sidebar_access || []
                                ).filter((k) =>
                                  group.items.some((it) => it.key === k)
                                ).length;
                                const allSelected =
                                  selectedInGroup === group.items.length;
                                return (
                                  <div
                                    key={group.section}
                                    className="mb-4 pb-3 border-bottom border-light"
                                    style={{
                                      borderBottomColor:
                                        "rgba(0,0,0,0.06) !important",
                                    }}
                                  >
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <span className="fw-semibold text-dark small text-uppercase tracking-wide">
                                        {group.section}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-link btn-sm p-0 text-decoration-none"
                                        style={{
                                          fontSize: "0.8rem",
                                          color: "#0E254B",
                                        }}
                                        onClick={() => {
                                          setFormData((prev) => {
                                            const next = { ...prev };
                                            const current =
                                              next.sidebar_access || [];
                                            const keys = group.items.map(
                                              (it) => it.key
                                            );
                                            const nextAccess = allSelected
                                              ? current.filter(
                                                  (k) => !keys.includes(k)
                                                )
                                              : [
                                                  ...new Set([
                                                    ...current,
                                                    ...keys,
                                                  ]),
                                                ];
                                            next.sidebar_access = nextAccess;
                                            setHasUnsavedChanges(
                                              computeHasChanges(
                                                next,
                                                avatarFile,
                                                avatarRemoved
                                              )
                                            );
                                            return next;
                                          });
                                        }}
                                        disabled={loading}
                                      >
                                        {allSelected
                                          ? "Deselect all"
                                          : "Select all"}
                                      </button>
                                    </div>
                                    <p
                                      className="text-muted small mb-2"
                                      style={{ fontSize: "0.8rem" }}
                                    >
                                      {group.description}
                                    </p>
                                    <div className="d-flex flex-wrap gap-3">
                                      {group.items.map((item) => {
                                        const checked = (
                                          formData.sidebar_access || []
                                        ).includes(item.key);
                                        return (
                                          <label
                                            key={item.key}
                                            className="d-flex align-items-center gap-2 mb-0 cursor-pointer"
                                            style={{
                                              cursor: loading
                                                ? "not-allowed"
                                                : "pointer",
                                              opacity: loading ? 0.7 : 1,
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              className="form-check-input"
                                              checked={checked}
                                              onChange={(e) => {
                                                setFormData((prev) => {
                                                  const next = { ...prev };
                                                  const current =
                                                    next.sidebar_access || [];
                                                  const nextAccess = e.target
                                                    .checked
                                                    ? [...current, item.key]
                                                    : current.filter(
                                                        (k) => k !== item.key
                                                      );
                                                  next.sidebar_access =
                                                    nextAccess;
                                                  setHasUnsavedChanges(
                                                    computeHasChanges(
                                                      next,
                                                      avatarFile,
                                                      avatarRemoved
                                                    )
                                                  );
                                                  return next;
                                                });
                                              }}
                                              disabled={loading}
                                            />
                                            <i
                                              className={item.icon}
                                              style={{
                                                color: "#6c757d",
                                                width: "1rem",
                                              }}
                                            />
                                            <span className="small text-dark">
                                              {item.label}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="card border-warning bg-white">
                            <div className="card-header bg-warning bg-opacity-10">
                              <h6 className="mb-0 text-warning">
                                <i className="fas fa-key me-2"></i>
                                {isEdit
                                  ? "Update Password (Optional)"
                                  : "Password Information"}
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="mb-2 position-relative">
                                    <label
                                      className="form-label"
                                      style={{
                                        fontSize: "0.9rem",
                                        color: "#333",
                                        fontWeight: 500,
                                        marginBottom: "0.5rem",
                                      }}
                                    >
                                      Password {isEdit ? "" : "*"}
                                    </label>
                                    <div className="position-relative">
                                      <input
                                        type={
                                          showPassword ? "text" : "password"
                                        }
                                        className={`form-control ${
                                          formData.password &&
                                          passwordValidation.minLength &&
                                          passwordValidation.hasLetter &&
                                          passwordValidation.hasNumber
                                            ? "is-valid"
                                            : formData.password &&
                                              !(
                                                passwordValidation.minLength &&
                                                passwordValidation.hasLetter &&
                                                passwordValidation.hasNumber
                                              )
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        placeholder={
                                          isEdit
                                            ? "Leave blank to keep current password"
                                            : "••••••••"
                                        }
                                        value={formData.password}
                                        onChange={handleChange}
                                        name="password"
                                        disabled={loading}
                                        style={{
                                          fontSize: "0.95rem",
                                          paddingRight:
                                            formData.password &&
                                            passwordValidation.minLength &&
                                            passwordValidation.hasLetter &&
                                            passwordValidation.hasNumber
                                              ? "70px"
                                              : formData.password &&
                                                !(
                                                  passwordValidation.minLength &&
                                                  passwordValidation.hasLetter &&
                                                  passwordValidation.hasNumber
                                                )
                                              ? "70px"
                                              : "40px",
                                        }}
                                        required={!isEdit}
                                      />
                                      <button
                                        type="button"
                                        className="btn p-0 position-absolute"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowPassword(!showPassword);
                                        }}
                                        style={{
                                          right:
                                            formData.password &&
                                            passwordValidation.minLength &&
                                            passwordValidation.hasLetter &&
                                            passwordValidation.hasNumber
                                              ? "38px"
                                              : formData.password &&
                                                !(
                                                  passwordValidation.minLength &&
                                                  passwordValidation.hasLetter &&
                                                  passwordValidation.hasNumber
                                                )
                                              ? "38px"
                                              : "8px",
                                          top: "0",
                                          bottom: "0",
                                          height: "auto",
                                          width: "32px",
                                          border: "none",
                                          backgroundColor: "transparent",
                                          color: "#666",
                                          cursor: "pointer",
                                          transition: "all 0.2s ease",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          padding: 0,
                                          margin: 0,
                                          zIndex: 10,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.color = "#000";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.color = "#666";
                                        }}
                                      >
                                        {showPassword ? (
                                          <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                          >
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle
                                              cx="12"
                                              cy="12"
                                              r="3"
                                            ></circle>
                                          </svg>
                                        ) : (
                                          <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                          >
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line
                                              x1="1"
                                              y1="1"
                                              x2="23"
                                              y2="23"
                                            ></line>
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                    {/* Password validation criteria */}
                                    <AnimatePresence>
                                      {formData.password && (
                                        <motion.div
                                          key="validation-criteria"
                                          initial={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                          }}
                                          animate={{
                                            opacity: 1,
                                            y: 0,
                                            height: "auto",
                                          }}
                                          exit={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                          }}
                                          transition={{
                                            duration: 0.3,
                                            ease: "easeOut",
                                          }}
                                          style={{
                                            marginTop: "0.5rem",
                                            fontSize: "0.85rem",
                                            overflow: "hidden",
                                          }}
                                        >
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.05,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color:
                                                passwordValidation.minLength
                                                  ? "#28a745"
                                                  : "#dc3545",
                                              marginBottom: "0.25rem",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            8 characters minimum
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.1,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color:
                                                passwordValidation.hasLetter
                                                  ? "#28a745"
                                                  : "#dc3545",
                                              marginBottom: "0.25rem",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            At least one letter
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.15,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color:
                                                passwordValidation.hasNumber
                                                  ? "#28a745"
                                                  : "#dc3545",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            At least one number
                                          </motion.div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                    {errors.password && !formData.password && (
                                      <div className="invalid-feedback d-block">
                                        {errors.password}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  <div className="mb-3 position-relative">
                                    <label className="form-label small fw-semibold text-dark mb-1">
                                      Confirm Password
                                    </label>
                                    <div className="input-group">
                                      <span
                                        className={`input-group-text bg-white border-end-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <i className="fas fa-lock"></i>
                                      </span>
                                      <input
                                        type={
                                          showConfirmPassword
                                            ? "text"
                                            : "password"
                                        }
                                        className={`form-control border-start-0 ps-2 ${
                                          errors.password_confirmation
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        disabled={loading}
                                        placeholder="Confirm password"
                                      />
                                      <span
                                        className={`input-group-text bg-white border-start-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="btn btn-sm p-0 border-0 bg-transparent text-muted"
                                          onClick={() =>
                                            setShowConfirmPassword(
                                              !showConfirmPassword
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          <i
                                            className={`fas ${
                                              showConfirmPassword
                                                ? "fa-eye-slash"
                                                : "fa-eye"
                                            }`}
                                          ></i>
                                        </button>
                                      </span>
                                    </div>
                                    {errors.password_confirmation && (
                                      <div className="invalid-feedback d-block">
                                        {errors.password_confirmation}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleCloseAttempt}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{
                    backgroundColor: "#0E254B",
                    borderColor: "#0E254B",
                  }}
                  disabled={loading || personnelLoading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Update Personnel" : "Create Personnel"}
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

export default AddPersonnelModal;
