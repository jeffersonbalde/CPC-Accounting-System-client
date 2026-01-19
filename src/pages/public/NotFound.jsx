import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaArrowLeft, FaCompass } from "react-icons/fa";

export default function NotFound() {
  const navigate = useNavigate();

  // Color scheme matching the project theme
  const theme = {
    primary: "#207AB9",
    primaryDark: "#171D5B",
    textPrimary: "#171D5B",
    textSecondary: "#4a5c4a",
    backgroundLight: "#f8faf8",
    backgroundWhite: "#ffffff",
    borderColor: "#e0e6e0",
    textMuted: "#6c757d",
    btnPrimaryText: "#ffffff",
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            {/* Minimalist Card */}
            <div className="text-center px-4">
              {/* Icon */}
              <div className="mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "64px",
                    height: "64px",
                    background: theme.backgroundWhite,
                    border: `1.5px solid ${theme.borderColor}`,
                    color: theme.textMuted,
                  }}
                >
                  <FaCompass size={24} />
                </div>
              </div>

              {/* Content */}
              <div className="mb-5">
                <h1
                  className="display-3 fw-bold mb-2"
                  style={{ color: theme.textPrimary }}
                >
                  404
                </h1>
                <h2
                  className="h5 fw-semibold mb-3"
                  style={{ color: theme.textPrimary }}
                >
                  Page Not Found
                </h2>
                <p className="mb-0" style={{ color: theme.textSecondary }}>
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mb-5">
                <button
                  onClick={() => navigate(-1)}
                  className="btn d-flex align-items-center justify-content-center gap-2"
                  style={{
                    background: theme.backgroundWhite,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.borderColor}`,
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = theme.backgroundLight;
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = theme.backgroundWhite;
                    e.target.style.transform = "translateY(0)";
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  <FaArrowLeft size={14} />
                  Go Back
                </button>
                <Link
                  to="/"
                  className="btn d-flex align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{
                    background: theme.primary,
                    color: theme.btnPrimaryText,
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = theme.primaryDark;
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = theme.primary;
                    e.target.style.transform = "translateY(0)";
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  <FaHome size={14} />
                  Go Home
                </Link>
              </div>

              {/* Support Link */}
              <div
                className="border-top pt-3"
                style={{ borderColor: `${theme.borderColor} !important` }}
              >
                <a
                  href="mailto:support@cpcgrowth.com"
                  className="small text-decoration-none"
                  style={{ color: theme.textMuted }}
                >
                  Contact support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
