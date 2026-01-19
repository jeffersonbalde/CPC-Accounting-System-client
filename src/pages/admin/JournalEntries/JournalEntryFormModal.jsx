// components/admin/Accounting/JournalEntryFormModal.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaFileInvoice, FaPlus, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import Portal from "../../../components/Portal";
import { showAlert } from "../../../services/notificationService";

const JournalEntryFormModal = ({
  formData,
  setFormData,
  accounts,
  formErrors,
  totalDebit,
  totalCredit,
  isBalanced,
  submitting,
  editingEntry,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onSubmit,
  onClose,
}) => {
  const formRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialFormState = useRef(null);
  const [newlyAddedRows, setNewlyAddedRows] = useState(new Set());
  const [removingRows, setRemovingRows] = useState(new Set());

  // Store initial form state when modal opens (only once)
  useEffect(() => {
    if (initialFormState.current === null) {
      initialFormState.current = JSON.parse(JSON.stringify(formData));
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once when component mounts

  // Check if form has changes
  const checkFormChanges = useCallback((currentForm) => {
    if (!initialFormState.current) return false;
    return JSON.stringify(currentForm) !== JSON.stringify(initialFormState.current);
  }, []);

  // Track form changes
  useEffect(() => {
    if (initialFormState.current) {
      const hasChanges = checkFormChanges(formData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, checkFormChanges]);

  const handleCloseAttempt = useCallback(async () => {
    if (submitting) return;

    if (hasUnsavedChanges) {
      const result = await showAlert.confirm(
        "Unsaved Changes",
        "You have unsaved journal entry data. Are you sure you want to close without saving?",
        "Yes, Close",
        "Continue Editing"
      );

      if (!result.isConfirmed) {
        return; // User chose to continue editing
      }
    }

    // Reset initial state when closing
    initialFormState.current = null;
    setHasUnsavedChanges(false);

    // Close the modal
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match the exit animation duration
  }, [submitting, hasUnsavedChanges, onClose]);

  const handleClose = useCallback(() => {
    handleCloseAttempt();
  }, [handleCloseAttempt]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscapeKey = async (e) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        await handleCloseAttempt();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "auto";
    };
  }, [submitting, handleCloseAttempt]);

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget && !submitting) {
      await handleCloseAttempt();
    }
  };

  // Wrap onSubmit to reset hasUnsavedChanges after successful submission
  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit(e);
    // Reset unsaved changes flag - if submission fails, formData won't change
    // and hasUnsavedChanges will be recalculated as true in the useEffect
    // If submission succeeds, parent will reset formData, triggering recalculation
    setHasUnsavedChanges(false);
  }, [onSubmit]);

  // Handle add line with animation
  const handleAddLine = useCallback(() => {
    const newRowIndex = formData.lines.length;
    onAddLine();
    // Mark the new row as newly added
    setNewlyAddedRows(prev => new Set([...prev, newRowIndex]));
    // Clear the animation class after animation completes
    setTimeout(() => {
      setNewlyAddedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(newRowIndex);
        return newSet;
      });
    }, 400); // Match animation duration
  }, [onAddLine, formData.lines.length]);

  // Handle remove line with animation
  const handleRemoveLine = useCallback((index) => {
    // Mark row as removing
    setRemovingRows(prev => new Set([...prev, index]));
    // Wait for animation to complete before actually removing
    setTimeout(() => {
      onRemoveLine(index);
      setRemovingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 300); // Match animation duration
  }, [onRemoveLine]);

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

        /* Row Animation - Slide In */
        @keyframes rowSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
            padding-top: inherit;
            padding-bottom: inherit;
          }
        }

        /* Row Animation - Slide Out */
        @keyframes rowSlideOut {
          from {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
        }

        .row-slide-in {
          animation: rowSlideIn 0.4s ease-out forwards;
        }

        .row-slide-out {
          animation: rowSlideOut 0.3s ease-in forwards;
          overflow: hidden;
        }

        /* Error Panel Animation */
        @keyframes fadeInSlideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 0;
            margin-bottom: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
            margin-top: 0.5rem;
            margin-bottom: 0;
          }
        }

        .fadeInSlideDown {
          animation: fadeInSlideDown 0.3s ease-out forwards;
        }
      `}</style>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div
            className={`modal-content border-0 ${isClosing ? "modal-content-animation exit" : "modal-content-animation"}`}
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
                <FaFileInvoice className="me-2" />
                {editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                disabled={submitting}
                aria-label="Close"
              ></button>
            </div>
            <form ref={formRef} onSubmit={handleFormSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Entry Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.entry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, entry_date: e.target.value })
                      }
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">
                      Description <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        formErrors.description ? "is-invalid" : ""
                      }`}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      required
                      disabled={submitting}
                      placeholder="Enter journal entry description"
                    />
                    {formErrors.description && (
                      <div className="invalid-feedback">
                        {formErrors.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.reference_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reference_number: e.target.value,
                        })
                      }
                      placeholder="Optional reference number"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="card mb-3 border-0 shadow-sm">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center border-bottom">
                    <strong className="text-primary">
                      <i className="fas fa-list me-2"></i>
                      Journal Entry Lines
                    </strong>
                    <button
                      type="button"
                      className="btn btn-sm text-white fw-semibold"
                      onClick={handleAddLine}
                      disabled={submitting}
                      style={{
                        backgroundColor: "var(--primary-color)",
                        border: "none",
                        transition: "all 0.3s ease-in-out",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.backgroundColor = "var(--primary-dark)";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.backgroundColor = "var(--primary-color)";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        }
                      }}
                    >
                      <FaPlus className="me-1" />
                      Add Line
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "30%" }}>
                              Account <span className="text-danger">*</span>
                            </th>
                            <th style={{ width: "20%" }}>Debit Amount</th>
                            <th style={{ width: "20%" }}>Credit Amount</th>
                            <th style={{ width: "25%" }}>Description</th>
                            <th style={{ width: "5%" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.lines.map((line, index) => {
                            const isNewlyAdded = newlyAddedRows.has(index);
                            const isRemoving = removingRows.has(index);
                            const animationClass = isRemoving 
                              ? "row-slide-out" 
                              : isNewlyAdded 
                              ? "row-slide-in" 
                              : "";
                            
                            return (
                            <tr 
                              key={index}
                              className={animationClass}
                              style={isRemoving ? { display: "table-row" } : {}}
                            >
                              <td>
                                <select
                                  className={`form-select form-select-sm ${
                                    formErrors[`line_${index}_account`]
                                      ? "is-invalid"
                                      : ""
                                  }`}
                                  value={line.account_id}
                                  onChange={(e) =>
                                    onLineChange(
                                      index,
                                      "account_id",
                                      e.target.value
                                    )
                                  }
                                  required
                                  disabled={submitting}
                                >
                                  <option value="">Select Account</option>
                                  {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.account_code} -{" "}
                                      {account.account_name}
                                    </option>
                                  ))}
                                </select>
                                {formErrors[`line_${index}_account`] && (
                                  <div className="invalid-feedback d-block">
                                    {formErrors[`line_${index}_account`]}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className={`form-control form-control-sm ${
                                    formErrors[`line_${index}_amount`]
                                      ? "is-invalid"
                                      : ""
                                  }`}
                                  value={line.debit_amount}
                                  onChange={(e) =>
                                    onLineChange(
                                      index,
                                      "debit_amount",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  disabled={submitting}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className={`form-control form-control-sm ${
                                    formErrors[`line_${index}_amount`]
                                      ? "is-invalid"
                                      : ""
                                  }`}
                                  value={line.credit_amount}
                                  onChange={(e) =>
                                    onLineChange(
                                      index,
                                      "credit_amount",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  disabled={submitting}
                                />
                                {formErrors[`line_${index}_amount`] && (
                                  <div className="invalid-feedback d-block">
                                    {formErrors[`line_${index}_amount`]}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={line.description}
                                  onChange={(e) =>
                                    onLineChange(
                                      index,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional"
                                  disabled={submitting}
                                />
                              </td>
                              <td>
                                {formData.lines.length > 2 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleRemoveLine(index)}
                                    disabled={submitting || isRemoving}
                                    title="Remove line"
                                  >
                                    <FaTrash />
                                  </button>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="1">
                              <strong>Totals:</strong>
                            </td>
                            <td className="text-end">
                              <strong
                                className={
                                  isBalanced ? "text-danger" : "text-danger"
                                }
                              >
                                {totalDebit.toFixed(2)}
                              </strong>
                            </td>
                            <td className="text-end">
                              <strong
                                className={
                                  isBalanced ? "text-success" : "text-danger"
                                }
                              >
                                {totalCredit.toFixed(2)}
                              </strong>
                            </td>
                            <td colSpan="2">
                              {isBalanced ? (
                                <span className="badge bg-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  Balanced
                                </span>
                              ) : (
                                <span className="badge bg-danger">
                                  <i className="fas fa-exclamation-triangle me-1"></i>
                                  Difference:{" "}
                                  {Math.abs(totalDebit - totalCredit).toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {formErrors.balance && (() => {
                      const balanceError = formErrors.balance;
                      const match = balanceError.match(/Debits \(([\d,]+\.\d+)\) must equal Credits \(([\d,]+\.\d+)\)/);
                      
                      return (
                        <div 
                          className="alert alert-danger mt-2 mb-0 mx-3 border-0 shadow-sm"
                          style={{
                            animation: "fadeInSlideDown 0.3s ease-out",
                            borderRadius: "0.5rem",
                            backgroundColor: "#f8d7da",
                            borderLeft: "4px solid #dc3545",
                            padding: "0.75rem 1rem",
                          }}
                        >
                          <div className="d-flex align-items-center">
                            <i className="fas fa-exclamation-triangle me-2" style={{ fontSize: "1.1rem", color: "#dc3545" }}></i>
                            <div className="flex-grow-1">
                              <strong className="d-block mb-1" style={{ color: "#721c24", fontSize: "0.9rem" }}>
                                Entry Not Balanced
                              </strong>
                              <div style={{ color: "#721c24", fontSize: "0.85rem", lineHeight: "1.5" }}>
                                {match ? (
                                  <>
                                    <span>Debits </span>
                                    <strong style={{ color: "#dc3545", fontSize: "0.95rem", fontWeight: "700" }}>
                                      ({match[1]})
                                    </strong>
                                    <span> must equal Credits </span>
                                    <strong style={{ color: "#dc3545", fontSize: "0.95rem", fontWeight: "700" }}>
                                      ({match[2]})
                                    </strong>
                                  </>
                                ) : (
                                  balanceError
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  <FaTimes className="me-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !isBalanced}
                >
                  {submitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      {editingEntry ? "Update Entry" : "Create Entry"}
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

export default JournalEntryFormModal;

