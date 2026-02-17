import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const CURRENT_ACCOUNT_ID_KEY = "current_account_id";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [currentAccount, setCurrentAccountState] = useState(null);

  const setCurrentAccount = (account) => {
    setCurrentAccountState(account);
    if (account?.id) {
      localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(account.id));
    } else {
      localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");

      if (storedToken) {
        setToken(storedToken);
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
              let accountList = data.accounts || [];
              
              // If /user didn't return accounts, fetch from /accounts endpoint (works for both admin and personnel)
              if (accountList.length === 0) {
                try {
                  const accountsResponse = await fetch(`${API_BASE_URL}/accounts`, {
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                      Authorization: `Bearer ${storedToken}`,
                    },
                  });
                  if (accountsResponse.ok) {
                    const accountsData = await accountsResponse.json();
                    if (accountsData?.accounts) {
                      accountList = accountsData.accounts;
                      console.log("Fetched accounts from /accounts endpoint:", accountList.length);
                    }
                  } else {
                    console.warn("Failed to fetch accounts, status:", accountsResponse.status);
                  }
                } catch (accountsError) {
                  console.error("Failed to fetch accounts:", accountsError);
                }
              }
              
              setAccounts(accountList);
              const savedId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);
              const matched = savedId && accountList.find((a) => String(a.id) === savedId);
              const defaultAccount = data.current_account || accountList[0] || null;
              setCurrentAccountState(matched || defaultAccount);
              if (matched || defaultAccount) {
                localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String((matched || defaultAccount).id));
              }
            } else {
              if (response.status === 401) {
                localStorage.removeItem("auth_token");
                setToken(null);
              }
            }
          } else {
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem("auth_token");
              setToken(null);
              setUser(null);
              setAccounts([]);
              setCurrentAccountState(null);
              localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      } else {
        setToken(null);
        setAccounts([]);
        setCurrentAccountState(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Ensure currentAccount is set when accounts are loaded but currentAccount is null
  useEffect(() => {
    if (accounts.length > 0 && !currentAccount) {
      console.log("Setting currentAccount from accounts:", accounts.length, "accounts available");
      const savedId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);
      const matched = savedId && accounts.find((a) => String(a.id) === savedId);
      const defaultAccount = matched || accounts[0];
      if (defaultAccount) {
        console.log("Setting currentAccount to:", defaultAccount.name, defaultAccount.id);
        setCurrentAccountState(defaultAccount);
        localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(defaultAccount.id));
      }
    }
  }, [accounts, currentAccount]);

  // API request helper – always sends X-Account-Id for accounting routes so COA and all accounting data load
  const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const currentToken = token || localStorage.getItem("auth_token");
    // Use currentAccount, or for /accounting/* use first account so COA etc. always load
    const accountId =
      currentAccount?.id ??
      (endpoint.startsWith("/accounting/") && accounts?.length > 0
        ? accounts[0].id
        : undefined);

    const config = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...(accountId != null && { "X-Account-Id": String(accountId) }),
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
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
        // Prefer first validation error (e.g. "Your account has been deactivated...")
        if (data.errors && typeof data.errors === "object") {
          const firstKey = Object.keys(data.errors)[0];
          const firstMsg = firstKey
            ? Array.isArray(data.errors[firstKey])
              ? data.errors[firstKey][0]
              : data.errors[firstKey]
            : null;
          if (firstMsg) throw new Error(firstMsg);
        }
        throw new Error(
          data.message ||
            data.error ||
            (data.error && data.error.message) ||
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
        const loginToken = response.token;
        setToken(loginToken);
        setUser(response.user);
        localStorage.setItem("auth_token", loginToken);
        let accountList = response.accounts || [];
        
        // If /login didn't return accounts, fetch from /accounts endpoint (works for both admin and personnel)
        if (accountList.length === 0) {
          try {
            const accountsResponse = await fetch(`${API_BASE_URL}/accounts`, {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${loginToken}`,
              },
            });
            if (accountsResponse.ok) {
              const accountsData = await accountsResponse.json();
              if (accountsData?.accounts) {
                accountList = accountsData.accounts;
                console.log("Fetched accounts from /accounts endpoint after login:", accountList.length);
              }
            }
          } catch (accountsError) {
            console.error("Failed to fetch accounts after login:", accountsError);
          }
        }
        
        setAccounts(accountList);
        const defaultAccount = response.current_account || accountList[0] || null;
        setCurrentAccountState(defaultAccount);
        if (defaultAccount) {
          localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(defaultAccount.id));
        }
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
      setAccounts([]);
      setCurrentAccountState(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
      window.location.href = "/";
    }
  };

  // Get current user (also refreshes accounts and current account)
  const getUser = async () => {
    try {
      const response = await request("/user");
      if (response.success) {
        setUser(response.user);
        let accountList = response.accounts || [];
        
        // If /user didn't return accounts, fetch from /accounts endpoint (works for both admin and personnel)
        if (accountList.length === 0) {
          try {
            const accountsData = await request("/accounts");
            if (accountsData?.accounts) {
              accountList = accountsData.accounts;
              console.log("Fetched accounts from /accounts endpoint in getUser:", accountList.length);
            }
          } catch (accountsError) {
            console.error("Failed to fetch accounts in getUser:", accountsError);
          }
        }
        
        setAccounts(accountList);
        const savedId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);
        const matched = savedId && accountList.find((a) => String(a.id) === savedId);
        const defaultAccount = response.current_account || accountList[0] || null;
        setCurrentAccountState(matched || defaultAccount);
        setLoading(false);
        return response.user;
      }
    } catch (error) {
      console.error("Get user error:", error);
      setLoading(false);
      logout();
    }
  };

  // Refresh only the accounts list (e.g. after toggling active/inactive). Does not change currentAccount.
  const refreshAccounts = async () => {
    try {
      // Admins: include inactive so Accounts & COA and topbar always see the full list
      const url = isAdmin() ? "/accounts?include_inactive=1" : "/accounts";
      const data = await request(url);
      if (data?.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Refresh accounts error:", error);
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
    accounts,
    currentAccount,
    setCurrentAccount,
    login,
    logout,
    getUser,
    refreshAccounts,
    isAuthenticated,
    isAdmin,
    isPersonnel,
    request,
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
