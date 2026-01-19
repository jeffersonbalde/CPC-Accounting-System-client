import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");

      if (storedToken) {
        setToken(storedToken);
        // Fetch user info from API using the token
        try {
          const response = await fetch(`${API_BASE_URL}/user`, {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUser(data.user);
            } else {
              // Response is ok but no user data, token might be invalid
              if (response.status === 401) {
                localStorage.removeItem("auth_token");
                setToken(null);
              }
            }
          } else {
            // Only remove token if it's an authentication error (401)
            // Don't remove on other errors (network, server errors, etc.)
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem("auth_token");
              setToken(null);
            }
            // For other errors, keep the token but don't set user
            // This allows the app to function if there's a temporary server issue
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
          // Don't remove token on network errors - might be temporary
          // Only remove if it's a clear authentication error
          // Keep token and let user try again
        }
      } else {
        // No token in localStorage
        setToken(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // API request helper
  const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const currentToken = token || localStorage.getItem("auth_token");

    const config = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Clone response to read it multiple times if needed
      const responseClone = response.clone();

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, read as text for better error message
          const text = await responseClone.text();
          console.error(
            "JSON parse error:",
            jsonError,
            "Response text:",
            text.substring(0, 500)
          );
          throw new Error(
            response.status === 500
              ? "Internal server error. Please check the server logs."
              : `Server error: ${response.status} ${response.statusText}`
          );
        }
      } else {
        // Non-JSON response (likely HTML error page)
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(
          response.status === 500
            ? "Internal server error. Please check the server logs."
            : `Server error: ${response.status} ${response.statusText}`
        );
      }

      if (!response.ok) {
        // If it's an authentication error, clear token
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
        throw new Error(
          data.message ||
            data.error ||
            data.error?.message ||
            "An error occurred"
        );
      }

      return data;
    } catch (error) {
      // If it's already an Error object, rethrow it
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise, create a new error
      throw new Error(error.message || "An error occurred");
    }
  };

  // Login function
  const login = async (username, password) => {
    try {
      const response = await request("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.token) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem("auth_token", response.token);
        // User info is not stored, only token

        return { success: true, user: response.user };
      }

      return { success: false, message: response.message || "Login failed" };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Invalid credentials. Please try again.",
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await request("/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("auth_token");
      // User info is not stored, so no need to remove it
      // Redirect to login
      window.location.href = "/";
    }
  };

  // Get current user
  const getUser = async () => {
    try {
      const response = await request("/user");
      if (response.success) {
        setUser(response.user);
        // User info is not stored in localStorage, only in state
        setLoading(false);
        return response.user;
      }
    } catch (error) {
      console.error("Get user error:", error);
      setLoading(false);
      // If token is invalid, logout
      logout();
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    // Check both state and localStorage to ensure token persistence
    const currentToken = token || localStorage.getItem("auth_token");
    return !!currentToken;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === "admin";
  };

  // Check if user is personnel
  const isPersonnel = () => {
    return user?.role === "personnel";
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    getUser,
    isAuthenticated,
    isAdmin,
    isPersonnel,
    request, // Expose request method for other API calls
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
