import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import backgroundImage from "../../assets/background_image.png";
import logo from "../../assets/logo.png";
import { useAuth } from "../../contexts/AuthContext";
import Preloader from "../../components/Preloader";
import { showAlert, showToast } from "../../services/notificationService";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading, token } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  // Color scheme: #207AB9 (primary) and #171D5B (primaryDark)
  const theme = {
    primary: "#207AB9",
    primaryDark: "#171D5B",
    primaryLight: "#4a9dd1",
    textPrimary: "#171D5B",
    textSecondary: "#4a5c4a",
    backgroundLight: "#f8faf8",
    backgroundWhite: "#ffffff",
    borderColor: "#e0e6e0",
  };

  useEffect(() => {
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  // Check if user is already authenticated when component mounts
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Wait for auth context to finish loading
      if (loading) {
        return;
      }

      // Check localStorage first, then state
      const storedToken = localStorage.getItem("auth_token") || token;

      // If there's a token, verify it's valid by checking if user is loaded
      if (storedToken) {
        try {
          // If user is already loaded, redirect immediately
          if (user) {
            if (isMounted) {
              setCheckingToken(false);
              if (user.role === "admin") {
                navigate("/admin/dashboard", { replace: true });
              } else {
                navigate("/personnel/dashboard", { replace: true });
              }
            }
            return;
          }

          // If token exists but user is not loaded, fetch user info
          const API_BASE_URL =
            import.meta.env.VITE_API_URL || "http://localhost:8000/api";
          const response = await fetch(`${API_BASE_URL}/user`, {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user && isMounted) {
              setCheckingToken(false);
              // Redirect based on role
              if (data.user.role === "admin") {
                navigate("/admin/dashboard", { replace: true });
              } else {
                navigate("/personnel/dashboard", { replace: true });
              }
              return;
            }
          } else {
            // Only remove token if it's an authentication error (401/403)
            // Don't remove on other errors (500, network issues, etc.)
            if (
              (response.status === 401 || response.status === 403) &&
              isMounted
            ) {
              localStorage.removeItem("auth_token");
            }
          }
        } catch (error) {
          console.error("Token validation error:", error);
          // Don't remove token on network errors - might be temporary
          // Only remove on clear authentication failures
        }
      }

      // No valid token or user, show login form
      if (isMounted) {
        setCheckingToken(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [token, user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.username || !form.password) {
      showToast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    // Show loading alert
    showAlert.loading("Logging in", "Please wait while we authenticate you...");

    try {
      const response = await login(form.username, form.password);

      if (response.success) {
        // Close loading alert
        showAlert.close();

        // Show success alert
        showAlert.success(
          "Login Successful",
          `Welcome back, ${response.user.name || response.user.username}!`,
          2000
        );

        // Small delay to show success message before redirect
        setTimeout(() => {
          // Redirect based on role
          if (response.user.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/personnel/dashboard");
          }
        }, 2000);
      } else {
        // Close loading alert
        showAlert.close();

        // Show error alert
        showAlert.error(
          "Login Failed",
          response.message || "Invalid credentials. Please try again."
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      // Close loading alert
      showAlert.close();

      // Show error alert
      showAlert.error(
        "Login Failed",
        error.message || "Invalid credentials. Please try again."
      );
      console.error("Login error:", error);
      setIsSubmitting(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Show preloader while checking token
  if (checkingToken || loading) {
    return <Preloader />;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-vh-100 d-flex flex-column position-relative w-100" style={{ minWidth: 0 }}>
      {/* Main content – grows to push footer down */}
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center py-3 py-md-4 w-100">
      {/* Background */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: theme.backgroundLight,
          filter: backgroundLoaded ? "blur(0px)" : "blur(8px)",
          transition: "filter 0.6s ease",
        }}
      />

      {/* Logo Section - Outside the white panel */}
      <div className="position-relative" style={{ zIndex: 10 }}>
        <div className="d-flex align-items-center justify-content-center">
          {/* System Logo Only - Responsive sizing */}
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "clamp(100px, 20vw, 120px)",
              height: "clamp(100px, 20vw, 120px)",
              flexShrink: 0,
              filter: logoLoaded ? "blur(0px)" : "blur(8px)",
              opacity: logoLoaded ? 1 : 0,
              transition: "all 0.6s ease",
            }}
          >
            <img
              src={logo}
              alt="CPC Growth Strategies, Inc."
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              onLoad={() => setLogoLoaded(true)}
            />
          </div>
        </div>
      </div>

      {/* Welcome Text - Outside the form card in column layout */}
      <div
        className="position-relative text-center mb-3"
        style={{
          zIndex: 10,
          opacity: backgroundLoaded && logoLoaded ? 1 : 0,
          transform:
            backgroundLoaded && logoLoaded
              ? "translateY(0)"
              : "translateY(10px)",
          transition: "all 0.6s ease-in-out",
          marginTop: "-0.3rem",
        }}
      >
        <div className="d-flex flex-column align-items-center">
          <h1
            className="fw-bold mb-1"
            style={{
              color: "white",
              fontSize: "clamp(1.6rem, 5vw, 2rem)",
              lineHeight: "1.1",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              fontWeight: "700",
            }}
          >
            Log in to your account
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div
        className="bg-white rounded-4 shadow-lg p-4 p-sm-5 position-relative mx-3"
        style={{
          maxWidth: "430px",
          width: "90%",
          border: `1px solid ${theme.borderColor}`,
          zIndex: 10,
          opacity: backgroundLoaded && logoLoaded ? 1 : 0,
          transform:
            backgroundLoaded && logoLoaded
              ? "translateY(0)"
              : "translateY(20px)",
          transition: "all 0.6s ease-in-out",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="mb-3">
            <label
              htmlFor="username"
              className="form-label fw-semibold mb-2"
              style={{
                fontSize: "0.9rem",
                color: theme.textSecondary,
              }}
            >
              Username
            </label>
            <div className="position-relative">
              <FaUser
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
                style={{ color: theme.primary }}
              />
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                className="form-control ps-5 fw-semibold"
                value={form.username}
                onChange={handleInput}
                disabled={isSubmitting}
                required
                style={{
                  backgroundColor: "var(--input-bg, #f8faf8)",
                  color: "var(--input-text, #1a2a1a)",
                  border: "1px solid var(--input-border, #c8d0c8)",
                  borderRadius: "8px",
                }}
                id="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="form-label fw-semibold mb-2"
              style={{
                fontSize: "0.9rem",
                color: theme.textSecondary,
              }}
            >
              Password
            </label>
            <div className="position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
                style={{ color: theme.primary }}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                className="form-control ps-5 pe-5 fw-semibold"
                value={form.password}
                onChange={handleInput}
                disabled={isSubmitting}
                required
                style={{
                  backgroundColor: "var(--input-bg, #f8faf8)",
                  color: "var(--input-text, #1a2a1a)",
                  border: "1px solid var(--input-border, #c8d0c8)",
                  borderRadius: "8px",
                }}
                id="password"
              />
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                style={{
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  zIndex: 10,
                  color: theme.primary,
                }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold d-flex justify-content-center align-items-center position-relative"
            disabled={isSubmitting}
            style={{
              backgroundColor: theme.primaryDark,
              color: "white",
              height: "43px",
              borderRadius: "8px",
              border: "none",
              fontSize: "1rem",
              transition: "all 0.3s ease-in-out",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = theme.primary;
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.4)";
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = theme.primaryDark;
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
              }
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
              }
            }}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner me-2" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .form-control:focus {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 0.2rem ${theme.primary}25;
        }
        
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
          boxShadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }
        /* Input field hover effects */
        .form-control:hover:not(:focus):not(:disabled) {
          border-color: ${theme.primary}80;
        }
        /* Link hover effects */
        a.text-decoration-underline:hover {
          opacity: 0.8;
        }
        /* Responsive adjustments for very small screens */
        @media (max-width: 375px) {
          .p-4 {
            padding: 1rem !important;
          }
          
          .p-sm-5 {
            padding: 1.5rem !important;
          }
        }
        /* Mobile responsiveness for welcome text */
        @media (max-width: 576px) {
          .position-relative.text-center.mb-3 {
            margin-bottom: 1.5rem !important;
          }
        }
        /* Extra small devices */
        @media (max-width: 320px) {
          .d-flex.flex-column.align-items-center h1 {
            font-size: 1.4rem !important;
          }
        }
        /* Login page: ensure root and footer span full width */
        .min-vh-100.d-flex.flex-column.position-relative.w-100 {
          width: 100% !important;
          max-width: 100%;
        }
        .login-page-footer {
          width: 100% !important;
          min-width: 100%;
        }
      `}</style>
      </div>

      {/* Footer – full-width bar, centered content, government/corporate style */}
      <footer
        className="login-page-footer mt-auto flex-shrink-0 w-100"
        style={{
          zIndex: 10,
          backgroundColor: "rgba(23, 29, 91, 0.92)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
          padding: "0.5rem 1.5rem",
          boxSizing: "border-box",
        }}
      >
        <div
          className="mx-auto text-center"
          style={{ maxWidth: "900px", width: "100%", paddingLeft: "1rem", paddingRight: "1rem", boxSizing: "border-box" }}
        >
          <p className="mb-0 small">
            © {currentYear} CPC Growth Strategies, Inc. All rights reserved.
            <span style={{ marginLeft: "0.35rem", marginRight: "0.35rem", opacity: 0.8 }}>·</span>
            Authorized use only. Unauthorized access is prohibited.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
