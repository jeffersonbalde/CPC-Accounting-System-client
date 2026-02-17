import React, { useState, useEffect, useRef } from "react";
import Portal from "./Portal";

const AuthorizationCodeModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  title = "Authorization Required",
  message = "Enter the authorization code from your administrator to confirm this action.",
  actionLabel = "Confirm",
  error: externalError = null,
}) => {
  const [code, setCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [localError, setLocalError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const codeInputRef = useRef(null);

  const error = externalError || localError;

  useEffect(() => {
    if (open) {
      setCode("");
      setRemarks("");
      setLocalError("");
    }
  }, [open]);

  // Aggressively keep focus on the authorization code field while the modal is open.
  // We use a short-lived interval to fight with any other component (e.g. SweetAlert)
  // that might try to steal focus right after the modal appears.
  useEffect(() => {
    if (!open || loading) return;
    const start = Date.now();
    const id = setInterval(() => {
      if (!codeInputRef.current) return;
      codeInputRef.current.focus();
      // Stop after ~1 second so we don't keep forcing focus forever
      if (Date.now() - start > 800) {
        clearInterval(id);
      }
    }, 80);
    return () => clearInterval(id);
  }, [open, loading]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (loading) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed.length) {
      setLocalError("Please enter an authorization code.");
      return;
    }
    onSubmit({ authorization_code: trimmed, remarks: (remarks || "").trim() });
  };

  const handleCodeChange = (e) => {
    // Allow 1 or more characters, alphanumeric only, uppercased.
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    setCode(val);
    if (localError) setLocalError("");
  };

  if (!open) return null;

  return (
    <Portal>
      <style>{`
        @keyframes authModalBackdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes authModalBackdropFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes authModalContentSlideIn {
          from { opacity: 0; transform: translateY(-24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authModalContentSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-24px) scale(0.98); }
        }
        .auth-modal-backdrop {
          animation: authModalBackdropFadeIn 0.25s ease-out forwards;
        }
        .auth-modal-backdrop.exit {
          animation: authModalBackdropFadeOut 0.2s ease-in forwards;
        }
        .auth-modal-content {
          animation: authModalContentSlideIn 0.25s ease-out forwards;
        }
        .auth-modal-content.exit {
          animation: authModalContentSlideOut 0.2s ease-in forwards;
        }
        .auth-code-input {
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-align: center;
          font-family: ui-monospace, monospace;
        }
      `}</style>
      <div
        className={`modal fade show d-block ${
          isClosing ? "auth-modal-backdrop exit" : "auth-modal-backdrop"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={handleBackdropClick}
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          style={{ maxWidth: "440px" }}
        >
          <div
            className={`modal-content border-0 shadow ${
              isClosing ? "auth-modal-content exit" : "auth-modal-content"
            }`}
            style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-semibold">{title}</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
                disabled={loading}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body py-4">
                <p
                  className="text-secondary small mb-3"
                  style={{ lineHeight: 1.5 }}
                >
                  {message}
                </p>
                <div className="mb-3">
                  <label
                    htmlFor="auth-code-input"
                    className="form-label fw-semibold small text-uppercase text-muted"
                  >
                    Authorization Code
                  </label>
                  <input
                    id="auth-code-input"
                    type="text"
                    className={`form-control form-control-sm auth-code-input ${
                      error ? "is-invalid" : ""
                    }`}
                    placeholder="Authorization code"
                    value={code}
                    onChange={handleCodeChange}
                    maxLength={64}
                    autoComplete="one-time-code"
                    disabled={loading}
                    ref={codeInputRef}
                  />
                  {error && (
                    <div className="invalid-feedback d-block">{error}</div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="auth-remarks"
                    className="form-label fw-semibold small text-uppercase text-muted"
                  >
                    Remarks{" "}
                    <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <textarea
                    id="auth-remarks"
                    className="form-control"
                    rows={2}
                    placeholder="Optional note for audit"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 bg-light px-4 py-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={loading || !code.trim().length}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      />
                      Processing...
                    </>
                  ) : (
                    actionLabel
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

export default AuthorizationCodeModal;
