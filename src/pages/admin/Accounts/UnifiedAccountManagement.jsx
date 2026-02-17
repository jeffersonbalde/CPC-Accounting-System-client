import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  FaBuilding,
  FaPlus,
  FaEdit,
  FaBook,
  FaChartLine,
  FaCog,
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaWallet,
  FaFileInvoice,
  FaArrowUp,
  FaArrowDown,
  FaBalanceScale,
  FaTrash,
  FaTag,
  FaImage,
  FaUpload,
  FaTimes,
  FaEye,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import NumberViewModal from "../../../components/admin/NumberViewModal";

const UnifiedAccountManagement = () => {
  const { request, isAdmin, currentAccount, setCurrentAccount, getUser, refreshAccounts, accounts } = useAuth();
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coaLoading, setCoaLoading] = useState(false);
  const [displayAccountId, setDisplayAccountId] = useState(null);
  const selectedAccountIdRef = useRef(null);
  const hasInitializedDisplayRef = useRef(false);
  const initialAccountFormRef = useRef(null);
  const initialEditAccountFormRef = useRef(null);
  const initialCoaFormRef = useRef(null);
  const initialEditCoaFormRef = useRef(null);
  const initialAccountTypeFormRef = useRef(null);
  const initialEditAccountTypeFormRef = useRef(null);
  const initialDeleteConfirmRef = useRef(null);
  const [activeTab, setActiveTab] = useState("chart-of-accounts");
  const [expandedTypes, setExpandedTypes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showEditAccountForm, setShowEditAccountForm] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountConfirmName, setDeleteAccountConfirmName] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showCoaForm, setShowCoaForm] = useState(false);
  const [showEditCoaForm, setShowEditCoaForm] = useState(false);
  const [showAccountTypeForm, setShowAccountTypeForm] = useState(false);
  const [showEditAccountTypeForm, setShowEditAccountTypeForm] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", code: "", logo: null });
  const [newAccountLogoPreview, setNewAccountLogoPreview] = useState(null);
  const [newAccountLogoFile, setNewAccountLogoFile] = useState(null);
  const [coaForm, setCoaForm] = useState({
    account_code: "",
    account_name: "",
    account_type_id: "",
    normal_balance: "",
    description: "",
    is_active: true,
  });
  const [accountTypeForm, setAccountTypeForm] = useState({
    code: "",
    name: "",
    normal_balance: "DR",
    category: "expense",
    color: "#6c757d",
    icon: "",
    display_order: 0,
    is_active: true,
  });
  const ACCOUNT_TYPE_CATEGORIES = [
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
    { value: "revenue", label: "Revenue (income)" },
    { value: "expense", label: "Expense" },
  ];
  const getCategoryLabel = (value) => ACCOUNT_TYPE_CATEGORIES.find((c) => c.value === value)?.label || value || "—";
  const [editingAccountType, setEditingAccountType] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeToggleSaving, setActiveToggleSaving] = useState(false);
  const [editingCoa, setEditingCoa] = useState(null);
  const [deletingCoaId, setDeletingCoaId] = useState(null);
  const [deletingAccountTypeId, setDeletingAccountTypeId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [numberViewModal, setNumberViewModal] = useState({ show: false, title: "", formattedValue: "" });

  // Modal close animations (match Settings/PersonnelDetailsModal)
  const [accountFormClosing, setAccountFormClosing] = useState(false);
  const [editAccountFormClosing, setEditAccountFormClosing] = useState(false);
  const [deleteAccountModalClosing, setDeleteAccountModalClosing] = useState(false);
  const [coaFormClosing, setCoaFormClosing] = useState(false);
  const [editCoaFormClosing, setEditCoaFormClosing] = useState(false);
  const [accountTypeFormClosing, setAccountTypeFormClosing] = useState(false);
  const [editAccountTypeFormClosing, setEditAccountTypeFormClosing] = useState(false);

  // Corporate theme (match Settings and index.css variables)
  const theme = {
    primary: "#0c203f",
    primaryDark: "#050f23",
    primaryLight: "#1f3e6d",
    accent: "#f0b429",
    accentLight: "#ffd866",
    textPrimary: "#10172b",
    textSecondary: "#4c5875",
    cardShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
    inputBorder: "#d5dbe6",
  };

  // Dynamic account type mappings from fetched data
  const accountTypeLabels = useMemo(() => {
    const labels = {};
    accountTypes.forEach((type) => {
      labels[type.code] = type.name;
    });
    return labels;
  }, [accountTypes]);

  const accountTypeColors = useMemo(() => {
    const colors = {};
    accountTypes.forEach((type) => {
      colors[type.code] = type.color || "#6c757d";
    });
    return colors;
  }, [accountTypes]);

  const accountTypeById = useMemo(() => {
    const map = {};
    accountTypes.forEach((type) => {
      map[type.id] = type;
    });
    return map;
  }, [accountTypes]);

  const accountTypeByCode = useMemo(() => {
    const map = {};
    accountTypes.forEach((type) => {
      map[type.code] = type;
    });
    return map;
  }, [accountTypes]);

  // Escape key closes open modal (match PersonnelDetailsModal)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showAccountForm) handleCloseAccountForm();
      else if (showEditAccountForm) handleCloseEditAccountForm();
      else if (showDeleteAccountModal) handleCloseDeleteAccountModal();
      else if (showCoaForm) handleCloseCoaForm();
      else if (showAccountTypeForm) handleCloseAccountTypeForm();
      else if (showEditAccountTypeForm) handleCloseEditAccountTypeForm();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showAccountForm, showEditAccountForm, showDeleteAccountModal, showCoaForm, showAccountTypeForm, showEditAccountTypeForm]);

  // Initialize selected account from currentAccount and sync when it changes (e.g. from topbar)
  useEffect(() => {
    if (currentAccount?.id) {
      setSelectedAccountId(currentAccount.id);
      if (!hasInitializedDisplayRef.current) {
        setDisplayAccountId(currentAccount.id);
        hasInitializedDisplayRef.current = true;
      }
    } else if (businessAccounts.length > 0 && !selectedAccountId) {
      const firstId = businessAccounts[0].id;
      setSelectedAccountId(firstId);
      if (!hasInitializedDisplayRef.current) {
        setDisplayAccountId(firstId);
        hasInitializedDisplayRef.current = true;
      }
    } else if (!selectedAccountId) {
      hasInitializedDisplayRef.current = false;
    }
  }, [currentAccount, businessAccounts, selectedAccountId]);

  // Fetch account types for the current business account (scoped by X-Account-Id)
  const fetchAccountTypes = useCallback(async () => {
    if (!selectedAccountId) {
      setAccountTypes([]);
      return;
    }
    try {
      const data = await request("/account-types");
      const list = Array.isArray(data) ? data : [];
      setAccountTypes(list);
      const expanded = {};
      list.forEach((type) => {
        expanded[type.code] = true;
      });
      setExpandedTypes(expanded);
    } catch (err) {
      console.error("Failed to fetch account types:", err);
      setAccountTypes([]);
      if (err?.message && !err.message.includes("Account context")) {
      showToast.error("Failed to load account types");
    }
    }
  }, [request, selectedAccountId]);

  // Fetch business accounts (admin: include inactive so they can toggle in Settings)
  const fetchBusinessAccounts = useCallback(async () => {
    try {
      const url = isAdmin() ? "/accounts?include_inactive=1" : "/accounts";
      const data = await request(url);
      if (data?.accounts) {
        setBusinessAccounts(data.accounts);
        if (!selectedAccountId && data.accounts.length > 0) {
          const defaultId = currentAccount?.id || data.accounts[0].id;
          setSelectedAccountId(defaultId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      showToast.error("Failed to load business accounts");
    }
  }, [request, selectedAccountId, currentAccount, isAdmin]);

  // Fetch chart of accounts for selected account (no loading state – caller controls it)
  const fetchChartOfAccounts = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const params = new URLSearchParams();
      // Always include both active and inactive accounts for admin clarity
      params.set("active_only", "false");
      const data = await request(`/accounting/chart-of-accounts?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setChartOfAccounts(list);
    } catch (err) {
      console.error("Failed to fetch chart of accounts:", err);
      showToast.error("Failed to load chart of accounts");
    }
  }, [request, selectedAccountId]);

  // Fetch financial summary: use Balance Sheet for assets/liabilities/equity, Income Statement for revenue/expenses (category-based APIs).
  const fetchFinancialSummary = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      const params = new URLSearchParams({ start_date: startOfYear, end_date: today });

      const [balanceSheet, incomeStatement] = await Promise.all([
        request(`/accounting/reports/balance-sheet?${params}`).catch(() => ({ totals: {} })),
        request(`/accounting/reports/income-statement?${params}`).catch(() => ({ sections: {}, totals: {} })),
      ]);

      const totalAssets = parseFloat(balanceSheet.totals?.assets) || 0;
      const totalLiabilities = parseFloat(balanceSheet.totals?.liabilities) || 0;
      const totalEquity = parseFloat(balanceSheet.totals?.equity) || 0;
      const revenueYTD = parseFloat(incomeStatement.sections?.revenue?.total) || 0;
      const expensesYTD = parseFloat(incomeStatement.sections?.expense?.total) || 0;
      const netIncome = parseFloat(incomeStatement.totals?.net_income) ?? (revenueYTD - expensesYTD);

      setFinancialSummary({
        totalAssets,
        totalLiabilities,
        totalEquity,
        revenueYTD,
        expensesYTD,
        netIncome,
      });
    } catch (err) {
      console.error("Failed to fetch financial summary:", err);
    }
  }, [request, selectedAccountId]);

  // Fetch recent transactions
  const fetchRecentTransactions = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const data = await request("/accounting/journal-entries?per_page=10");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRecentTransactions(list.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch recent transactions:", err);
    }
  }, [request, selectedAccountId]);

  useEffect(() => {
    fetchBusinessAccounts();
  }, [fetchBusinessAccounts]);

  const selectedAccount = useMemo(
    () => businessAccounts.find((a) => a.id === selectedAccountId) || currentAccount,
    [businessAccounts, selectedAccountId, currentAccount]
  );

  const displayAccount = useMemo(
    () => (displayAccountId ? businessAccounts.find((a) => a.id === displayAccountId) : null) || selectedAccount,
    [businessAccounts, displayAccountId, selectedAccount]
  );

  selectedAccountIdRef.current = selectedAccountId;

  useEffect(() => {
    if (!selectedAccountId) {
      setDisplayAccountId(null);
      setCoaLoading(false);
      setAccountTypes([]);
      return;
    }
    const accountId = selectedAccountId;
    setCoaLoading(true);
    Promise.all([
      fetchChartOfAccounts(),
      fetchFinancialSummary(),
      fetchRecentTransactions(),
      fetchAccountTypes(),
    ])
      .then(() => {
        if (selectedAccountIdRef.current === accountId) {
          setDisplayAccountId(accountId);
        }
      })
      .catch(() => {
        if (selectedAccountIdRef.current === accountId) {
          setDisplayAccountId(accountId);
        }
      })
      .finally(() => {
        if (selectedAccountIdRef.current === accountId) {
          setCoaLoading(false);
        }
      });
  }, [selectedAccountId, fetchChartOfAccounts, fetchFinancialSummary, fetchRecentTransactions, fetchAccountTypes]);

  // Update logo preview when displayed account changes (smooth switch)
  useEffect(() => {
    if (displayAccount?.logo) {
      setLogoPreview(displayAccount.logo);
    } else {
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [displayAccount]);

  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    const account = businessAccounts.find((a) => a.id === accountId);
    if (account) {
      setCurrentAccount(account);
    }
  };

  const filteredChartOfAccounts = useMemo(() => {
    let filtered = [...chartOfAccounts];
    if (filterType !== "all") {
      // Support both account_type (code) and account_type_id
      filtered = filtered.filter((acc) => {
        if (acc.account_type_id) {
          const type = accountTypeById[acc.account_type_id];
          return type && type.code === filterType;
        }
        return acc.account_type === filterType;
      });
    }
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (acc) =>
          acc.account_code?.toLowerCase().includes(search) ||
          acc.account_name?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [chartOfAccounts, filterType, searchTerm, accountTypeById]);

  const groupedAccounts = useMemo(() => {
    return filteredChartOfAccounts.reduce((acc, account) => {
      // Get account type code from account_type_id or account_type
      let typeCode = account.account_type;
      if (account.account_type_id && accountTypeById[account.account_type_id]) {
        typeCode = accountTypeById[account.account_type_id].code;
      }
      if (!typeCode) return acc;
      if (!acc[typeCode]) {
        acc[typeCode] = [];
      }
      acc[typeCode].push(account);
      return acc;
    }, {});
  }, [filteredChartOfAccounts, accountTypeById]);

  const toggleTypeExpansion = (type) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const abbreviateNumber = (amount, isCurrency = true) => {
    if (amount === null || amount === undefined) return isCurrency ? "₱0.00" : "0";
    const num = Math.abs(Number(amount));
    let abbreviated = "";
    let suffix = "";
    if (num >= 1000000000) {
      abbreviated = (num / 1000000000).toFixed(1);
      suffix = "B";
    } else if (num >= 1000000) {
      abbreviated = (num / 1000000).toFixed(1);
      suffix = "M";
    } else if (num >= 1000) {
      abbreviated = (num / 1000).toFixed(1);
      suffix = "K";
    } else {
      abbreviated = Number(amount).toFixed(2);
    }
    abbreviated = parseFloat(abbreviated).toString();
    const sign = Number(amount) < 0 ? "-" : "";
    return isCurrency ? `${sign}₱${abbreviated}${suffix}` : `${sign}${abbreviated}${suffix}`;
  };

  const formatFullNumber = (amount, isCurrency = true) => {
    return isCurrency ? formatCurrency(amount) : String(amount ?? "—");
  };

  const handleNumberClick = (title, value, isCurrency = true) => {
    setNumberViewModal({
      show: true,
      title,
      formattedValue: formatFullNumber(value, isCurrency),
    });
  };

  const getBalanceColor = (balance, normalBalance) => {
    if (balance === 0) return "text-muted";
    if (normalBalance === "DR") {
      return balance >= 0 ? "text-success" : "text-danger";
    } else {
      return balance >= 0 ? "text-success" : "text-danger";
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const name = (accountForm.name || "").trim();
    if (!name) {
      setFormErrors({ name: "Business name is required." });
      return;
    }
    setFormLoading(true);
    setFormErrors({});
    try {
      const accountData = {
        name,
        logo: newAccountLogoPreview || undefined,
      };

      const data = await request("/accounts", {
        method: "POST",
        body: JSON.stringify(accountData),
      });
      
      if (data?.success && data?.account) {
        showToast.success("Account created successfully.");
        await fetchBusinessAccounts();
        setCurrentAccount(data.account);
        setSelectedAccountId(data.account.id);
        await getUser();
        initialAccountFormRef.current = null;
        handleCloseAccountForm();
      } else {
        showAlert.error("Error", data?.message || "Failed to create account");
      }
    } catch (err) {
      const msg = err.message || "Failed to create account";
      if (msg.includes("validation")) {
        setFormErrors({ name: "Name is required and must be valid." });
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    const name = (accountForm.name || "").trim();
    if (!name) {
      setFormErrors({ name: "Business name is required." });
      return;
    }
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request(`/accounts/${selectedAccountId}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      if (data?.success && data?.account) {
        showToast.success("Account updated successfully.");
        await fetchBusinessAccounts();
        setCurrentAccount(data.account);
        await getUser();
        initialEditAccountFormRef.current = null;
        handleCloseEditAccountForm();
      } else {
        showAlert.error("Error", data?.message || "Failed to update account");
      }
    } catch (err) {
      const msg = err.message || "Failed to update account";
      if (msg.includes("validation")) {
        setFormErrors({ name: "Name is required and must be valid." });
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCoa = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request("/accounting/chart-of-accounts", {
        method: "POST",
        body: JSON.stringify(coaForm),
      });
      if (data) {
        showToast.success("Chart of account created successfully.");
        await fetchChartOfAccounts();
        await fetchFinancialSummary();
        initialCoaFormRef.current = null;
        handleCloseCoaForm();
      }
    } catch (err) {
      const msg = err.message || "Failed to create chart of account";
      if (err.message && err.message.includes("validation")) {
        const errors = {};
        if (msg.includes("account_code")) errors.account_code = "Account code is required and must be unique.";
        if (msg.includes("account_name")) errors.account_name = "Account name is required.";
        if (msg.includes("account_type_id")) errors.account_type_id = "Account type is required.";
        if (msg.includes("normal_balance")) errors.normal_balance = "Normal balance is required.";
        setFormErrors(errors);
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCoa = async (e) => {
    e.preventDefault();
    if (!editingCoa) return;
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request(`/accounting/chart-of-accounts/${editingCoa.id}`, {
        method: "PUT",
        body: JSON.stringify(coaForm),
      });
      if (data) {
        showToast.success("Chart of account updated successfully.");
        await fetchChartOfAccounts();
        await fetchFinancialSummary();
        initialEditCoaFormRef.current = null;
        await handleCloseEditCoaForm();
      }
    } catch (err) {
      const msg = err.message || "Failed to update chart of account";
      if (err.message && err.message.includes("validation")) {
        const errors = {};
        if (msg.includes("account_code"))
          errors.account_code = "Account code is required and must be unique.";
        if (msg.includes("account_name"))
          errors.account_name = "Account name is required.";
        if (msg.includes("account_type_id"))
          errors.account_type_id = "Account type is required.";
        if (msg.includes("normal_balance"))
          errors.normal_balance = "Normal balance is required.";
        setFormErrors(errors);
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCoa = async (account) => {
    if (!account) return;
    const result = await showAlert.confirm(
      "Delete Chart of Account",
      "Are you sure you want to delete this account? If it has existing transactions, it will be deactivated instead of permanently removed.",
      "Yes, Delete",
      "Cancel"
    );
    if (!result.isConfirmed) return;

    setDeletingCoaId(account.id);
    try {
      const data = await request(`/accounting/chart-of-accounts/${account.id}`, {
        method: "DELETE",
      });
      const message = data?.message || "Chart of account deleted successfully.";
      showToast.success(message);
      await fetchChartOfAccounts();
      await fetchFinancialSummary();
    } catch (err) {
      showAlert.error("Error", err.message || "Failed to delete chart of account");
    } finally {
      setDeletingCoaId(null);
    }
  };

  // Account Type Management Functions
  const handleCreateAccountType = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request("/account-types", {
        method: "POST",
        body: JSON.stringify(accountTypeForm),
      });
      if (data?.success && data?.account_type) {
        showToast.success("Account type created successfully.");
        await fetchAccountTypes();
        initialAccountTypeFormRef.current = null;
        handleCloseAccountTypeForm();
      } else {
        showAlert.error("Error", data?.message || "Failed to create account type");
      }
    } catch (err) {
      const msg = err.message || "Failed to create account type";
      if (err.message && err.message.includes("validation")) {
        const errors = {};
        if (msg.includes("code")) errors.code = "Code is required and must be unique.";
        if (msg.includes("name")) errors.name = "Name is required.";
        setFormErrors(errors);
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAccountType = async (e) => {
    e.preventDefault();
    if (!editingAccountType) return;
    setFormLoading(true);
    setFormErrors({});
    try {
      const data = await request(`/account-types/${editingAccountType.id}`, {
        method: "PUT",
        body: JSON.stringify(accountTypeForm),
      });
      if (data?.success && data?.account_type) {
        showToast.success("Account type updated successfully.");
        await fetchAccountTypes();
        initialEditAccountTypeFormRef.current = null;
        handleCloseEditAccountTypeForm();
      } else {
        showAlert.error("Error", data?.message || "Failed to update account type");
      }
    } catch (err) {
      const msg = err.message || "Failed to update account type";
      if (err.message && err.message.includes("validation")) {
        const errors = {};
        if (msg.includes("code")) errors.code = "Code is required and must be unique.";
        if (msg.includes("name")) errors.name = "Name is required.";
        setFormErrors(errors);
      } else {
        showAlert.error("Error", msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAccountType = async (type) => {
    if (!type) return;

    const result = await showAlert.confirm(
      "Delete Account Type",
      "Are you sure you want to delete this account type? If it is being used by any chart of accounts, it cannot be removed.",
      "Yes, Delete",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    try {
      setDeletingAccountTypeId(type.id);
      const data = await request(`/account-types/${type.id}`, {
        method: "DELETE",
      });
      if (data?.success) {
        showToast.success("Account type deleted successfully.");
        await fetchAccountTypes();
      } else {
        showAlert.error("Error", data?.message || "Failed to delete account type");
      }
    } catch (err) {
      const msg = err.message || "Failed to delete account type";
      showAlert.error("Error", msg);
    } finally {
      setDeletingAccountTypeId(null);
    }
  };

  const handleOpenAccountTypeForm = () => {
    const initial = {
      code: "",
      name: "",
      normal_balance: "DR",
      category: "expense",
      color: "#6c757d",
      icon: "",
      display_order: accountTypes.length,
      is_active: true,
    };
    setAccountTypeForm(initial);
    setFormErrors({});
    initialAccountTypeFormRef.current = JSON.stringify(initial);
    setShowAccountTypeForm(true);
  };

  const handleCloseAccountTypeForm = async () => {
    const hasChanges = initialAccountTypeFormRef.current != null && JSON.stringify(accountTypeForm) !== initialAccountTypeFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm("Unsaved Changes", "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.", "Yes, Close", "Continue Editing");
      if (!result.isConfirmed) return;
    }
    initialAccountTypeFormRef.current = null;
    setAccountTypeFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowAccountTypeForm(false);
    setAccountTypeForm({
      code: "",
      name: "",
      normal_balance: "DR",
      category: "expense",
      color: "#6c757d",
      icon: "",
      display_order: 0,
      is_active: true,
    });
    setFormErrors({});
    setAccountTypeFormClosing(false);
  };

  const handleOpenEditAccountTypeForm = (accountType) => {
    setEditingAccountType(accountType);
    const initial = {
      code: accountType.code || "",
      name: accountType.name || "",
      normal_balance: accountType.normal_balance || "DR",
      category: accountType.category || "expense",
      color: accountType.color || "#6c757d",
      icon: accountType.icon || "",
      display_order: accountType.display_order || 0,
      is_active: accountType.is_active !== false,
    };
    setAccountTypeForm(initial);
    setFormErrors({});
    initialEditAccountTypeFormRef.current = JSON.stringify(initial);
    setShowEditAccountTypeForm(true);
  };

  const handleCloseEditAccountTypeForm = async () => {
    const hasChanges = initialEditAccountTypeFormRef.current != null && JSON.stringify(accountTypeForm) !== initialEditAccountTypeFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm("Unsaved Changes", "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.", "Yes, Close", "Continue Editing");
      if (!result.isConfirmed) return;
    }
    initialEditAccountTypeFormRef.current = null;
    setEditAccountTypeFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowEditAccountTypeForm(false);
    setEditingAccountType(null);
    setAccountTypeForm({
      code: "",
      name: "",
      normal_balance: "DR",
      category: "expense",
      color: "#6c757d",
      icon: "",
      display_order: 0,
      is_active: true,
    });
    setFormErrors({});
    setEditAccountTypeFormClosing(false);
  };

  // Logo upload handlers
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert.error("Error", "Please select a valid image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert.error("Error", "Image size must be less than 2MB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /** Resize/compress image data URL to reduce payload (avoids MySQL max_allowed_packet and large requests). */
  const resizeLogoDataUrl = (dataUrl, maxSize = 800, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        let width = w;
        let height = h;
        if (w > maxSize || h > maxSize) {
          if (w >= h) {
            width = maxSize;
            height = Math.round((h * maxSize) / w);
          } else {
            height = maxSize;
            width = Math.round((w * maxSize) / h);
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const out = canvas.toDataURL("image/jpeg", quality);
          resolve(out);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  const handleLogoUpload = async () => {
    if (!logoFile && !logoPreview) {
      showAlert.error("Error", "Please select an image to upload");
      return;
    }

    if (!selectedAccountId) return;

    setLogoUploading(true);
    try {
      const rawData = logoPreview;
      const logoData = rawData.startsWith("data:image/") ? await resizeLogoDataUrl(rawData) : rawData;
      const data = await request(`/accounts/${selectedAccountId}/logo`, {
        method: "POST",
        body: JSON.stringify({ logo: logoData }),
      });

      if (data?.success && data?.account) {
        showToast.success("Logo uploaded successfully.");
        await fetchBusinessAccounts();
        const updatedAccount = businessAccounts.find((a) => a.id === selectedAccountId) || data.account;
        setCurrentAccount(updatedAccount);
        await getUser();
        setLogoFile(null);
      } else {
        showAlert.error("Error", data?.message || "Failed to upload logo");
      }
    } catch (err) {
      const msg = err.message || "Failed to upload logo";
      showAlert.error("Error", msg);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!selectedAccountId) return;

    if (!window.confirm("Are you sure you want to remove the logo?")) {
      return;
    }

    setLogoUploading(true);
    try {
      const data = await request(`/accounts/${selectedAccountId}`, {
        method: "PUT",
        body: JSON.stringify({ logo: null }),
      });

      if (data?.success && data?.account) {
        showToast.success("Logo removed successfully.");
        await fetchBusinessAccounts();
        const updatedAccount = businessAccounts.find((a) => a.id === selectedAccountId) || data.account;
        setCurrentAccount(updatedAccount);
        await getUser();
        setLogoPreview(null);
        setLogoFile(null);
      } else {
        showAlert.error("Error", data?.message || "Failed to remove logo");
      }
    } catch (err) {
      const msg = err.message || "Failed to remove logo";
      showAlert.error("Error", msg);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleToggleAccountActive = async () => {
    if (!selectedAccountId || !displayAccount) return;
    const nextActive = displayAccount.is_active === false;
    setActiveToggleSaving(true);
    try {
      const data = await request(`/accounts/${selectedAccountId}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (data?.success && data?.account) {
        showToast.success(nextActive ? "Account is now available in the account selector." : "Account is no longer available in the account selector.");
        await fetchBusinessAccounts();
        await refreshAccounts();
      } else {
        showAlert.error("Error", data?.message || "Failed to update status");
      }
    } catch (err) {
      showAlert.error("Error", err.message || "Failed to update status");
    } finally {
      setActiveToggleSaving(false);
    }
  };

  const handleOpenAccountForm = () => {
    const initial = { accountForm: { name: "", code: "", logo: null }, newAccountLogoPreview: null };
    setAccountForm(initial.accountForm);
    setNewAccountLogoPreview(null);
    setNewAccountLogoFile(null);
    setFormErrors({});
    initialAccountFormRef.current = JSON.stringify(initial);
    setShowAccountForm(true);
  };

  const handleCloseAccountForm = async () => {
    const hasChanges = initialAccountFormRef.current != null && JSON.stringify({ accountForm, newAccountLogoPreview }) !== initialAccountFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm("Unsaved Changes", "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.", "Yes, Close", "Continue Editing");
      if (!result.isConfirmed) return;
    }
    initialAccountFormRef.current = null;
    setAccountFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowAccountForm(false);
    setAccountForm({ name: "", code: "", logo: null });
    setNewAccountLogoPreview(null);
    setNewAccountLogoFile(null);
    setFormErrors({});
    setAccountFormClosing(false);
  };

  // Logo select handler for new account
  const handleNewAccountLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert.error("Error", "Please select a valid image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showAlert.error("Error", "Image size must be less than 10MB");
      return;
    }

    setNewAccountLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAccountLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEditAccountForm = () => {
    if (selectedAccount) {
      const initial = { name: selectedAccount.name || "", code: selectedAccount.code || "" };
      setAccountForm(initial);
      setFormErrors({});
      initialEditAccountFormRef.current = JSON.stringify(initial);
      setShowEditAccountForm(true);
    }
  };

  const handleCloseEditAccountForm = async () => {
    const hasChanges = initialEditAccountFormRef.current != null && JSON.stringify(accountForm) !== initialEditAccountFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm("Unsaved Changes", "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.", "Yes, Close", "Continue Editing");
      if (!result.isConfirmed) return;
    }
    initialEditAccountFormRef.current = null;
    setEditAccountFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowEditAccountForm(false);
    setAccountForm({ name: "", code: "" });
    setFormErrors({});
    setEditAccountFormClosing(false);
  };

  const handleOpenDeleteAccountModal = () => {
    if (!selectedAccount) return;
    if (businessAccounts.length <= 1) {
      showAlert.error(
        "Deletion Not Allowed",
        "The system must retain at least one business account. You cannot delete the only remaining account. Create another business account first if you need to remove this one."
      );
      return;
    }
    setDeleteAccountConfirmName("");
    initialDeleteConfirmRef.current = "";
    setShowDeleteAccountModal(true);
  };

  const handleCloseDeleteAccountModal = async () => {
    const hasProgress = initialDeleteConfirmRef.current != null && (deleteAccountConfirmName || "").trim() !== "";
    if (hasProgress) {
      const result = await showAlert.confirm("Lose Progress?", "You have entered text in the confirmation field. Are you sure you want to close without completing the action? You will lose your progress.", "Yes, Close", "Continue");
      if (!result.isConfirmed) return;
    }
    initialDeleteConfirmRef.current = null;
    setDeleteAccountModalClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowDeleteAccountModal(false);
    setDeleteAccountConfirmName("");
    setDeleteAccountModalClosing(false);
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccountId || !selectedAccount) return;
    if ((deleteAccountConfirmName || "").trim() !== (selectedAccount.name || "").trim()) {
      showAlert.error("Confirmation required", "Please type the exact business name to confirm deletion.");
      return;
    }
    setDeleteAccountLoading(true);
    try {
      const data = await request(`/accounts/${selectedAccountId}`, { method: "DELETE" });
      if (data?.success) {
        showToast.success("Business account deleted successfully.");
        initialDeleteConfirmRef.current = null;
        handleCloseDeleteAccountModal();
        await fetchBusinessAccounts();
        if (businessAccounts.length <= 1) {
          setSelectedAccountId(null);
          setCurrentAccount(null);
          await getUser();
        } else {
          const remaining = businessAccounts.filter((a) => a.id !== selectedAccountId);
          const next = remaining[0];
          setSelectedAccountId(next?.id ?? null);
          setCurrentAccount(next ?? null);
          await getUser();
        }
      } else {
        showAlert.error("Error", data?.message || "Failed to delete account");
      }
    } catch (err) {
      showAlert.error("Error", err.message || "Failed to delete account");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleOpenCoaForm = () => {
    const initial = {
      account_code: "",
      account_name: "",
      account_type_id: "",
      normal_balance: "",
      description: "",
      is_active: true,
    };
    setCoaForm(initial);
    setFormErrors({});
    initialCoaFormRef.current = JSON.stringify(initial);
    setShowCoaForm(true);
  };

  const handleCloseCoaForm = async () => {
    const hasChanges = initialCoaFormRef.current != null && JSON.stringify(coaForm) !== initialCoaFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm("Unsaved Changes", "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.", "Yes, Close", "Continue Editing");
      if (!result.isConfirmed) return;
    }
    initialCoaFormRef.current = null;
    setCoaFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowCoaForm(false);
    setCoaForm({
      account_code: "",
      account_name: "",
      account_type_id: "",
      normal_balance: "",
      description: "",
      is_active: true,
    });
    setFormErrors({});
    setCoaFormClosing(false);
  };

  const handleOpenEditCoaForm = (account) => {
    if (!account) return;
    const initial = {
      account_code: account.account_code || "",
      account_name: account.account_name || "",
      account_type_id: account.account_type_id || "",
      normal_balance: account.normal_balance || "",
      description: account.description || "",
      is_active: account.is_active !== false,
    };
    setEditingCoa(account);
    setCoaForm(initial);
    setFormErrors({});
    initialEditCoaFormRef.current = JSON.stringify(initial);
    setShowEditCoaForm(true);
  };

  const handleCloseEditCoaForm = async () => {
    const hasChanges =
      initialEditCoaFormRef.current != null &&
      JSON.stringify(coaForm) !== initialEditCoaFormRef.current;
    if (hasChanges) {
      const result = await showAlert.confirm(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close without saving? You will lose your progress.",
        "Yes, Close",
        "Continue Editing"
      );
      if (!result.isConfirmed) return;
    }
    initialEditCoaFormRef.current = null;
    setEditCoaFormClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowEditCoaForm(false);
    setEditingCoa(null);
    setCoaForm({
      account_code: "",
      account_name: "",
      account_type_id: "",
      normal_balance: "",
      description: "",
      is_active: true,
    });
    setFormErrors({});
    setEditCoaFormClosing(false);
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading && businessAccounts.length === 0) {
    return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading business accounts..." />
      </div>
    );
  }

  return (
    <motion.div
      className="container-fluid px-3 pt-0 pb-2 accounts-coa-page"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Page Header – same layout and styling as Personnel List top section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: theme.textPrimary }}
          >
            <FaBuilding className="me-2" />
                Business Accounts & Chart of Accounts
              </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                Centralized multi-entity accounting and financial structure management
              </p>
            </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  type="button"
            className="btn btn-sm btn-primary text-white"
              onClick={handleOpenAccountForm}
            title="Create new business account"
              style={{
              transition: "all 0.2s ease-in-out",
              borderWidth: "2px",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <i className="fas fa-plus me-1"></i>
              New Business
            </button>
        </div>
      </div>

      {/* Account Selector – same as Personnel List filter panel (combobox size, label, card) */}
      {businessAccounts.length > 0 && (
        <div
          className="card border-0 shadow-sm mb-3 accounts-coa-selector-card"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div className="card-body p-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-6" style={{ minWidth: 0 }}>
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Select Business Account
                </label>
                <div className="dropdown w-100 accounts-coa-business-select-dropdown">
                  <button
                    type="button"
                    className="form-select form-select-sm dropdown-toggle text-start d-flex align-items-center w-100"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    aria-haspopup="listbox"
                    aria-label="Select Business Account"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={selectedAccount?.name ?? ""}
                  >
                    <span className="text-truncate">
                      {selectedAccount ? selectedAccount.name : "Select Business Account"}
                    </span>
                  </button>
                  <ul
                    className="dropdown-menu w-100"
                    role="listbox"
                    style={{
                      maxWidth: "100%",
                      minWidth: 0,
                    }}
                >
                  {businessAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        role="option"
                        aria-selected={acc.id === selectedAccountId}
                      >
                        <button
                          type="button"
                          className="dropdown-item text-truncate small"
                          style={{ maxWidth: "100%" }}
                          onClick={() => handleAccountChange(Number(acc.id))}
                          title={
                            acc.is_active === false
                              ? `${acc.name} (Inactive)`
                              : acc.name
                          }
                        >
                      {acc.name}
                          {acc.is_active === false && (
                            <span className="text-muted ms-1">(Inactive)</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
              </div>
              </div>
              <div className="col-md-6 text-md-end">
                {selectedAccount && (
                  <div>
                    <label
                      className="form-label small fw-semibold mb-1 d-block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Current Account
                    </label>
                    <div
                      className="small fw-semibold px-3 py-2 rounded"
                      style={{
                        backgroundColor: "var(--background-light, #f5f7fb)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color, #e9ecef)",
                        cursor: "default",
                      }}
                      title={selectedAccount.name}
                    >
                      {selectedAccount.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Switching indicator – smooth transition when changing business account */}
      {coaLoading && selectedAccountId !== displayAccountId && (
        <div
          className="d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3 small fw-medium"
          style={{
            backgroundColor: "rgba(12, 32, 63, 0.06)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            transition: "opacity 0.25s ease",
          }}
        >
          <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ width: "1rem", height: "1rem" }}>
            <span className="visually-hidden">Loading</span>
              </div>
          <span>Switching account...</span>
            </div>
      )}

      {/* Summary Cards – corporate style with click to view full number (match CashBank/ActivityLog) */}
      {displayAccountId && financialSummary && (
        <AnimatePresence mode="wait">
          <motion.div
            key={displayAccountId}
            className="row g-3 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {[
              { key: "assets", label: "Total Assets", value: financialSummary.totalAssets, icon: FaWallet, color: "var(--primary-color)", borderLeft: "4px solid #198754" },
              { key: "liabilities", label: "Total Liabilities", value: financialSummary.totalLiabilities, icon: FaFileInvoice, color: "#d4a017", borderLeft: "4px solid #d4a017" },
              { key: "equity", label: "Total Equity", value: financialSummary.totalEquity, icon: FaBalanceScale, color: "#0d6efd", borderLeft: "4px solid #0d6efd" },
              { key: "revenue", label: "Revenue YTD", value: financialSummary.revenueYTD, icon: FaArrowUp, color: "#0d6efd", borderLeft: "4px solid #0d6efd" },
              { key: "expenses", label: "Expenses YTD", value: financialSummary.expensesYTD, icon: FaArrowDown, color: "#dc3545", borderLeft: "4px solid #dc3545" },
              { key: "netIncome", label: "Net Income YTD", value: financialSummary.netIncome, icon: FaChartLine, color: financialSummary.netIncome >= 0 ? "#198754" : "#dc3545", borderLeft: financialSummary.netIncome >= 0 ? "4px solid #198754" : "4px solid #dc3545" },
            ].map(({ key, label, value, icon: Icon, color, borderLeft }) => (
              <div key={key} className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card stats-card h-100 shadow-sm border-0"
                  style={{
                    borderLeft,
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--background-white)",
                  }}
                >
                  <div className="card-body p-2 p-md-3">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="text-uppercase mb-1 small fw-semibold" style={{ color: "var(--text-secondary)", fontSize: "0.7rem", letterSpacing: "0.02em" }}>
                          {label}
          </div>
                        <div
                          role="button"
                          tabIndex={0}
                          className="mb-0 fw-bold summary-card-value"
                          style={{
                            color,
                            fontSize: "clamp(0.9rem, 2.5vw, 1.25rem)",
                            lineHeight: 1.2,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => handleNumberClick(label, value, true)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNumberClick(label, value, true)}
                        >
                          {abbreviateNumber(value, true)}
              </div>
                        <div className="mt-1 d-flex align-items-center gap-1" style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontStyle: "italic" }}>
                          <FaEye style={{ fontSize: "0.6rem", opacity: 0.8 }} />
                          <span>Click to view full amount</span>
            </div>
          </div>
                      <div className="flex-shrink-0 ms-2 d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "rgba(0,0,0,0.04)" }}>
                        <Icon style={{ color, fontSize: "1.1rem" }} />
              </div>
            </div>
          </div>
              </div>
            </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Tabs – Settings-style: sidebar menu + content (render by displayAccountId for smooth switch) */}
      {displayAccountId ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={displayAccountId}
            className="row g-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
          <div className="col-12 col-lg-3">
            <div
              className="card border-0 h-100 accounts-coa-menu-card"
              style={{ boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
            >
              <div className="card-header bg-transparent border-0 py-2 py-md-3 px-2 px-md-3">
                <h6 className="mb-0 fw-bold small" style={{ color: theme.textPrimary }}>
                  Menu
                </h6>
              </div>
              <div className="card-body p-2 p-md-3">
                <div className="d-flex flex-row flex-lg-column flex-wrap gap-2">
                  {[
                    { id: "chart-of-accounts", label: "Chart of Accounts", subtitle: "View and manage accounts", icon: FaBook },
                    { id: "account-types", label: "Account Types", subtitle: "Manage account categories", icon: FaTag },
                    { id: "settings", label: "Settings", subtitle: "Business details and options", icon: FaCog },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`btn text-start p-2 p-lg-3 d-flex align-items-center border-0 position-relative flex-grow-1 flex-lg-grow-0 w-100 accounts-coa-tab-btn ${isActive ? "accounts-coa-tab-selected" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          background: isActive ? "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" : "#f8f9fa",
                          border: isActive ? "none" : "1px solid #dee2e6",
                          borderRadius: "8px",
                          color: isActive ? "white" : "#495057",
                          fontWeight: isActive ? "600" : "500",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            const el = e.currentTarget;
                            el.style.background = "#e9ecef";
                            el.style.transform = "translateY(-2px)";
                            el.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            const el = e.currentTarget;
                            el.style.background = "#f8f9fa";
                            el.style.transform = "translateY(0)";
                            el.style.boxShadow = "none";
                          }
                        }}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                          style={{
                            width: "36px",
                            height: "36px",
                            background: isActive ? "rgba(255, 255, 255, 0.2)" : "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                            color: "white",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="text-start">
                          <div className="fw-semibold" style={{ fontSize: "0.9rem" }}>
                            {tab.label}
                          </div>
                          <small
                            style={{
                              opacity: isActive ? 0.9 : 0.7,
                              fontSize: "0.75rem",
                            }}
                          >
                            {tab.subtitle}
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-9">
            <div
              className="card border-0 h-100 accounts-coa-content-card"
              style={{ boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
            >
              <div className="card-body px-3 px-md-4 py-4" style={{ overflow: "hidden" }}>
            <AnimatePresence mode="wait">
            {/* Chart of Accounts Tab */}
            {activeTab === "chart-of-accounts" && (
              <motion.div
                key="chart-of-accounts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-2"
                      style={{
                        width: "28px",
                        height: "28px",
                        background: "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                        color: "white",
                      }}
                    >
                      <FaBook size={14} />
                    </div>
                    <h6 className="mb-0 fw-bold" style={{ color: theme.textPrimary }}>
                      Chart of Accounts
                    </h6>
                  </div>
                  {selectedAccountId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center coa-tab-add-account-btn"
                      onClick={handleOpenCoaForm}
                      title="Add chart of account"
                      style={{
                        transition: "all 0.2s ease-in-out",
                        borderWidth: "2px",
                        borderRadius: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Add Account
                    </button>
                  )}
                </div>
                <div
                  className="alert alert-info mb-3 mb-md-4 small py-2 py-md-3"
                  style={{
                    backgroundColor: "rgba(31, 62, 109, 0.1)",
                    borderColor: "var(--primary-light)",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Note:</strong> Search and filter your chart of accounts below. Add accounts to build your chart.
                </div>
                {/* Filters */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Search
                    </label>
                    <div className="input-group input-group-sm">
                      <span
                        className="input-group-text"
                        style={{
                          backgroundColor: "var(--background-light)",
                          borderColor: "var(--input-border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <FaSearch size={12} />
                      </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by account code or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          borderColor: "var(--input-border)",
                          color: "var(--input-text)",
                        }}
                      />
                      {searchTerm && (
                        <button
                          className="btn btn-sm clear-search-btn"
                          type="button"
                          onClick={() => setSearchTerm("")}
                          style={{
                            color: "#6c757d",
                            backgroundColor: "transparent",
                            border: "none",
                            padding: "0.25rem 0.5rem",
                          }}
                          onMouseEnter={(e) => {
                            const icon = e.currentTarget.querySelector("i");
                            if (icon) icon.style.color = "white";
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.backgroundColor = "#dc3545";
                          }}
                          onMouseLeave={(e) => {
                            const icon = e.currentTarget.querySelector("i");
                            if (icon) icon.style.color = "#6c757d";
                            e.currentTarget.style.color = "#6c757d";
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <i className="fas fa-times" style={{ color: "inherit" }}></i>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Account Type
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      style={{
                        backgroundColor: "var(--input-bg)",
                        borderColor: "var(--input-border)",
                        color: "var(--input-text)",
                      }}
                    >
                      <option value="all">All Types</option>
                      {accountTypes
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                        .map((type) => (
                          <option key={type.code} value={type.code}>
                            {type.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Chart of Accounts by Type (no spinner when switching – content fades in when ready) */}
                {Object.keys(groupedAccounts).length === 0 ? (
                  chartOfAccounts.length === 0 ? (
                  <div className="text-center py-5">
                    <FaBook className="fa-3x text-muted mb-3" style={{ opacity: 0.5 }} />
                    <h5 className="mb-2" style={{ color: "var(--text-primary)" }}>
                      No chart of accounts yet
                    </h5>
                    <p className="text-muted small mb-3">
                      Start by adding accounts to your chart of accounts.
                    </p>
                      <div className="d-flex justify-content-center">
                    <button
                      type="button"
                          className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center"
                      onClick={handleOpenCoaForm}
                      style={{
                            transition: "all 0.2s ease-in-out",
                            borderWidth: "2px",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <i className="fas fa-plus me-1"></i>
                      Add First Account
                    </button>
                      </div>
                  </div>
                  ) : (
                    <div className="text-center py-5">
                      <FaSearch className="fa-3x text-muted mb-3" style={{ opacity: 0.5 }} />
                      <h5 className="mb-2" style={{ color: "var(--text-primary)" }}>
                        No accounts match your search or filter
                      </h5>
                      <p className="text-muted small mb-3">
                        Try a different search term or select &quot;All Types&quot; to see all accounts.
                      </p>
                      <div className="d-flex justify-content-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                          onClick={() => {
                            setSearchTerm("");
                            setFilterType("all");
                          }}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            borderWidth: "2px",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <i className="fas fa-times me-1"></i>
                          Clear search &amp; filters
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="accordion" id="accountTypesAccordion">
                    {Object.entries(groupedAccounts)
                      .sort(([a], [b]) => {
                        const typeA = accountTypeByCode[a];
                        const typeB = accountTypeByCode[b];
                        const orderA = typeA?.display_order || 999;
                        const orderB = typeB?.display_order || 999;
                        return orderA - orderB;
                      })
                      .map(([typeCode, typeAccounts]) => {
                        const accountType = accountTypeByCode[typeCode];
                        if (!accountType) return null;
                        const totalBalance = typeAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
                        const isExpanded = expandedTypes[typeCode];
                        return (
                          <div key={typeCode} className="accordion-item border rounded-3 mb-3">
                            <h2 className="accordion-header">
                              <button
                                className="accordion-button accounts-coa-accordion-toggle"
                                type="button"
                                onClick={() => toggleTypeExpansion(typeCode)}
                                style={{
                                  backgroundColor: "#f9fafb",
                                  color: theme.textPrimary,
                                  fontWeight: "600",
                                  border: "1px solid var(--border-color)",
                                  boxShadow: "none",
                                }}
                              >
                                <div className="d-flex flex-column flex-sm-row align-items-sm-center w-100">
                                  <div className="d-flex align-items-center flex-grow-1 min-w-0">
                                    <span
                                      className="me-2 flex-shrink-0"
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        backgroundColor: accountType.color || "#6c757d",
                                      }}
                                    ></span>
                                    <span className="me-2 fw-semibold">
                                      {accountType.name}
                                    </span>
                                    <span className="text-muted small">
                                      ({typeAccounts.length} accounts)
                                    </span>
                                  </div>
                                  <div className="d-flex align-items-center justify-content-sm-end mt-1 mt-sm-0">
                                    <span className="text-muted small me-2">
                                      Total:{" "}
                                      <span className="fw-semibold">
                                  {formatCurrency(totalBalance)}
                                </span>
                                    </span>
                                    {isExpanded ? (
                                      <FaChevronUp />
                                    ) : (
                                      <FaChevronDown />
                                    )}
                                  </div>
                                </div>
                              </button>
                            </h2>
                            <div className={`accordion-collapse coa-accordion-collapse ${isExpanded ? "show" : ""}`}>
                                <div className="accordion-body p-0">
                                  <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                      <thead className="table-light">
                                        <tr>
                                        <th className="small fw-semibold text-center coa-coa-actions-col">Actions</th>
                                          <th className="small fw-semibold">Code</th>
                                          <th className="small fw-semibold">Account Name</th>
                                          <th className="small fw-semibold">Category</th>
                                          <th className="small fw-semibold">Normal Balance</th>
                                          <th className="small fw-semibold text-end">Current Balance</th>
                                          <th className="small fw-semibold text-center">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {typeAccounts.map((account) => {
                                          const balance = account.balance || 0;
                                          return (
                                            <tr key={account.id}>
                                            <td className="text-start coa-coa-actions-col">
                                              <div className="d-inline-flex justify-content-start gap-2">
                                                <button
                                                  type="button"
                                                  className="btn btn-sm coa-action-btn coa-action-btn-edit d-flex align-items-center gap-1"
                                                  onClick={() => handleOpenEditCoaForm(account)}
                                                  disabled={formLoading || deletingCoaId === account.id}
                                                >
                                                  <FaEdit size={13} />
                                                  <span>Edit</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn btn-sm coa-action-btn coa-action-btn-delete d-flex align-items-center gap-1"
                                                  onClick={() => handleDeleteCoa(account)}
                                                  disabled={formLoading || deletingCoaId === account.id}
                                                >
                                                  <FaTrash size={13} />
                                                  <span>{deletingCoaId === account.id ? "Deleting..." : "Delete"}</span>
                                                </button>
                                              </div>
                                            </td>
                                              <td>
                                                <strong style={{ color: accountType.color || "#6c757d" }}>
                                                  {account.account_code}
                                                </strong>
                                              </td>
                                              <td>
                                                <span
                                                  className="coa-account-name"
                                                  title={account.account_name || ""}
                                                >
                                                  {account.account_name}
                                                </span>
                                              </td>
                                              <td>
                                                <span className="badge bg-secondary" title={account.account_type_category || ""}>
                                                  {getCategoryLabel(account.account_type_category)}
                                                </span>
                                              </td>
                                              <td>
                                                <span className={`badge ${account.normal_balance === "DR" ? "bg-danger" : "bg-success"}`}>
                                                  {account.normal_balance}
                                                </span>
                                              </td>
                                              <td className={`text-end ${getBalanceColor(balance, account.normal_balance)}`}>
                                              <span
                                                role="button"
                                                tabIndex={0}
                                                className="coa-balance-value"
                                                title={formatCurrency(balance)}
                                                onClick={() =>
                                                  handleNumberClick(
                                                    `Current Balance – ${account.account_code} ${account.account_name}`,
                                                    balance,
                                                    true
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" || e.key === " ") {
                                                    handleNumberClick(
                                                      `Current Balance – ${account.account_code} ${account.account_name}`,
                                                      balance,
                                                      true
                                                    );
                                                  }
                                                }}
                                              >
                                                {formatCurrency(balance)}
                                              </span>
                                              </td>
                                              <td className="text-center">
                                                <span className={`badge ${account.is_active ? "bg-success" : "bg-secondary"}`}>
                                                  {account.is_active ? "Active" : "Inactive"}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Summary – corporate cards with click-to-view full amount */}
                {chartOfAccounts.length > 0 && (
                  <div className="card border-0 shadow-sm mt-4" style={{ backgroundColor: "#f8f9fa" }}>
                    <div className="card-body py-3 py-md-4">
                      <div className="row g-3 g-md-4 text-center">
                        <div className="col-6 col-md-3">
                          <div className="d-flex flex-column h-100 justify-content-center">
                            <span className="text-muted small text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                              Total Accounts
                            </span>
                            <span className="fw-bold" style={{ fontSize: "1.3rem", color: theme.textPrimary }}>
                              {chartOfAccounts.length}
                            </span>
                        </div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="d-flex flex-column h-100 justify-content-center">
                            <span className="text-muted small text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                              Active Accounts
                            </span>
                            <span className="fw-bold text-success" style={{ fontSize: "1.3rem" }}>
                            {chartOfAccounts.filter((a) => a.is_active).length}
                            </span>
                        </div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="d-flex flex-column h-100 justify-content-center">
                            <span className="text-muted small text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                              Filtered Results
                            </span>
                            <span className="fw-bold" style={{ fontSize: "1.3rem", color: theme.textPrimary }}>
                              {filteredChartOfAccounts.length}
                            </span>
                        </div>
                      </div>
                        <div className="col-6 col-md-3">
                          <div className="d-flex flex-column h-100 justify-content-center">
                            <span className="text-muted small text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                              Total Balance
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="fw-bold summary-card-value"
                              style={{
                                fontSize: "1.1rem",
                                color: theme.primary,
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                              onClick={() =>
                                handleNumberClick(
                                  "Total Balance (All Accounts)",
                                  chartOfAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
                                  true
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleNumberClick(
                                    "Total Balance (All Accounts)",
                                    chartOfAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
                                    true
                                  );
                                }
                              }}
                            >
                              {abbreviateNumber(
                                chartOfAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
                                true
                              )}
                          </span>
                            <small className="text-muted mt-1" style={{ fontSize: "0.7rem", fontStyle: "italic" }}>
                              Click to view full amount
                            </small>
                        </div>
                      </div>
                    </div>
                  </div>
                      </div>
                )}
              </motion.div>
            )}

            {/* Account Types Tab */}
            {activeTab === "account-types" && (
              <motion.div
                key="account-types"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                className="account-types-tab-content"
              >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-2"
                      style={{
                        width: "28px",
                        height: "28px",
                        background: "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                        color: "white",
                      }}
                    >
                      <FaTag size={14} />
                    </div>
                    <h6 className="mb-0 fw-bold" style={{ color: theme.textPrimary }}>
                      Manage Account Types
                    </h6>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center account-types-add-btn"
                    onClick={handleOpenAccountTypeForm}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      borderWidth: "2px",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <i className="fas fa-plus me-1"></i>
                    Add Account Type
                  </button>
                </div>
                <div
                  className="alert alert-info mb-3 mb-md-4 small py-2 py-md-3"
                  style={{
                    backgroundColor: "rgba(31, 62, 109, 0.1)",
                    borderColor: "var(--primary-light)",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Note:</strong> Account types categorize your chart of accounts. You can add, edit, or delete account types here. Account types that are in use cannot be deleted.
                </div>
                {accountTypes.length === 0 ? (
                  <div className="text-center py-5">
                    <FaTag className="fa-3x text-muted mb-3" style={{ opacity: 0.5 }} />
                    <h5 className="mb-2" style={{ color: "var(--text-primary)" }}>
                      No account types yet
                    </h5>
                    <p className="text-muted small mb-3">
                      Start by adding your first account type.
                    </p>
                    <div className="d-flex justify-content-center">
                    <button
                      type="button"
                        className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center"
                      onClick={handleOpenAccountTypeForm}
                      style={{
                        transition: "all 0.2s ease-in-out",
                        borderWidth: "2px",
                        borderRadius: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Add First Account Type
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle account-types-table">
                      <thead className="table-light">
                        <tr>
                          <th className="small fw-semibold text-center coa-coa-actions-col" style={{ width: "160px" }}>
                            # / Actions
                          </th>
                          <th className="small fw-semibold" style={{ width: "40%" }}>
                            Name
                          </th>
                          <th className="small fw-semibold">Category</th>
                          <th className="small fw-semibold">Normal Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountTypes
                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                          .map((type, index) => (
                            <tr key={type.id}>
                              <td className="text-start coa-coa-actions-col">
                                <div className="d-inline-flex justify-content-start align-items-center gap-2">
                                  <span className="fw-bold small" style={{ minWidth: "20px", textAlign: "right" }}>
                                    {index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm coa-action-btn coa-action-btn-edit d-flex align-items-center gap-1"
                                    onClick={() => handleOpenEditAccountTypeForm(type)}
                                    title="Edit account type"
                                    disabled={formLoading || deletingAccountTypeId === type.id}
                                  >
                                    <FaEdit size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm coa-action-btn coa-action-btn-delete d-flex align-items-center gap-1"
                                    onClick={() => handleDeleteAccountType(type)}
                                    title="Delete account type"
                                    disabled={formLoading || deletingAccountTypeId === type.id}
                                  >
                                    <FaTrash size={13} />
                                    <span>{deletingAccountTypeId === type.id ? "Deleting..." : "Delete"}</span>
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span
                                  className="fw-semibold"
                                  style={{
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "inline-block",
                                    maxWidth: "100%",
                                  }}
                                  title={type.name}
                                >
                                  {type.name}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-secondary" title={type.category || ""}>
                                  {getCategoryLabel(type.category)}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${type.normal_balance === "DR" ? "bg-danger" : "bg-success"}`}>
                                  {type.normal_balance}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                className="d-flex flex-column h-100 settings-tab-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="d-flex align-items-center mb-3 mb-md-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-2"
                    style={{
                      width: "28px",
                      height: "28px",
                      background: "linear-gradient(135deg, #1f3e6d 0%, #0c203f 100%)",
                      color: "white",
                    }}
                  >
                    <FaCog size={14} />
                  </div>
                  <h6 className="mb-0 fw-bold settings-tab-title" style={{ color: theme.textPrimary }}>
                    Account Settings
                  </h6>
                </div>
                
                {/* Business Logo */}
                <div className="card border-0 rounded-3 shadow-sm settings-tab-card mb-3 mb-md-4">
                  <div className="card-header bg-transparent border-0 border-bottom py-3 px-3 px-md-4 settings-tab-card-header">
                    <h6 className="mb-0 fw-bold small text-uppercase" style={{ color: theme.textSecondary, letterSpacing: "0.04em" }}>Business Logo</h6>
                  </div>
                  <div className="card-body p-3 p-md-4">
                    <div className="row g-3 g-md-4 align-items-start">
                      <div className="col-12 col-md-4">
                        <div className="text-center px-2">
                          {logoPreview ? (
                            <div className="position-relative d-inline-block">
                              <img
                                src={logoPreview}
                                alt="Business Logo"
                                className="img-fluid rounded-3 shadow-sm"
                                style={{
                                  maxWidth: "100%",
                                  width: "200px",
                                  height: "200px",
                                  objectFit: "contain",
                                  backgroundColor: "#f8f9fa",
                                  padding: "12px",
                                }}
                              />
                              {logoFile && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: "32px", height: "32px", padding: 0 }}
                                  onClick={() => {
                                    setLogoPreview(displayAccount?.logo || null);
                                    setLogoFile(null);
                                  }}
                                >
                                  <FaTimes size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div
                              className="d-flex align-items-center justify-content-center rounded-3 mx-auto"
                              style={{
                                width: "100%",
                                maxWidth: "200px",
                                height: "200px",
                                backgroundColor: "#f8f9fa",
                                border: "2px dashed #dee2e6",
                              }}
                            >
                              <div className="text-center px-2">
                                <FaImage className="fa-2x text-muted mb-2" style={{ opacity: 0.5 }} />
                                <p className="text-muted small mb-0">No logo</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-md-8">
                        <label className="form-label small fw-semibold mb-2" style={{ color: theme.textPrimary }}>Upload Logo</label>
                          <input
                            type="file"
                          className="form-control mb-2"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            disabled={logoUploading}
                          />
                        <small className="text-muted d-block mb-3" style={{ fontSize: "0.8rem" }}>
                          Recommended: Square image, max 10MB. PNG, JPG, or GIF.
                          </small>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center settings-tab-btn-primary"
                            onClick={handleLogoUpload}
                            disabled={logoUploading || (!logoFile && !logoPreview)}
                            style={{
                              transition: "all 0.2s ease-in-out",
                              borderWidth: "2px",
                              borderRadius: "4px",
                            }}
                            onMouseEnter={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "none";
                            }}
                          >
                            {logoUploading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-upload me-1"></i>
                                {logoPreview && !logoFile ? "Update Logo" : "Upload Logo"}
                              </>
                            )}
                          </button>
                          {displayAccount?.logo && (
                            <button
                              type="button"
                              className="btn btn-sm text-white d-flex align-items-center justify-content-center"
                              onClick={handleLogoRemove}
                              disabled={logoUploading}
                              style={{
                                transition: "all 0.2s ease-in-out",
                                borderWidth: "2px",
                                borderRadius: "4px",
                                backgroundColor: "#dc3545",
                                borderColor: "#dc3545",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                                  e.target.style.backgroundColor = "#bb2d3b";
                                  e.target.style.borderColor = "#bb2d3b";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                                e.target.style.backgroundColor = "#dc3545";
                                e.target.style.borderColor = "#dc3545";
                              }}
                            >
                              <FaTimes className="me-1" />
                              Remove Logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="card border-0 rounded-3 shadow-sm settings-tab-card mb-3 mb-md-4">
                  <div className="card-header bg-transparent border-0 border-bottom py-3 px-3 px-md-4 settings-tab-card-header">
                    <h6 className="mb-0 fw-bold small text-uppercase" style={{ color: theme.textSecondary, letterSpacing: "0.04em" }}>Account Details</h6>
                  </div>
                  <div className="card-body p-3 p-md-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold mb-1" style={{ color: theme.textPrimary }}>Business Name</label>
                          <input
                            type="text"
                          className="form-control settings-business-name-readonly"
                          value={displayAccount?.name || ""}
                            readOnly
                          tabIndex={-1}
                          onFocus={(e) => e.target.blur()}
                          />
                        </div>
                      </div>
                    <div className="mt-3 mt-md-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary text-white d-flex align-items-center justify-content-center settings-tab-edit-details-btn"
                        onClick={handleOpenEditAccountForm}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          borderWidth: "2px",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <i className="fas fa-edit me-1"></i>
                        Edit Account Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account availability */}
                <div className="card border-0 rounded-3 shadow-sm settings-tab-card mb-3 mb-md-4">
                  <div className="card-header bg-transparent border-0 border-bottom py-3 px-3 px-md-4 settings-tab-card-header">
                    <h6 className="mb-0 fw-bold small text-uppercase" style={{ color: theme.textSecondary, letterSpacing: "0.04em" }}>Account availability</h6>
                  </div>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
                      <div className="min-w-0">
                        <div className="fw-semibold mb-1" style={{ color: theme.textPrimary }}>
                          {displayAccount?.is_active !== false ? "Active" : "Inactive"}
                        </div>
                        <small className="text-muted d-block" style={{ fontSize: "0.8rem", lineHeight: 1.4 }}>
                          {displayAccount?.is_active !== false
                            ? "Available in the account selector for authorized users."
                            : "Not listed in the account selector. Manageable only from this page."}
                        </small>
                      </div>
                      <div className="form-check form-switch mb-0 flex-shrink-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="account-active-toggle"
                          checked={displayAccount?.is_active !== false}
                          onChange={handleToggleAccountActive}
                          disabled={activeToggleSaving}
                          style={{ cursor: activeToggleSaving ? "not-allowed" : "pointer", width: "2.5em", height: "1.25em" }}
                        />
                        <label className="form-check-label fw-medium ms-2" htmlFor="account-active-toggle" style={{ cursor: activeToggleSaving ? "not-allowed" : "pointer" }}>
                          {activeToggleSaving ? "Updating..." : (displayAccount?.is_active !== false ? "Active" : "Inactive")}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedAccountId && selectedAccount && (
                  <div className="d-flex flex-column flex-md-row justify-content-end align-items-stretch align-items-md-center gap-2 mt-auto pt-4 settings-tab-delete-section">
                    <button
                      type="button"
                      className="btn btn-sm text-white d-flex align-items-center justify-content-center settings-tab-delete-business-btn"
                      onClick={handleOpenDeleteAccountModal}
                      title="Delete business account"
                      style={{
                        transition: "all 0.2s ease-in-out",
                        borderWidth: "2px",
                        borderRadius: "4px",
                        backgroundColor: "#dc3545",
                        borderColor: "#dc3545",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                          e.target.style.backgroundColor = "#bb2d3b";
                          e.target.style.borderColor = "#bb2d3b";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                        e.target.style.backgroundColor = "#dc3545";
                        e.target.style.borderColor = "#dc3545";
                      }}
                    >
                      <i className="fas fa-trash me-1"></i>
                      Delete Business
                    </button>
              </div>
            )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
            </div>
          </div>
        </motion.div>
        </AnimatePresence>
      ) : coaLoading && selectedAccountId ? (
        <div className="card border-0 rounded-3 accounts-coa-card" style={{ boxShadow: theme.cardShadow }}>
          <div className="card-body text-center py-5">
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
              <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }}>
                <span className="visually-hidden">Loading</span>
              </div>
            </div>
            <h5 className="mb-2 fw-bold" style={{ color: theme.textPrimary }}>
              Loading account...
            </h5>
            <p className="text-muted small mb-0">
              Please wait while we load the business account.
            </p>
          </div>
        </div>
      ) : (
        <div className="card border-0 rounded-3 accounts-coa-card" style={{ boxShadow: theme.cardShadow }}>
          <div className="card-body text-center py-5">
            <FaBuilding className="fa-3x text-muted mb-3" style={{ opacity: 0.5 }} />
            <h5 className="mb-2 fw-bold" style={{ color: theme.textPrimary }}>
              No business account selected
            </h5>
            <p className="text-muted small mb-3">
              Select a business account above or create a new one to get started.
            </p>
            <button
              type="button"
              className="btn btn-primary accounts-coa-btn accounts-coa-btn-primary btn-smooth"
              onClick={handleOpenAccountForm}
              style={{
                background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                border: "none",
                boxShadow: "0 4px 12px rgba(12, 32, 63, 0.25)",
              }}
            >
              <FaPlus className="me-2" />
              Create Business Account
            </button>
          </div>
        </div>
      )}

      {/* Create Business Account Modal – Portal + animations */}
      {showAccountForm && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${accountFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseAccountForm()}
          >
            <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${accountFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaBuilding className="me-2" />
                    Create Business Account
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseAccountForm}
                    disabled={formLoading}
                  />
                </div>
                <form onSubmit={handleCreateAccount}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <p className="text-muted small mb-3">
                      Register a new business entity to manage its financial records and accounting operations. Administrative access will be granted automatically upon creation.
                    </p>
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Business Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                            value={accountForm.name}
                            onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Bakery Store"
                            disabled={formLoading}
                          />
                          {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Business Logo (optional)</label>
                        <div className="row align-items-start">
                          <div className="col-md-4 mb-3 mb-md-0">
                            <div className="text-center">
                              {newAccountLogoPreview ? (
                                <div className="position-relative d-inline-block">
                                  <img
                                    src={newAccountLogoPreview}
                                    alt="Logo Preview"
                                    className="img-fluid rounded shadow-sm"
                                    style={{
                                      maxWidth: "120px",
                                      maxHeight: "120px",
                                      objectFit: "contain",
                                      backgroundColor: "#f8f9fa",
                                      padding: "8px",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                    onClick={() => {
                                      setNewAccountLogoPreview(null);
                                      setNewAccountLogoFile(null);
                                    }}
                                    style={{ borderRadius: "50%", width: "24px", height: "24px", padding: 0, fontSize: "10px" }}
                                  >
                                    <FaTimes />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="d-flex align-items-center justify-content-center rounded"
                                  style={{
                                    width: "120px",
                                    height: "120px",
                                    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                                    border: "2px solid #dee2e6",
                                    margin: "0 auto",
                                  }}
                                >
                                  <div className="text-center">
                                    <div
                                      className="d-flex align-items-center justify-content-center mx-auto"
                                      style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "8px",
                                        background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)",
                                        color: "white",
                                        boxShadow: "0 2px 8px rgba(12, 32, 63, 0.2)",
                                      }}
                                    >
                                      <FaBuilding size={24} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-md-8">
                            <input
                              type="file"
                              className="form-control"
                              accept="image/*"
                              onChange={handleNewAccountLogoSelect}
                              disabled={formLoading}
                            />
                            <small className="text-muted d-block mt-1">
                              Recommended: Square image, max 10MB. PNG, JPG, or GIF format.
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseAccountForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !accountForm.name?.trim()}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creating...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Business Account Modal – Portal + animations */}
      {showEditAccountForm && selectedAccount && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${editAccountFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseEditAccountForm()}
          >
            <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${editAccountFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaEdit className="me-2" />
                    Edit Business Account
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseEditAccountForm}
                    disabled={formLoading}
                  />
                </div>
                <form onSubmit={handleUpdateAccount}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="mb-0">
                      <label className="form-label fw-semibold">Business Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                        value={accountForm.name}
                        onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Bakery Store"
                        disabled={formLoading}
                      />
                      {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                    </div>
                  </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseEditAccountForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !accountForm.name?.trim()}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Updating...
                        </>
                      ) : (
                        "Update Account"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Business Account – confirm by retyping name */}
      {showDeleteAccountModal && selectedAccount && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${deleteAccountModalClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseDeleteAccountModal()}
          >
            <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${deleteAccountModalClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 bg-danger text-white modal-smooth">
                  <h5 className="modal-title fw-bold d-flex align-items-center">
                    <FaTrash className="me-2" />
                    Delete Business Account
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseDeleteAccountModal}
                    disabled={deleteAccountLoading}
                  />
                </div>
                <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  <p className="fw-semibold text-danger mb-2">
                    This action is permanent and cannot be undone.
                  </p>
                  <p className="text-muted small mb-3">
                    Deleting <strong>"{selectedAccount.name}"</strong> will permanently remove this business account and <strong>all of its data</strong>, including:
                  </p>
                  <ul className="small text-muted mb-3 ps-3">
                    <li>Chart of accounts</li>
                    <li>Journal entries and transaction history</li>
                    <li>Clients, suppliers, invoices, bills, and payments</li>
                    <li>Reports and financial data</li>
                  </ul>
                  <label className="form-label fw-semibold">
                    Type the business name below to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={selectedAccount.name}
                    value={deleteAccountConfirmName}
                    onChange={(e) => setDeleteAccountConfirmName(e.target.value)}
                    disabled={deleteAccountLoading}
                    autoComplete="off"
                  />
                </div>
                <div className="modal-footer border-0 py-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-smooth"
                    onClick={handleCloseDeleteAccountModal}
                    disabled={deleteAccountLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-smooth"
                    disabled={
                      deleteAccountLoading ||
                      (deleteAccountConfirmName || "").trim() !== (selectedAccount.name || "").trim()
                    }
                    onClick={handleDeleteAccount}
                  >
                    {deleteAccountLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FaTrash className="me-2" />
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Create Chart of Account Modal – Portal + animations */}
      {showCoaForm && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${coaFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseCoaForm()}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${coaFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaBook className="me-2" />
                    Add Chart of Account
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseCoaForm}
                    disabled={formLoading}
                  />
                </div>
                <form onSubmit={handleCreateCoa}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Code <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.account_code ? "is-invalid" : ""}`}
                          value={coaForm.account_code}
                          onChange={(e) => setCoaForm((f) => ({ ...f, account_code: e.target.value.toUpperCase() }))}
                          placeholder="e.g. 1010"
                          disabled={formLoading}
                          maxLength={10}
                        />
                        {formErrors.account_code && <div className="invalid-feedback">{formErrors.account_code}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.account_name ? "is-invalid" : ""}`}
                          value={coaForm.account_name}
                          onChange={(e) => setCoaForm((f) => ({ ...f, account_name: e.target.value }))}
                          placeholder="e.g. Cash on Hand"
                          disabled={formLoading}
                        />
                        {formErrors.account_name && <div className="invalid-feedback">{formErrors.account_name}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Type <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${formErrors.account_type_id ? "is-invalid" : ""}`}
                          value={coaForm.account_type_id}
                          onChange={(e) => {
                            const typeId = Number(e.target.value);
                            const accountType = accountTypeById[typeId];
                            setCoaForm((f) => ({
                              ...f,
                              account_type_id: typeId,
                              normal_balance: accountType?.normal_balance || "",
                            }));
                          }}
                          disabled={formLoading}
                        >
                          <option value="">Select Account Type</option>
                          {accountTypes
                            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                            .map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                        </select>
                        {formErrors.account_type_id && <div className="invalid-feedback">{formErrors.account_type_id}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Normal Balance</label>
                        <div className="form-control bg-light-subtle" style={{ cursor: "default" }}>
                          {coaForm.normal_balance || "Select an account type to determine normal balance"}
                      </div>
                        {!formErrors.normal_balance && (
                          <small className="text-muted">
                            Normal balance is determined automatically by the selected account type.
                          </small>
                        )}
                        {formErrors.normal_balance && (
                          <div className="invalid-feedback d-block">{formErrors.normal_balance}</div>
                        )}
                      </div>
                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={coaForm.is_active}
                            onChange={(e) => setCoaForm((f) => ({ ...f, is_active: e.target.checked }))}
                            disabled={formLoading}
                            id="coaIsActive"
                          />
                          <label className="form-check-label" htmlFor="coaIsActive">
                            Active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseCoaForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !coaForm.account_code || !coaForm.account_name || !coaForm.account_type_id || !coaForm.normal_balance}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creating...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Chart of Account Modal – Portal + animations */}
      {showEditCoaForm && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${editCoaFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseEditCoaForm()}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${editCoaFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaBook className="me-2" />
                    Edit Chart of Account
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseEditCoaForm}
                    disabled={formLoading}
                  />
                </div>
                <form onSubmit={handleUpdateCoa}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Code <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.account_code ? "is-invalid" : ""}`}
                          value={coaForm.account_code}
                          onChange={(e) => setCoaForm((f) => ({ ...f, account_code: e.target.value.toUpperCase() }))}
                          placeholder="e.g. 1010"
                          disabled={formLoading}
                          maxLength={10}
                        />
                        {formErrors.account_code && <div className="invalid-feedback">{formErrors.account_code}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.account_name ? "is-invalid" : ""}`}
                          value={coaForm.account_name}
                          onChange={(e) => setCoaForm((f) => ({ ...f, account_name: e.target.value }))}
                          placeholder="e.g. Cash on Hand"
                          disabled={formLoading}
                        />
                        {formErrors.account_name && <div className="invalid-feedback">{formErrors.account_name}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Account Type <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${formErrors.account_type_id ? "is-invalid" : ""}`}
                          value={coaForm.account_type_id}
                          onChange={(e) => {
                            const typeId = Number(e.target.value);
                            const accountType = accountTypeById[typeId];
                            setCoaForm((f) => ({
                              ...f,
                              account_type_id: typeId,
                              normal_balance: accountType?.normal_balance || f.normal_balance,
                            }));
                          }}
                          disabled={formLoading}
                        >
                          <option value="">Select Account Type</option>
                          {accountTypes
                            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                            .map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                        </select>
                        {formErrors.account_type_id && <div className="invalid-feedback">{formErrors.account_type_id}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Normal Balance</label>
                        <div className="form-control bg-light-subtle" style={{ cursor: "default" }}>
                          {coaForm.normal_balance || "Select an account type to determine normal balance"}
                      </div>
                        {!formErrors.normal_balance && (
                          <small className="text-muted">
                            Normal balance is determined automatically by the selected account type.
                          </small>
                        )}
                        {formErrors.normal_balance && (
                          <div className="invalid-feedback d-block">{formErrors.normal_balance}</div>
                        )}
                      </div>
                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={coaForm.is_active}
                            onChange={(e) => setCoaForm((f) => ({ ...f, is_active: e.target.checked }))}
                            disabled={formLoading}
                            id="editCoaIsActive"
                          />
                          <label className="form-check-label" htmlFor="editCoaIsActive">
                            Active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseEditCoaForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !coaForm.account_code || !coaForm.account_name || !coaForm.account_type_id || !coaForm.normal_balance}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Create Account Type Modal – Portal + animations */}
      {showAccountTypeForm && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${accountTypeFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseAccountTypeForm()}
          >
            <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${accountTypeFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaTag className="me-2" />
                    Create Account Type
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseAccountTypeForm}
                    disabled={formLoading}
                  />
                      </div>
                <form onSubmit={handleCreateAccountType}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                          value={accountTypeForm.name}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Assets"
                          disabled={formLoading}
                        />
                        {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Normal Balance <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={accountTypeForm.normal_balance}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, normal_balance: e.target.value }))}
                          disabled={formLoading}
                        >
                          <option value="DR">Debit (DR)</option>
                          <option value="CR">Credit (CR)</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Category</label>
                        <select
                          className="form-select"
                          value={accountTypeForm.category || "expense"}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, category: e.target.value }))}
                          disabled={formLoading}
                        >
                          {ACCOUNT_TYPE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <small className="text-muted">Determines where this type appears (e.g. expense dropdown, income dropdown).</small>
                      </div>
                      </div>
                  </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseAccountTypeForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !accountTypeForm.name}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creating...
                        </>
                      ) : (
                        "Create Account Type"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Account Type Modal – Portal + animations (match other modals) */}
      {showEditAccountTypeForm && editingAccountType && (
        <Portal>
          <div
            className={`modal fade show d-block modal-backdrop-animation ${editAccountTypeFormClosing ? "exit" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => e.target === e.currentTarget && handleCloseEditAccountTypeForm()}
          >
            <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
              <div
                className={`modal-content border-0 rounded-3 modal-content-animation ${editAccountTypeFormClosing ? "exit" : ""}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header border-0 rounded-top-3 py-3 text-white modal-smooth" style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)" }}>
                  <h5 className="modal-title fw-bold">
                    <FaEdit className="me-2" />
                    Edit Account Type
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-smooth"
                    aria-label="Close"
                    onClick={handleCloseEditAccountTypeForm}
                          disabled={formLoading}
                        />
                      </div>
                <form onSubmit={handleUpdateAccountType}>
                  <div className="modal-body bg-light modal-smooth" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                          value={accountTypeForm.name}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Assets"
                          disabled={formLoading}
                        />
                        {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Normal Balance <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={accountTypeForm.normal_balance}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, normal_balance: e.target.value }))}
                            disabled={formLoading}
                        >
                          <option value="DR">Debit (DR)</option>
                          <option value="CR">Credit (CR)</option>
                        </select>
                        </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Category</label>
                        <select
                          className="form-select"
                          value={accountTypeForm.category || "expense"}
                          onChange={(e) => setAccountTypeForm((f) => ({ ...f, category: e.target.value }))}
                          disabled={formLoading}
                        >
                          {ACCOUNT_TYPE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <small className="text-muted">Determines where this type appears (e.g. expense dropdown, income dropdown).</small>
                      </div>
                      </div>
                    </div>
                  <div className="modal-footer border-0 py-3">
                    <button type="button" className="btn btn-secondary btn-smooth" onClick={handleCloseEditAccountTypeForm} disabled={formLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-smooth"
                      disabled={formLoading || !accountTypeForm.name}
                      style={{ background: "linear-gradient(135deg, #0c203f 0%, #1f3e6d 100%)", border: "none", boxShadow: "0 4px 12px rgba(12,32,63,0.3)" }}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Updating...
                        </>
                      ) : (
                        "Update Account Type"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {numberViewModal.show && (
        <NumberViewModal
          title={numberViewModal.title}
          value={numberViewModal.formattedValue}
          onClose={() => setNumberViewModal({ ...numberViewModal, show: false })}
        />
      )}
    </motion.div>
  );
};

export default UnifiedAccountManagement;
