// components/admin/Accounting/JournalEntryViewModal.jsx
import React, { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";
import Portal from "../../../components/Portal";

const JournalEntryViewModal = ({ entry, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

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
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "auto";
    };
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
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Entry Number</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {entry.entry_number}
                  </div>
                </div>
                <div className="col-md-8">
                  <label className="form-label fw-semibold">Entry Date</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {formatDate(entry.entry_date)}
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <label className="form-label fw-semibold">Description</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {entry.description}
                  </div>
                </div>
              </div>
              {entry.reference_number && (
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      Reference Number
                    </label>
                    <div
                      className="form-control bg-white"
                      style={{ border: "1px solid var(--input-border)" }}
                    >
                      {entry.reference_number}
                    </div>
                  </div>
                </div>
              )}

              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom">
                  <strong className="text-primary">
                    <i className="fas fa-list me-2"></i>
                    Journal Entry Lines
                  </strong>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "30%" }}>Account</th>
                          <th style={{ width: "20%" }} className="text-end">
                            Debit Amount
                          </th>
                          <th style={{ width: "20%" }} className="text-end">
                            Credit Amount
                          </th>
                          <th style={{ width: "30%" }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines?.map((line, index) => (
                          <tr key={index}>
                            <td>
                              <div
                                className="fw-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {line.account?.account_code} -{" "}
                                {line.account?.account_name}
                              </div>
                            </td>
                            <td className="text-end">
                              {line.debit_amount > 0 ? (
                                <span className="text-danger fw-semibold">
                                  {formatCurrency(line.debit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-end">
                              {line.credit_amount > 0 ? (
                                <span className="text-success fw-semibold">
                                  {formatCurrency(line.credit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <span className="text-muted small">
                                {line.description || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <td>
                            <strong>Totals:</strong>
                          </td>
                          <td className="text-end">
                            <strong className="text-danger">
                              {formatCurrency(entry.total_debit)}
                            </strong>
                          </td>
                          <td className="text-end">
                            <strong className="text-success">
                              {formatCurrency(entry.total_credit)}
                            </strong>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
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

