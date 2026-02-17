import React from "react";

/**
 * Displays audit footprint: who added, last updated, (optionally) who deleted and when.
 * Use in view-detail modals and list rows for consistent audit trail display.
 *
 * @param {string} [createdBy] - Display name of user who created the record
 * @param {string} [createdAt] - ISO date string for creation
 * @param {string} [updatedBy] - Display name of user who last updated
 * @param {string} [updatedAt] - ISO date string for last update
 * @param {string} [deletedBy] - Display name of user who deleted (if soft-deleted)
 * @param {string} [deletedAt] - ISO date string for deletion
 * @param {boolean} [compact] - Smaller text and spacing
 * @param {string} [className] - Extra CSS class for container
 */
const Footprint = ({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  deletedBy,
  deletedAt,
  compact = false,
  className = "",
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: compact ? undefined : "2-digit",
      minute: compact ? undefined : "2-digit",
    });
  };

  const hasCreated = createdBy || createdAt;
  const hasUpdated = updatedBy || updatedAt;
  const hasDeleted = deletedBy || deletedAt;
  const hasAny = hasCreated || hasUpdated || hasDeleted;

  if (!hasAny) return null;

  const sizeClass = compact ? "small" : "";
  const labelClass = compact ? "opacity-75" : "text-muted";

  return (
    <div
      className={`footprint footprint-audit border-top pt-2 mt-2 footprint-responsive ${sizeClass} ${className}`.trim()}
      style={{
        borderColor: "var(--border-color, rgba(0,0,0,0.08))",
      }}
      aria-label="Record audit trail"
    >
      <div className="footprint-inner d-flex flex-wrap gap-2 gap-sm-3 gap-md-3 align-items-baseline">
        {hasCreated && (
          <span className="d-inline-flex flex-wrap align-items-center gap-1 footprint-item">
            <span className={labelClass}>
              {compact ? "Added:" : "Added by:"}
            </span>
            <span className="fw-medium footprint-value">
              {createdBy || "—"}
              {createdAt && (
                <span className="ms-1 opacity-75 footprint-date">
                  {compact
                    ? ` (${formatDate(createdAt)})`
                    : `on ${formatDate(createdAt)}`}
                </span>
              )}
            </span>
          </span>
        )}
        {hasUpdated &&
          (hasCreated ? (
            <span
              className="d-none d-sm-inline opacity-50 footprint-sep"
              aria-hidden
            >
              ·
            </span>
          ) : null)}
        {hasUpdated && (
          <span className="d-inline-flex flex-wrap align-items-center gap-1 footprint-item">
            <span className={labelClass}>
              {compact ? "Updated:" : "Last updated by:"}
            </span>
            <span className="fw-medium footprint-value">
              {updatedBy || "—"}
              {updatedAt && (
                <span className="ms-1 opacity-75 footprint-date">
                  {compact
                    ? ` (${formatDate(updatedAt)})`
                    : `on ${formatDate(updatedAt)}`}
                </span>
              )}
            </span>
          </span>
        )}
        {hasDeleted &&
          (hasCreated || hasUpdated ? (
            <span
              className="d-none d-sm-inline opacity-50 footprint-sep"
              aria-hidden
            >
              ·
            </span>
          ) : null)}
        {hasDeleted && (
          <span className="d-inline-flex flex-wrap align-items-center gap-1 footprint-item">
            <span className={labelClass}>
              {compact ? "Deleted:" : "Deleted by:"}
            </span>
            <span className="fw-medium text-danger footprint-value">
              {deletedBy || "—"}
              {deletedAt && (
                <span className="ms-1 opacity-75 footprint-date">
                  {compact
                    ? ` (${formatDate(deletedAt)})`
                    : `on ${formatDate(deletedAt)}`}
                </span>
              )}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

export default Footprint;
