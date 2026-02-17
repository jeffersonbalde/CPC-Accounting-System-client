import React, { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";
import Portal from "../../../components/Portal";

const CashBankTransactionViewModal = ({ transaction, account, onClose }) => {
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
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
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
                Transaction Details
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
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Account</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {account.account_code} - {account.account_name}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Transaction Date
                  </label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Entry Number</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    <code>{transaction.entry_number}</code>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Reference</label>
                  <div
                    className="form-control bg-white"
                    style={{ border: "1px solid var(--input-border)" }}
                  >
                    {transaction.reference || "—"}
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
                    {transaction.description || "—"}
                  </div>
                </div>
              </div>

              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom">
                  <strong className="text-primary">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Transaction Amounts
                  </strong>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="text-center p-3">
                        <div
                          className="text-xs fw-semibold text-uppercase mb-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Debit Amount
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{ color: "var(--danger-color)" }}
                        >
                          {transaction.debit > 0
                            ? formatCurrency(transaction.debit)
                            : "₱0.00"}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center p-3">
                        <div
                          className="text-xs fw-semibold text-uppercase mb-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Credit Amount
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{ color: "var(--success-color)" }}
                        >
                          {transaction.credit > 0
                            ? formatCurrency(transaction.credit)
                            : "₱0.00"}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center p-3">
                        <div
                          className="text-xs fw-semibold text-uppercase mb-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Running Balance
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{
                            color:
                              transaction.balance >= 0
                                ? "var(--success-color)"
                                : "var(--danger-color)",
                          }}
                        >
                          {formatCurrency(transaction.balance)}
                        </div>
                      </div>
                    </div>
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

export default CashBankTransactionViewModal;
