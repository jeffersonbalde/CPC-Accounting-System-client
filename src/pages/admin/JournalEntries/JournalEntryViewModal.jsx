// components/admin/Accounting/JournalEntryViewModal.jsx
import React, { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";
import Portal from "../../../components/Portal";
import Footprint from "../../../components/Footprint";

const JournalEntryViewModal = ({ entry, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const totalDebit = Number(entry?.total_debit || 0);
  const totalCredit = Number(entry?.total_credit || 0);
  const isBalanced = totalDebit === totalCredit;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <style>{`
        /* Modal Backdrop Animation */
        @keyframes modalBackdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalBackdropFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        /* Modal Content Animation */
        @keyframes modalContentSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes modalContentSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
        }

        /* Modal Classes */
        .modal-backdrop-animation {
          animation: modalBackdropFadeIn 0.3s ease-out forwards;
        }

        .modal-backdrop-animation.exit {
          animation: modalBackdropFadeOut 0.2s ease-in forwards;
        }

        .modal-content-animation {
          animation: modalContentSlideIn 0.3s ease-out forwards;
        }

        .modal-content-animation.exit {
          animation: modalContentSlideOut 0.2s ease-in forwards;
        }

        /* Overview cards */
        .je-overview-card {
          border-radius: 0.75rem;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .je-overview-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 0.15rem;
        }

        .je-overview-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .je-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          background-color: rgba(0,0,0,0.02);
          color: var(--text-muted);
        }

        .je-pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .je-pill-dot.success {
          background-color: var(--success-color);
        }

        .je-pill-dot.danger {
          background-color: var(--danger-color);
        }

        .je-table-header {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .je-account {
          font-size: 0.9rem;
        }

        .je-account-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        @media (max-width: 767.98px) {
          .je-overview-stack > [class*="col-"] {
            margin-bottom: 0.75rem;
          }

          .je-overview-stack > [class*="col-"]:last-child {
            margin-bottom: 0;
          }
        }
      `}</style>
      <div
        className={`modal fade show d-block ${
          isClosing
            ? "modal-backdrop-animation exit"
            : "modal-backdrop-animation"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <FaEye className="me-2" />
                Journal Entry Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div
              className="modal-body bg-light"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              {/* Overview section */}
              <div className="row g-3 mb-3 je-overview-stack">
                <div className="col-md-6">
                  <div className="card je-overview-card shadow-sm bg-white h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="je-overview-label">Entry Number</div>
                          <div className="je-overview-value">
                            <code>{entry.entry_number}</code>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="je-overview-label">Entry Date</div>
                          <div className="je-overview-value">
                            {formatDate(entry.entry_date)}
                          </div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="je-overview-label">Description</div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.9rem" }}
                        >
                          {entry.description || "—"}
                        </div>
                      </div>
                      {entry.reference_number && (
                        <div>
                          <div className="je-overview-label">Reference</div>
                          <div style={{ fontSize: "0.9rem" }}>
                            {entry.reference_number}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card je-overview-card shadow-sm bg-white h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="je-overview-label mb-0">
                          Entry Totals
                        </div>
                        <span className="je-pill">
                          <span
                            className={`je-pill-dot ${
                              isBalanced ? "success" : "danger"
                            }`}
                          ></span>
                          {isBalanced ? "Balanced" : "Not Balanced"}
                        </span>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="text-xs fw-semibold text-uppercase mb-1">
                            Debit
                          </div>
                          <div
                            className="h5 mb-0 fw-bold"
                            style={{ color: "var(--danger-color)" }}
                          >
                            {formatCurrency(totalDebit)}
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-xs fw-semibold text-uppercase mb-1">
                            Credit
                          </div>
                          <div
                            className="h5 mb-0 fw-bold"
                            style={{ color: "var(--success-color)" }}
                          >
                            {formatCurrency(totalCredit)}
                          </div>
                        </div>
                      </div>
                      {!isBalanced && (
                        <div className="mt-3 small">
                          <span className="text-muted me-1">Difference:</span>
                          <span className="fw-bold text-danger">
                            {formatCurrency(Math.abs(totalDebit - totalCredit))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lines section */}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom">
                  <strong className="text-primary">
                    <i className="fas fa-list me-2"></i>
                    Journal Entry Lines
                  </strong>
                  <span className="text-muted small">
                    {entry.lines?.length || 0} line
                    {entry.lines && entry.lines.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr className="je-table-header">
                          <th style={{ width: "34%" }}>Account</th>
                          <th style={{ width: "18%" }} className="text-end">
                            Debit
                          </th>
                          <th style={{ width: "18%" }} className="text-end">
                            Credit
                          </th>
                          <th style={{ width: "30%" }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines?.map((line, index) => (
                          <tr key={index}>
                            <td>
                              <div className="je-account fw-semibold">
                                {line.account?.account_code}{" "}
                                <span className="je-account-sub">
                                  · {line.account?.account_name}
                                </span>
                              </div>
                            </td>
                            <td className="text-end">
                              {line.debit_amount > 0 ? (
                                <span className="text-danger fw-semibold">
                                  {formatCurrency(line.debit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-end">
                              {line.credit_amount > 0 ? (
                                <span className="text-success fw-semibold">
                                  {formatCurrency(line.credit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <span className="text-muted small">
                                {line.description || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!entry.lines?.length && (
                          <tr>
                            <td
                              colSpan="4"
                              className="text-center text-muted py-3"
                            >
                              No lines available for this journal entry.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <td>
                            <strong>Totals</strong>
                          </td>
                          <td className="text-end">
                            <strong className="text-danger">
                              {formatCurrency(totalDebit)}
                            </strong>
                          </td>
                          <td className="text-end">
                            <strong className="text-success">
                              {formatCurrency(totalCredit)}
                            </strong>
                          </td>
                          <td className="text-end">
                            {isBalanced ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check-circle me-1"></i>
                                Balanced
                              </span>
                            ) : (
                              <span className="badge bg-danger">
                                <i className="fas fa-exclamation-triangle me-1"></i>
                                Not Balanced
                              </span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <Footprint
                createdBy={entry?.created_by_name}
                createdAt={entry?.created_at}
                updatedBy={entry?.updated_by_name}
                updatedAt={entry?.updated_at}
              />
            </div>
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-primary text-white fw-semibold"
                onClick={handleClose}
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

export default JournalEntryViewModal;
