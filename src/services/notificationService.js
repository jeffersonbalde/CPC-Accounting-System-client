import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Simple SweetAlert wrapper – no custom body locking, no padding hacks.
// This matches the behavior from your other stable projects.
function swalFire(options) {
  return Swal.fire({
    ...options,
    scrollbarPadding: false, // avoid SweetAlert adding extra body padding
  });
}

// SweetAlert2 configurations with CPC Growth Strategies theme
export const showAlert = {
  // Success alert
  success: (title, text = "", timer = 3000) => {
    return swalFire({
      title,
      text,
      icon: "success",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: "#207AB9", // Primary color
      iconColor: "#207AB9",
    });
  },

  // Error alert
  error: (title, text = "", confirmButtonText = "Close", timer = null) => {
    return swalFire({
      title,
      text,
      icon: "error",
      timer: timer, // Set to null by default, or keep timer if provided
      timerProgressBar: !!timer,
      showConfirmButton: true,
      confirmButtonText,
      confirmButtonColor: "#207AB9",
      background: "#fff",
      color: "#171D5B", // Primary dark color
      iconColor: "#dc3545",
      width: "450px",
      maxWidth: "95vw",
      padding: "1rem",
      backdrop: true,
      allowOutsideClick: false, // Prevent closing by clicking outside
      allowEscapeKey: false, // Prevent closing by ESC key
    });
  },

  // Warning alert
  warning: (title, text = "", timer = 3000) => {
    return swalFire({
      title,
      text,
      icon: "warning",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: "#171D5B",
      iconColor: "#ffc107",
    });
  },

  // Info alert
  info: (
    title,
    htmlContent = "",
    confirmButtonText = "Close",
    timer = null
  ) => {
    return swalFire({
      title,
      html: htmlContent,
      icon: "info",
      timer: timer,
      timerProgressBar: !!timer,
      showConfirmButton: true,
      confirmButtonText,
      confirmButtonColor: "#207AB9",
      background: "#fff",
      color: "#171D5B",
      width: "450px",
      maxWidth: "95vw",
      padding: "1rem",
      backdrop: true,
    });
  },

  // Confirmation dialog
  confirm: (
    title,
    text = "",
    confirmButtonText = "Yes",
    cancelButtonText = "Cancel"
  ) => {
    return swalFire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#207AB9",
      cancelButtonColor: "#6c757d",
      confirmButtonText,
      cancelButtonText,
      background: "#fff",
      color: "#171D5B",
      iconColor: "#207AB9",
    });
  },

  // Loading alert
  loading: (title = "Loading...", text = "", options = {}) => {
    return swalFire({
      title,
      text,
      allowOutsideClick:
        options.allowOutsideClick !== undefined
          ? options.allowOutsideClick
          : false,
      allowEscapeKey:
        options.allowEscapeKey !== undefined ? options.allowEscapeKey : false,
      allowEnterKey:
        options.allowEnterKey !== undefined ? options.allowEnterKey : false,
      showConfirmButton:
        options.showConfirmButton !== undefined
          ? options.showConfirmButton
          : false,
      background: "#fff",
      color: "#171D5B",
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  processing: (
    title = "Processing Action",
    text = "Please wait while we complete this request..."
  ) => {
    return swalFire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      background: "#fff",
      color: "#171D5B",
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  // Close any open alert
  close: () => {
    Swal.close();
  },

  // Custom HTML alert for detailed content
  html: (
    title,
    htmlContent,
    confirmButtonText = "Close",
    cancelButtonText = "Cancel",
    width = 600,
    showCancel = false
  ) => {
    return swalFire({
      title,
      html: htmlContent,
      icon: "info",
      showConfirmButton: true,
      showCancelButton: showCancel,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: "#207AB9",
      cancelButtonColor: "#6c757d",
      background: "#fff",
      color: "#171D5B",
      iconColor: "#207AB9",
      width: `${width}px`,
      showCloseButton: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });
  },
};

// Toastify configurations with CPC Growth Strategies theme
export const showToast = {
  // Success toast
  success: (message, autoClose = 3000) => {
    toast.success(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f0f9ff",
        color: "#207AB9",
        border: "1px solid #b3d9f2",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#207AB9",
      },
    });
  },

  // Error toast
  error: (message, autoClose = 4000) => {
    toast.error(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fff5f5",
        color: "#dc3545",
        border: "1px solid #f8d7da",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#dc3545",
      },
    });
  },

  // Warning toast
  warning: (message, autoClose = 3000) => {
    toast.warn(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fffbf0",
        color: "#856404",
        border: "1px solid #ffeaa7",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#ffc107",
      },
    });
  },

  // Info toast
  info: (message, autoClose = 3000) => {
    toast.info(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f0f9ff",
        color: "#207AB9",
        border: "1px solid #b3d9f2",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#207AB9",
      },
    });
  },

  // Default toast
  default: (message, autoClose = 3000) => {
    toast(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f8f9fa",
        color: "#171D5B",
        border: "1px solid #e0e6e0",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#207AB9",
      },
    });
  },
};

// Export ToastContainer for use in App.jsx
export { ToastContainer } from "react-toastify";
