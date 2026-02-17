import React, { useState, useEffect } from "react";
import Portal from "../../../components/Portal";

const ActivityLogDetailsModal = ({
  log,
  onClose,
  getActionBadgeConfig = () => ({
    label: "—",
    badgeClass: "bg-secondary",
    icon: "fa-circle",
  }),
  getSubjectTypeLabel = (v) => v || "—",
  getSubjectTypeDescription = (subjectType, action) => action || "—",
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "N/A", time: "", full: "N/A" };
    try {
      const date = new Date(dateStr);
      const dateFormatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeFormatted = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return {
        date: dateFormatted,
        time: timeFormatted,
        full: `${dateFormatted} at ${timeFormatted}`,
      };
    } catch {
      return { date: "N/A", time: "", full: "N/A" };
    }
  };

  if (!log) return null;

  const { date, time, full } = formatDateTime(log.created_at);

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
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            {/* Header */}
            <div
              className="modal-header border-0 text-white modal-smooth"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-clipboard-list me-2" />
                Activity Log Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white btn-smooth"
                onClick={closeModal}
                aria-label="Close"
              />
            </div>

            <div
              className="modal-body bg-light modal-smooth"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              {/* Summary Card */}
              <div className="card border-0 bg-white mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-auto">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: "#0E254B",
                          fontSize: "20px",
                        }}
                      >
                        <i className="fas fa-history" />
                      </div>
                    </div>
                    <div className="col">
                      <h5 className="mb-1 text-dark">
                        <span
                          className={`badge ${
                            getActionBadgeConfig(log.action).badgeClass
                          } fs-6`}
                        >
                          <i
                            className={`fas ${
                              getActionBadgeConfig(log.action).icon
                            } me-1`}
                            aria-hidden
                          />
                          {getActionBadgeConfig(log.action).label}
                        </span>
                      </h5>
                      <p className="text-muted mb-0 small">{full}</p>
                      <p className="text-dark mb-2 small fw-semibold">
                        {getSubjectTypeDescription(
                          log.subject_type,
                          log.action
                        )}
                      </p>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {log.user_name && (
                          <span className="badge bg-light text-dark border">
                            {log.user_name}
                          </span>
                        )}
                        {log.subject_type && (
                          <span className="badge bg-info">
                            {getSubjectTypeLabel(log.subject_type)}
                            {log.subject_id != null &&
                              ` · Ref #${log.subject_id}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {/* Activity Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-bolt me-2 text-primary" />
                        Change Details
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Action
                        </label>
                        <p className="mb-0">
                          <span
                            className={`badge ${
                              getActionBadgeConfig(log.action).badgeClass
                            }`}
                          >
                            <i
                              className={`fas ${
                                getActionBadgeConfig(log.action).icon
                              } me-1`}
                              aria-hidden
                            />
                            {getActionBadgeConfig(log.action).label}
                          </span>
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Record Type
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {getSubjectTypeLabel(log.subject_type)}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Record Reference #
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {log.subject_id != null ? log.subject_id : "—"}
                        </p>
                      </div>
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Notes
                        </label>
                        <p className="mb-0 fw-semibold text-dark text-break">
                          {log.remarks || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-user me-2 text-success" />
                        Performed By
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Personnel Name
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {log.user_name || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Personnel Reference #
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {log.user_id != null ? log.user_id : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamp & Source (audit) */}
                <div className="col-12">
                  <div className="card border-0 bg-white">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-clock me-2 text-info" />
                        Timestamp & Source
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Date & Time
                          </label>
                          <p className="mb-0 fw-semibold text-dark">{full}</p>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            IP Address
                          </label>
                          <p className="mb-0 fw-semibold text-dark font-monospace">
                            {log.ip_address || "—"}
                          </p>
                        </div>
                        {log.id != null && (
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Activity Log Reference #
                            </label>
                            <p className="mb-0 fw-semibold text-dark">
                              #{log.id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 bg-light">
              <button
                type="button"
                className="btn btn-primary"
                onClick={closeModal}
                style={{
                  borderWidth: "2px",
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-times me-1" />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ActivityLogDetailsModal;
