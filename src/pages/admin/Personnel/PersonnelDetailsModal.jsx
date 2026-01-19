import React, { useState, useEffect, useCallback } from "react";
import Portal from "../../../components/Portal";

const PersonnelDetailsModal = ({ personnel, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const getPersonnelAvatarUrl = useCallback((entity) => {
    if (!entity) return null;
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = entity.avatar_path;
      if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }
      if (entity.avatar_path.includes("personnel-avatars/")) {
        cleanFilename = entity.avatar_path.replace("personnel-avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/personnel-avatar/${cleanFilename}`;
    }
    return null;
  }, []);

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0) : "";
    const last = lastName ? lastName.charAt(0) : "";
    return (first + last).toUpperCase() || "P";
  };

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await closeModal();
    }
  };

  const handleEscapeKey = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      await closeModal();
    }
  };

  React.useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const closeModal = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusInfo = (isActive) => {
    if (isActive !== false) {
      return { label: "Active", color: "success", icon: "fa-check-circle" };
    }
    return { label: "Inactive", color: "danger", icon: "fa-times-circle" };
  };

  if (!personnel) return null;

  const statusInfo = getStatusInfo(personnel.is_active);

  const PersonnelAvatar = React.memo(() => {
    const [imageError, setImageError] = useState(false);
    const avatarUrl = personnel?.avatar_path
      ? getPersonnelAvatarUrl(personnel)
      : null;

    // Reset error state when avatar_path changes
    React.useEffect(() => {
      setImageError(false);
    }, [personnel?.avatar_path]);

    // Debug logging
    React.useEffect(() => {
      console.log("PersonnelDetailsModal - Personnel object:", personnel);
      console.log(
        "PersonnelDetailsModal - Avatar path:",
        personnel?.avatar_path
      );
      console.log("PersonnelDetailsModal - Avatar URL:", avatarUrl);
    }, [personnel, avatarUrl]);

    // If no avatar_path or image failed to load, show initials
    if (!personnel?.avatar_path || !avatarUrl || imageError) {
      return (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{
            width: "80px",
            height: "80px",
            backgroundColor: "#0E254B",
            fontSize: "24px",
          }}
        >
          {getInitials(personnel?.first_name, personnel?.last_name)}
        </div>
      );
    }

    // Try to load the avatar image
    return (
      <div
        className="rounded-circle overflow-hidden border"
        style={{
          width: "80px",
          height: "80px",
          borderColor: "#e1e6ef",
          backgroundColor: "#f4f6fb",
        }}
      >
        <img
          src={avatarUrl}
          alt={`${personnel?.first_name || "Personnel"}'s avatar`}
          className="rounded-circle border"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onError={(e) => {
            console.error(
              "PersonnelDetailsModal - Failed to load avatar:",
              avatarUrl
            );
            console.error(
              "PersonnelDetailsModal - Personnel avatar_path:",
              personnel?.avatar_path
            );
            setImageError(true);
          }}
          onLoad={() => {
            console.log(
              "PersonnelDetailsModal - Avatar loaded successfully:",
              avatarUrl
            );
          }}
        />
      </div>
    );
  });

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header */}
            <div
              className="modal-header border-0 text-white modal-smooth"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-user me-2"></i>
                Personnel Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white btn-smooth"
                onClick={closeModal}
                aria-label="Close"
              ></button>
            </div>

            <div
              className="modal-body bg-light modal-smooth"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              {/* Personnel Summary Card */}
              <div className="card border-0 bg-white mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-auto">
                      <PersonnelAvatar />
                    </div>
                    <div className="col">
                      <h4 className="mb-1 text-dark">
                        {personnel.first_name} {personnel.last_name}
                      </h4>
                      <p className="text-muted mb-2">@{personnel.username}</p>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <span className={`badge bg-${statusInfo.color} fs-6`}>
                          <i className={`fas ${statusInfo.icon} me-1`}></i>
                          {statusInfo.label}
                        </span>
                        <span className="badge bg-light text-dark border fs-6">
                          <i className="fas fa-at me-1 text-primary"></i>
                          {personnel.username}
                        </span>
                        <span className="badge bg-info fs-6">
                          <i className="fas fa-user-tie me-1"></i>
                          Personnel
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {/* Basic Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-info-circle me-2 text-primary"></i>
                        Basic Information
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Username
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          @{personnel.username}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          First Name
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {personnel.first_name || "N/A"}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Last Name
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {personnel.last_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Contact Number
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {personnel.phone || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Account Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-user-shield me-2 text-success"></i>
                        Contact & Account Information
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Contact Number
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {personnel.phone || "Not provided"}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Account Status
                        </label>
                        <div>
                          <span className={`badge bg-${statusInfo.color}`}>
                            <i className={`fas ${statusInfo.icon} me-1`}></i>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Role
                        </label>
                        <div>
                          <span className="badge bg-info">
                            <i className="fas fa-user-tie me-1"></i>
                            Personnel
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Timeline */}
                <div className="col-12">
                  <div className="card border-0 bg-white">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-history me-2 text-info"></i>
                        Account Timeline
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Registration Date
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {formatDate(personnel.created_at)}
                          </p>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Last Updated
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {formatDate(personnel.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-top bg-white modal-smooth">
              <button
                type="button"
                className="btn btn-outline-secondary btn-smooth"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PersonnelDetailsModal;
