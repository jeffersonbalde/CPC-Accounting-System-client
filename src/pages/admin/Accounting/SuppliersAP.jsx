import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  FaTruck,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileInvoice,
  FaMoneyBillWave,
  FaEye,
  FaSyncAlt,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaFileExcel,
  FaFilePdf,
  FaBan,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import Footprint from "../../../components/Footprint";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import AuthorizationCodeModal from "../../../components/AuthorizationCodeModal";

const SuppliersAP = () => {
  const { request, isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [bills, setBills] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("suppliers");

  // Pagination & filter
  const [suppliersPage, setSuppliersPage] = useState(1);
  const [billsPage, setBillsPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Ledger tab (per selected supplier)
  const [ledgerSupplierId, setLedgerSupplierId] = useState("");
  const [ledgerPayments, setLedgerPayments] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSelectedRow, setLedgerSelectedRow] = useState(null);

  // Number view modal
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  // Modal states
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierViewModal, setShowSupplierViewModal] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [authCodeModal, setAuthCodeModal] = useState({
    show: false,
    type: null,
    entity: null,
    error: null,
  });
  const [authCodeSubmitting, setAuthCodeSubmitting] = useState(false);
  const [authCodesRequired, setAuthCodesRequired] = useState(true);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    notes: "",
  });

  const [billForm, setBillForm] = useState({
    supplier_id: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: "",
    expense_account_id: "",
    total_amount: "",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    bill_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    cash_account_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
    fetchBills();
    fetchExpenseAccounts();
    fetchCashAccounts();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAuthCodes = async () => {
      try {
        const data = await request("/authorization-codes/has-active");
        if (isMounted) setAuthCodesRequired(!!data?.has_codes);
      } catch (err) {
        if (isMounted) setAuthCodesRequired(true);
      }
    };
    checkAuthCodes();
    return () => {
      isMounted = false;
    };
  }, [request]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await request("/accounting/suppliers?active_only=true");
      setSuppliers(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      const data = await request("/accounting/bills?per_page=50");
      setBills(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const fetchLedgerPayments = async (supplierId) => {
    if (!supplierId) {
      setLedgerPayments([]);
      return;
    }
    try {
      setLedgerLoading(true);
      const data = await request(
        `/accounting/payments?payment_type=payment&supplier_id=${supplierId}&per_page=500`,
      );
      const list = Array.isArray(data) ? data : data?.data || [];
      setLedgerPayments(list);
    } catch (error) {
      console.error("Error fetching ledger payments:", error);
      showToast.error("Failed to load supplier ledger payments");
      setLedgerPayments([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const fetchExpenseAccounts = async () => {
    try {
      // Same as Journal Entries: load all active COA then filter (ensures dropdown populates)
      const data = await request(
        "/accounting/chart-of-accounts?active_only=true",
      );
      const all = Array.isArray(data) ? data : data?.data || [];
      const list = all.filter((acc) => {
        if (acc.account_type_category === "expense") return true;
        if (!acc.account_type_category) {
          if (
            acc.account_type === "OPERATING_EXPENSES" ||
            acc.account_type === "COST_OF_SERVICES"
          )
            return true;
        }
        return false;
      });
      setExpenseAccounts(list);
    } catch (error) {
      console.error("Error fetching expense accounts:", error);
      setExpenseAccounts([]);
    }
  };

  const fetchCashAccounts = async () => {
    try {
      const data = await request(
        "/accounting/chart-of-accounts?active_only=true",
      );
      const list = Array.isArray(data) ? data : data?.data || [];
      const cash = list.filter((acc) =>
        ["1010", "1020", "1030"].includes(acc.account_code),
      );
      setCashAccounts(cash);
    } catch (error) {
      console.error("Error fetching cash accounts:", error);
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      const url = editingSupplier
        ? `/accounting/suppliers/${editingSupplier.id}`
        : "/accounting/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify(supplierForm),
      });

      showToast.success(
        editingSupplier
          ? "Supplier updated successfully"
          : "Supplier created successfully",
      );
      resetSupplierForm();
      await fetchSuppliers();
    } catch (error) {
      showToast.error(error?.message || "Failed to save supplier");
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    setSavingBill(true);
    try {
      const payload = {
        ...billForm,
        total_amount: parseFloat(billForm.total_amount),
      };
      if (editingBill) {
        await request(`/accounting/bills/${editingBill.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast.success("Bill updated successfully");
      } else {
        await request("/accounting/bills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast.success("Bill created successfully");
      }
      resetBillForm();
      await fetchBills();
      await fetchSuppliers();
      if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
    } catch (error) {
      showToast.error(
        error?.message ||
          (editingBill ? "Failed to update bill" : "Failed to create bill"),
      );
    } finally {
      setSavingBill(false);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await request("/accounting/payments", {
        method: "POST",
        body: JSON.stringify({
          payment_type: "payment",
          ...paymentForm,
          amount: parseFloat(
            String(paymentForm.amount || "").replace(/,/g, ""),
          ),
        }),
      });

      showToast.success("Payment recorded successfully");
      resetPaymentForm();
      await fetchBills();
      await fetchSuppliers();
      if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
    } catch (error) {
      showToast.error(error?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const doDeleteSupplier = async (supplier, payload) => {
    const opts = { method: "DELETE" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/suppliers/${supplier.id}`, opts);
  };

  const handleDeleteSupplier = async (supplier) => {
    const result = await showAlert.confirm(
      "Delete Supplier",
      `Are you sure you want to delete ${supplier.name}?`,
    );

    if (!result.isConfirmed) return;

    if (isAdmin && isAdmin()) {
      try {
        showAlert.loading("Deleting supplier...");
        await doDeleteSupplier(supplier, null);
        showAlert.close();
        showToast.success("Supplier deleted successfully");
        if (String(ledgerSupplierId) === String(supplier.id)) {
          setLedgerSupplierId("");
          setLedgerPayments([]);
        }
        await fetchSuppliers();
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to delete supplier");
      }
      return;
    }

    if (!authCodesRequired) {
      try {
        showAlert.loading("Deleting supplier...");
        await doDeleteSupplier(supplier, null);
        showAlert.close();
        showToast.success("Supplier deleted successfully");
        if (String(ledgerSupplierId) === String(supplier.id)) {
          setLedgerSupplierId("");
          setLedgerPayments([]);
        }
        await fetchSuppliers();
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to delete supplier");
      }
      return;
    }

    setAuthCodeModal({
      show: true,
      type: "supplier",
      entity: supplier,
      error: null,
    });
  };

  const handleAuthCodeSubmitSupplier = async ({
    authorization_code,
    remarks,
  }) => {
    const { entity } = authCodeModal;
    if (!entity || authCodeModal.type !== "supplier") return;
    try {
      setAuthCodeSubmitting(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doDeleteSupplier(entity, { authorization_code, remarks });
      setAuthCodeModal({ show: false, type: null, entity: null, error: null });
      showToast.success("Supplier deleted successfully");
      if (String(ledgerSupplierId) === String(entity.id)) {
        setLedgerSupplierId("");
        setLedgerPayments([]);
      }
      await fetchSuppliers();
    } catch (error) {
      setAuthCodeModal((prev) => ({
        ...prev,
        error: error?.message || "Failed to delete supplier",
      }));
      showToast.error(error?.message || "Failed to delete supplier");
    } finally {
      setAuthCodeSubmitting(false);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      notes: "",
    });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  const resetBillForm = () => {
    setBillForm({
      supplier_id: "",
      bill_date: new Date().toISOString().split("T")[0],
      due_date: "",
      expense_account_id: "",
      total_amount: "",
      description: "",
    });
    setEditingBill(null);
    setShowBillForm(false);
  };

  const openBillForEdit = (bill) => {
    const paid = parseFloat(bill.paid_amount) || 0;
    if (paid > 0) {
      showToast.error(
        "Cannot edit a bill that has payments. Void the payment(s) first to edit this bill.",
      );
      return;
    }
    setEditingBill(bill);
    setBillForm({
      supplier_id: String(bill.supplier_id ?? ""),
      bill_date:
        (bill.bill_date || "").toString().split("T")[0] ||
        new Date().toISOString().split("T")[0],
      due_date: (bill.due_date || "").toString().split("T")[0] || "",
      expense_account_id: String(bill.expense_account_id ?? ""),
      total_amount: String(bill.total_amount ?? ""),
      description: bill.description || "",
    });
    setShowBillForm(true);
  };

  const doDeleteBill = async (bill, payload) => {
    const opts = { method: "DELETE" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/bills/${bill.id}`, opts);
  };

  const handleDeleteBill = async (bill) => {
    const result = await showAlert.confirm(
      "Delete Bill",
      `Are you sure you want to delete bill ${bill.bill_number || bill.id}? This action cannot be undone.`,
      "Yes, Delete",
      "Cancel",
    );
    if (!result.isConfirmed) return;

    if (isAdmin && isAdmin()) {
      try {
        showAlert.loading("Deleting bill...");
        await doDeleteBill(bill, null);
        showAlert.close();
        showToast.success("Bill deleted successfully");
        await fetchBills();
        await fetchSuppliers();
        if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to delete bill");
      }
      return;
    }

    if (!authCodesRequired) {
      try {
        showAlert.loading("Deleting bill...");
        await doDeleteBill(bill, null);
        showAlert.close();
        showToast.success("Bill deleted successfully");
        await fetchBills();
        await fetchSuppliers();
        if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to delete bill");
      }
      return;
    }

    setAuthCodeModal({ show: true, type: "bill", entity: bill, error: null });
  };

  const doVoidPayment = async (paymentId, payload) => {
    const opts = { method: "POST" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/payments/${paymentId}/void`, opts);
  };

  const handleVoidPaymentClick = async (row) => {
    if (row.type !== "Payment" || row.voidedAt) return;
    const result = await showAlert.confirm(
      "Void this payment?",
      "This will reverse the payment and update the bill balance. This cannot be undone.",
      "Void",
      "Cancel",
    );
    if (!result.isConfirmed) return;

    if (isAdmin && isAdmin()) {
      try {
        showAlert.loading("Voiding payment...");
        await doVoidPayment(row.paymentId, null);
        showAlert.close();
        showToast.success("Payment voided successfully");
        if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
        await fetchBills();
        await fetchSuppliers();
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to void payment");
      }
      return;
    }

    if (!authCodesRequired) {
      try {
        showAlert.loading("Voiding payment...");
        await doVoidPayment(row.paymentId, null);
        showAlert.close();
        showToast.success("Payment voided successfully");
        if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
        await fetchBills();
        await fetchSuppliers();
      } catch (error) {
        showAlert.close();
        showToast.error(error?.message || "Failed to void payment");
      }
      return;
    }

    setAuthCodeModal({
      show: true,
      type: "voidPayment",
      entity: { id: row.paymentId, payment_number: row.reference },
      error: null,
    });
  };

  const handleAuthCodeSubmitVoidPayment = async ({
    authorization_code,
    remarks,
  }) => {
    const { entity } = authCodeModal;
    if (!entity || authCodeModal.type !== "voidPayment") return;
    try {
      setAuthCodeSubmitting(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doVoidPayment(entity.id, { authorization_code, remarks });
      setAuthCodeModal({ show: false, type: null, entity: null, error: null });
      showToast.success("Payment voided successfully");
      if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
      await fetchBills();
      await fetchSuppliers();
    } catch (error) {
      setAuthCodeModal((prev) => ({
        ...prev,
        error: error?.message || "Failed to void payment",
      }));
      showToast.error(error?.message || "Failed to void payment");
    } finally {
      setAuthCodeSubmitting(false);
    }
  };

  const handleAuthCodeSubmitBill = async ({ authorization_code, remarks }) => {
    const { entity } = authCodeModal;
    if (!entity || authCodeModal.type !== "bill") return;
    try {
      setAuthCodeSubmitting(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doDeleteBill(entity, { authorization_code, remarks });
      setAuthCodeModal({ show: false, type: null, entity: null, error: null });
      showToast.success("Bill deleted successfully");
      await fetchBills();
      await fetchSuppliers();
      if (ledgerSupplierId) await fetchLedgerPayments(ledgerSupplierId);
    } catch (error) {
      setAuthCodeModal((prev) => ({
        ...prev,
        error: error?.message || "Failed to delete bill",
      }));
      showToast.error(error?.message || "Failed to delete bill");
    } finally {
      setAuthCodeSubmitting(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      bill_id: "",
      payment_date: new Date().toISOString().split("T")[0],
      cash_account_id: "",
      amount: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
    setShowPaymentForm(false);
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const abbreviateNumber = (amount, isCurrency = false) => {
    if (amount === null || amount === undefined || amount === 0) {
      return isCurrency ? "₱0.00" : "0";
    }
    const num = Math.abs(amount);
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
      abbreviated = num.toFixed(2);
    }
    abbreviated = parseFloat(abbreviated).toString();
    const sign = amount < 0 ? "-" : "";
    return isCurrency
      ? `${sign}₱${abbreviated}${suffix}`
      : `${sign}${abbreviated}${suffix}`;
  };

  const formatFullNumber = (amount, isCurrency = false) => {
    if (isCurrency) return formatCurrency(amount);
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleNumberClick = (title, value, isCurrency = false) => {
    setNumberViewModal({
      show: true,
      title,
      value,
      formattedValue: formatFullNumber(value, isCurrency),
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: "secondary",
      received: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
    };
    return badges[status] || "secondary";
  };

  const getBillStatus = (bill) => {
    const baseStatus = bill.status || "received";
    const balance = parseFloat(bill.balance ?? bill.total_amount ?? 0) || 0;
    const hasDueDate = !!bill.due_date;
    if (baseStatus !== "paid" && balance > 0 && hasDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(bill.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) return "overdue";
    }
    return baseStatus;
  };

  // Ensure bills is an array (must be before useMemo that uses it)
  const billsArray = Array.isArray(bills) ? bills : [];

  // Calculate totals with proper number parsing
  const totalAP = suppliers.reduce((sum, supplier) => {
    const payable = parseFloat(supplier.total_payable) || 0;
    return sum + payable;
  }, 0);

  const totalBills = billsArray.reduce((sum, bill) => {
    const amount = parseFloat(bill.total_amount) || 0;
    return sum + amount;
  }, 0);

  const totalPaid = billsArray.reduce((sum, bill) => {
    const paid = parseFloat(bill.paid_amount) || 0;
    return sum + paid;
  }, 0);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim() || activeTab !== "suppliers") return suppliers;
    const q = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q) ||
        (s.contact_person || "").toLowerCase().includes(q),
    );
  }, [suppliers, searchTerm, activeTab]);

  const filteredBills = useMemo(() => {
    let list = billsArray;
    if (searchTerm.trim() && activeTab === "bills") {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (b) =>
          (b.bill_number || "").toLowerCase().includes(q) ||
          (b.supplier?.name || "").toLowerCase().includes(q),
      );
    }
    if (filterStatus !== "all" && activeTab === "bills") {
      list = list.filter((b) => getBillStatus(b) === filterStatus);
    }
    return list;
  }, [billsArray, searchTerm, filterStatus, activeTab]);

  const suppliersTotalPages =
    Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const billsTotalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;
  const suppliersStartIndex = (suppliersPage - 1) * itemsPerPage;
  const billsStartIndex = (billsPage - 1) * itemsPerPage;
  const suppliersCurrent = filteredSuppliers.slice(
    suppliersStartIndex,
    suppliersStartIndex + itemsPerPage,
  );
  const billsCurrent = filteredBills.slice(
    billsStartIndex,
    billsStartIndex + itemsPerPage,
  );

  // Ledger data (per selected supplier)
  const ledgerBills = useMemo(() => {
    if (!ledgerSupplierId) return [];
    return billsArray.filter(
      (b) =>
        String(b.supplier_id ?? b.supplier?.id) === String(ledgerSupplierId),
    );
  }, [billsArray, ledgerSupplierId]);

  const ledgerRows = useMemo(() => {
    if (!ledgerSupplierId) return [];

    const rows = [];

    ledgerBills.forEach((bill) => {
      rows.push({
        id: `bill-${bill.id}`,
        date: bill.bill_date,
        type: "Bill",
        reference: bill.bill_number,
        description: bill.description || `Bill ${bill.bill_number}`,
        debit: parseFloat(bill.total_amount) || 0,
        credit: 0,
      });
    });

    ledgerPayments.forEach((pay) => {
      if (!pay.bill) return;
      const sid = pay.bill.supplier_id ?? pay.bill.supplier?.id;
      if (String(sid) !== String(ledgerSupplierId)) return;

      const voidedAt = !!pay.voided_at;
      rows.push({
        id: `pay-${pay.id}`,
        paymentId: pay.id,
        voidedAt,
        date: pay.payment_date,
        type: "Payment",
        reference: pay.payment_number || `#${pay.id}`,
        description:
          pay.notes ||
          pay.reference_number ||
          (pay.bill ? `Payment for ${pay.bill.bill_number}` : "Payment"),
        debit: 0,
        credit: voidedAt ? 0 : parseFloat(pay.amount) || 0,
      });
    });

    rows.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() === db.getTime())
        return String(a.id).localeCompare(String(b.id));
      return da - db;
    });

    let balance = 0;
    return rows.map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
  }, [ledgerSupplierId, ledgerBills, ledgerPayments]);

  const ledgerTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    ledgerRows.forEach((row) => {
      debit += row.debit;
      credit += row.credit;
    });
    return {
      totalBilled: debit,
      totalPaid: credit,
      balance: debit - credit,
    };
  }, [ledgerRows]);

  const ledgerTotalPages = Math.ceil(ledgerRows.length / itemsPerPage) || 1;
  const ledgerStartIndex = (ledgerPage - 1) * itemsPerPage;
  const ledgerCurrent = ledgerRows.slice(
    ledgerStartIndex,
    ledgerStartIndex + itemsPerPage,
  );

  const exportLedgerToCsv = () => {
    if (!ledgerSupplierId || ledgerRows.length === 0) return;
    const supplier = suppliers.find(
      (s) => String(s.id) === String(ledgerSupplierId),
    );
    const supplierName = (supplier?.name || "Supplier").replace(/"/g, '""');

    const bom = "\uFEFF";
    const lines = [
      "Supplier Ledger Report",
      `"${supplierName}"`,
      `"Generated","${new Date().toLocaleString()}"`,
      "",
      `"Total Billed","${formatCurrency(ledgerTotals.totalBilled)}"`,
      `"Total Paid","${formatCurrency(ledgerTotals.totalPaid)}"`,
      `"Outstanding Balance","${formatCurrency(ledgerTotals.balance)}"`,
      "",
      "Line #,Date,Type,Reference,Description,Debit,Credit,Balance",
    ];

    ledgerRows.forEach((row, idx) => {
      const dateStr = formatDate(row.date);
      const safeDesc = (row.description || "").replace(/"/g, '""');
      const typeStr = (row.type || "") + (row.voidedAt ? " (Voided)" : "");
      const debit = row.debit != null ? String(row.debit) : "";
      const credit = row.credit != null ? String(row.credit) : "";
      const balance = row.balance != null ? String(row.balance) : "";
      lines.push(
        [
          idx + 1,
          `"${dateStr}"`,
          `"${typeStr.replace(/"/g, '""')}"`,
          `"${(row.reference || "").replace(/"/g, '""')}"`,
          `"${safeDesc}"`,
          debit,
          credit,
          balance,
        ].join(","),
      );
    });

    const csvContent = bom + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Supplier_Ledger_${(supplier?.name || "Supplier").replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLedgerToPrint = () => {
    if (!ledgerSupplierId || ledgerRows.length === 0) return;
    const supplier = suppliers.find(
      (s) => String(s.id) === String(ledgerSupplierId),
    );
    const supplierName = (supplier?.name || "Supplier").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = ledgerRows
      .map(
        (row, idx) => `
        <tr>
          <td class="cell-num">${idx + 1}</td>
          <td class="cell-text">${formatDate(row.date)}</td>
          <td class="cell-text">${(row.type || "").replace(/</g, "&lt;")}${row.voidedAt ? " (Voided)" : ""}</td>
          <td class="cell-text">${(row.reference || "").replace(/</g, "&lt;")}</td>
          <td class="cell-text">${(row.description || "").replace(/</g, "&lt;")}</td>
          <td class="cell-amt">${row.debit ? formatCurrency(row.debit) : "—"}</td>
          <td class="cell-amt">${row.credit ? formatCurrency(row.credit) : "—"}</td>
          <td class="cell-amt">${formatCurrency(row.balance)}</td>
        </tr>`,
      )
      .join("");

    const generated = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    win.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Supplier Ledger - ${supplierName}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; line-height: 1.4; }
          .report-header { background: linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%); color: #fff; padding: 16px 24px; margin: -20px -20px 20px -20px; border-bottom: 3px solid #334155; }
          .report-header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
          .report-header .sub { margin-top: 4px; font-size: 12px; opacity: 0.9; }
          .report-meta { margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1e3a5f; font-size: 11px; }
          .report-meta strong { color: #0f172a; }
          .summary-box { display: flex; flex-wrap: wrap; gap: 24px 32px; margin-bottom: 16px; padding: 12px 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; }
          .summary-box span { font-weight: 600; color: #334155; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #1e3a5f; color: #fff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
          td { font-size: 11px; }
          .cell-num { text-align: center; width: 4%; }
          .cell-text { }
          .cell-amt { text-align: right; white-space: nowrap; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          .report-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Supplier Ledger</h1>
          <div class="sub">${supplierName}</div>
        </div>
        <div class="report-meta">
          <strong>Generated:</strong> ${generated}
        </div>
        <div class="summary-box">
          <span>Total Billed:</span> ${formatCurrency(ledgerTotals.totalBilled)}
          <span>Total Paid:</span> ${formatCurrency(ledgerTotals.totalPaid)}
          <span>Outstanding Balance:</span> ${formatCurrency(ledgerTotals.balance)}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:4%;">#</th>
              <th style="width:10%;">Date</th>
              <th style="width:10%;">Type</th>
              <th style="width:16%;">Reference</th>
              <th style="width:30%;">Description</th>
              <th style="width:10%;">Debit</th>
              <th style="width:10%;">Credit</th>
              <th style="width:10%;">Balance</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="report-footer">CPC Accounting System · Supplier Ledger Report · ${generated}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const hasActiveFilters = searchTerm || filterStatus !== "all";
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  if (loading && initialLoading) {
    return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading suppliers and bills..." />
      </div>
    );
  }

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 suppliers-ap-container ${!loading ? "fadeIn" : ""}`}
    >
      <style>{`
        /* Modal Backdrop Animation */
        @keyframes modalBackdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalBackdropFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        /* Modal Content Animation */
        @keyframes modalContentSlideIn {
          from { opacity: 0; transform: translateY(-50px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modalContentSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-50px) scale(0.95); }
        }
        /* Modern SaaS Tab Animations */
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(-3px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tabPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .modal-backdrop-animation { animation: modalBackdropFadeIn 0.3s ease-out forwards; }
        .modal-backdrop-animation.exit { animation: modalBackdropFadeOut 0.2s ease-in forwards; }
        .modal-content-animation { animation: modalContentSlideIn 0.3s ease-out forwards; }
        .modal-content-animation.exit { animation: modalContentSlideOut 0.2s ease-in forwards; }
        .active-saas-tab { animation: tabSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .active-saas-tab .badge { animation: tabPulse 0.4s ease-out; }
        .inactive-saas-tab:hover { transform: translateY(-1px); }
        /* Corporate-style tabs: mobile underline, desktop pill */
        .suppliers-ap-tabs {
          border-bottom: 1px solid var(--border-color, #dee2e6);
          background: var(--background-white, #fff);
          width: 100%;
        }
        @media (max-width: 767.98px) {
          .suppliers-ap-tabs {
            border-radius: 0;
            box-shadow: none;
            padding: 0;
            gap: 0;
            display: flex;
            flex-wrap: nowrap;
            border-bottom: 1px solid var(--border-color, #dee2e6);
            background: var(--background-white, #fff);
          }
          .suppliers-ap-tab-btn {
            flex: 1 1 0;
            min-width: 0;
            border: none;
            border-radius: 0;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            padding: 0.75rem 0.5rem;
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--text-muted);
            background: transparent;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
            box-shadow: none !important;
          }
          .suppliers-ap-tab-btn:hover {
            color: var(--primary-color);
            background: rgba(0, 0, 0, 0.02);
          }
          .suppliers-ap-tab-btn.active {
            color: var(--primary-color);
            font-weight: 600;
            border-bottom-color: var(--primary-color);
            background: transparent;
          }
          .suppliers-ap-tab-btn .suppliers-ap-tab-icon {
            font-size: 1rem;
            opacity: 0.9;
          }
          .suppliers-ap-tab-btn .suppliers-ap-tab-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }
          .suppliers-ap-tab-btn .suppliers-ap-tab-badge {
            font-size: 0.625rem;
            padding: 0.125rem 0.35rem;
            min-width: 1.25rem;
          }
          .suppliers-ap-tabs .inactive-saas-tab:hover { transform: none; }
        }
        @media (min-width: 768px) {
          .suppliers-ap-tabs {
            display: inline-flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem;
            border-radius: 0.5rem;
            border: none;
            border-bottom: none;
            background: var(--background-light, #f8f9fa);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            width: auto;
          }
          .suppliers-ap-tab-btn {
            border: none !important;
            outline: none !important;
            border-radius: 0.5rem;
            border-bottom: none !important;
            flex: 0 0 auto;
            flex-direction: row;
            align-items: center;
            padding: 0.625rem 1rem;
            min-width: 140px;
            background: transparent !important;
            color: var(--text-muted);
            font-weight: 500;
            font-size: 0.9375rem;
            box-shadow: none !important;
            gap: 0.75rem;
          }
          .suppliers-ap-tab-btn:hover {
            background: rgba(255, 255, 255, 0.5) !important;
            color: var(--primary-color);
          }
          .suppliers-ap-tab-btn.active {
            background: white !important;
            color: var(--primary-color) !important;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
          }
          .suppliers-ap-tab-btn.active .suppliers-ap-tab-badge {
            background: var(--primary-color) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          .suppliers-ap-tab-btn:not(.active) .suppliers-ap-tab-badge {
            background: white !important;
            color: var(--text-primary, #212529) !important;
            border: none !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          }
          .suppliers-ap-tab-btn .suppliers-ap-tab-icon {
            font-size: 1rem;
            margin-right: 0.375rem;
          }
          .suppliers-ap-tab-btn .suppliers-ap-tab-label { margin-right: 0; }
          .suppliers-ap-tab-btn .suppliers-ap-tab-badge {
            font-size: 0.6875rem;
            padding: 0.25rem 0.5rem;
            font-weight: 600;
            margin-left: 0.125rem;
          }
          .suppliers-ap-tab-btn.suppliers-ap-tab-ledger {
            min-width: 160px;
          }
        }
        @media (max-width: 767.98px) {
          .suppliers-ap-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .suppliers-ap-table-wrap table {
            min-width: 820px;
            border-collapse: separate;
            border-spacing: 0;
          }
          .suppliers-ap-table-wrap .je-col-index,
          .suppliers-ap-table-wrap .je-col-actions {
            position: sticky;
            background-color: var(--bs-table-bg);
            z-index: 5;
          }
          .suppliers-ap-table-wrap thead .je-col-index,
          .suppliers-ap-table-wrap thead .je-col-actions {
            z-index: 7;
            background: var(--background-light, #f8f9fa);
          }
          .suppliers-ap-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }
          .suppliers-ap-table-wrap .je-col-actions {
            left: 44px;
            min-width: 128px;
            width: 128px;
          }
          .suppliers-ap-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .suppliers-ap-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: var(--bs-table-striped-bg);
          }
          .suppliers-ap-table-wrap.table-hover > tbody > tr:hover > .je-col-index,
          .suppliers-ap-table-wrap.table-hover > tbody > tr:hover > .je-col-actions {
            background-color: var(--bs-table-hover-bg);
          }
        }
      `}</style>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            <FaTruck className="me-2" />
            Suppliers / Accounts Payable
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage suppliers and track payables
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={() => {
              resetSupplierForm();
              setShowSupplierForm(true);
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
            <FaPlus className="me-1" />
            Add Supplier
          </button>
          <button
            className="btn btn-sm btn-success text-white"
            onClick={() => {
              resetBillForm();
              setShowBillForm(true);
            }}
            disabled={suppliers.length === 0}
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
            <FaFileInvoice className="me-1" />
            Create Bill
          </button>
          <button
            className="btn btn-sm"
            onClick={async () => {
              setRefreshing(true);
              try {
                await fetchSuppliers();
                await fetchBills();
                if (ledgerSupplierId)
                  await fetchLedgerPayments(ledgerSupplierId);
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={loading || refreshing}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--primary-color)",
              color: "var(--primary-color)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                e.target.style.backgroundColor = "var(--primary-color)";
                e.target.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "var(--primary-color)";
            }}
          >
            <FaSyncAlt className="me-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards - match Clients AR */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--primary-color)" }}
                  >
                    Total Suppliers
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick(
                        "Total Suppliers",
                        suppliers.length,
                        false,
                      )
                    }
                    style={{
                      color: "var(--primary-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: initialLoading ? "default" : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {initialLoading
                      ? "..."
                      : abbreviateNumber(suppliers.length, false)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>Click to view
                    full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-truck"
                    style={{
                      color: "var(--primary-light)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Total AP
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total AP", totalAP, true)
                    }
                    style={{
                      color: "var(--accent-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: initialLoading ? "default" : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {initialLoading ? "..." : abbreviateNumber(totalAP, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>Click to view
                    full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-money-bill-wave"
                    style={{
                      color: "var(--accent-light)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--primary-color)" }}
                  >
                    Total Bills
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total Bills", totalBills, true)
                    }
                    style={{
                      color: "var(--primary-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: initialLoading ? "default" : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {initialLoading
                      ? "..."
                      : abbreviateNumber(totalBills, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>Click to view
                    full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-file-invoice"
                    style={{
                      color: "var(--primary-color)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card stats-card h-100 shadow-sm"
            style={{
              border: "1px solid rgba(0, 0, 0, 0.125)",
              borderRadius: "0.375rem",
            }}
          >
            <div className="card-body p-2 p-md-3">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="text-xs fw-semibold text-uppercase mb-1"
                    style={{ color: "var(--success-color)" }}
                  >
                    Total Paid
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total Paid", totalPaid, true)
                    }
                    style={{
                      color: "var(--success-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor: initialLoading ? "default" : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {initialLoading ? "..." : abbreviateNumber(totalPaid, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>Click to view
                    full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-check-circle"
                    style={{
                      color: "var(--success-light)",
                      opacity: 0.7,
                      fontSize: "clamp(1rem, 3vw, 2rem)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls - match Clients AR */}
      <div
        className="card border-0 shadow-sm mb-3"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div className="card-body p-3">
          <div className="row g-2 align-items-start">
            <div className="col-12 col-md-4">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                <FaSearch className="me-1" />
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
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    activeTab === "suppliers"
                      ? "Search by name, email, phone..."
                      : "Search by bill number, supplier..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-sm clear-search-btn"
                    onClick={() => setSearchTerm("")}
                    disabled={loading}
                    style={{
                      color: "#6c757d",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "0.25rem 0.5rem",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "white";
                        e.target.style.color = "white";
                        e.target.style.backgroundColor = "#dc3545";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "#6c757d";
                        e.target.style.color = "#6c757d";
                        e.target.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <i
                      className="fas fa-times"
                      style={{ color: "inherit" }}
                    ></i>
                  </button>
                )}
              </div>
            </div>
            {activeTab === "bills" && (
              <div className="col-6 col-md-2">
                <label
                  className="form-label small fw-semibold mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <FaFilter className="me-1" />
                  Status
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="received">Received</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
            <div className="col-6 col-md-2">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Items per page
              </label>
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setItemsPerPage(value);
                  setSuppliersPage(1);
                  setBillsPage(1);
                  setLedgerPage(1);
                }}
                disabled={loading}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
            <div className="col-6 col-md-auto">
              <label
                className="form-label small fw-semibold mb-1 d-block"
                style={{ color: "var(--text-muted)" }}
              >
                &nbsp;
              </label>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100 w-md-auto"
                onClick={clearFilters}
                disabled={loading || !hasActiveFilters}
                style={{
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                  padding: "0.25rem 0.75rem",
                }}
              >
                <i className="fas fa-filter me-1"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate-style Tabs - match Clients AR */}
      <div className="mb-4 w-100">
        <div className="suppliers-ap-tabs">
          <button
            type="button"
            className={`suppliers-ap-tab-btn position-relative ${activeTab === "suppliers" ? "active active-saas-tab" : "inactive-saas-tab"}`}
            onClick={() => setActiveTab("suppliers")}
          >
            <i className="fas fa-truck suppliers-ap-tab-icon" aria-hidden></i>
            <span className="suppliers-ap-tab-label">Suppliers</span>
            <span
              className={`badge rounded-pill suppliers-ap-tab-badge ${activeTab === "suppliers" ? "bg-primary text-white" : "bg-secondary text-white"}`}
            >
              {filteredSuppliers.length}
            </span>
          </button>
          <button
            type="button"
            className={`suppliers-ap-tab-btn position-relative ${activeTab === "bills" ? "active active-saas-tab" : "inactive-saas-tab"}`}
            onClick={() => setActiveTab("bills")}
          >
            <i
              className="fas fa-file-invoice suppliers-ap-tab-icon"
              aria-hidden
            ></i>
            <span className="suppliers-ap-tab-label">Bills</span>
            <span
              className={`badge rounded-pill suppliers-ap-tab-badge ${activeTab === "bills" ? "bg-primary text-white" : "bg-secondary text-white"}`}
            >
              {filteredBills.length}
            </span>
          </button>
          <button
            type="button"
            className={`suppliers-ap-tab-btn suppliers-ap-tab-ledger position-relative ${activeTab === "ledger" ? "active active-saas-tab" : "inactive-saas-tab"}`}
            onClick={() => setActiveTab("ledger")}
          >
            <i className="fas fa-book suppliers-ap-tab-icon" aria-hidden></i>
            <span className="suppliers-ap-tab-label">
              <span className="d-none d-sm-inline">Supplier </span>Ledger
            </span>
          </button>
        </div>
      </div>

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <div
          className="card border-0 shadow-sm"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div
            className="card-header border-bottom-0 py-2"
            style={{
              background: "var(--topbar-bg)",
              color: "var(--topbar-text)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-semibold text-white">
                <i className="fas fa-truck me-2"></i>
                Suppliers
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    ({filteredSuppliers.length} total)
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-truck fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Suppliers Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Start by creating your first supplier."}
                </p>
              </div>
            ) : (
              <div className="table-responsive suppliers-ap-table-wrap table-striped table-hover">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        className="text-center small fw-semibold je-col-index"
                        style={{ width: "5%" }}
                      >
                        #
                      </th>
                      <th
                        className="text-center small fw-semibold je-col-actions"
                        style={{ width: "12%" }}
                      >
                        Actions
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "25%" }}
                      >
                        Name
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "15%" }}
                      >
                        Contact
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "20%" }}
                      >
                        Email
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "15%" }}
                      >
                        Total AP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersCurrent.map((supplier, index) => (
                      <tr key={supplier.id} className="align-middle">
                        <td
                          className="text-center fw-bold je-col-index"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {suppliersStartIndex + index + 1}
                        </td>
                        <td className="text-center je-col-actions">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setShowSupplierViewModal(true);
                              }}
                              title="View Details"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FaEye style={{ fontSize: "0.875rem" }} />
                            </button>
                            <button
                              className="btn btn-success btn-sm text-white"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setSupplierForm({
                                  name: supplier.name,
                                  email: supplier.email || "",
                                  phone: supplier.phone || "",
                                  address: supplier.address || "",
                                  contact_person: supplier.contact_person || "",
                                  notes: supplier.notes || "",
                                });
                                setShowSupplierForm(true);
                              }}
                              title="Edit"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FaEdit style={{ fontSize: "0.875rem" }} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeleteSupplier(supplier)}
                              title="Delete"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FaTrash style={{ fontSize: "0.875rem" }} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <strong>{supplier.name}</strong>
                          {supplier.contact_person && (
                            <div className="small text-muted">
                              Contact: {supplier.contact_person}
                            </div>
                          )}
                        </td>
                        <td className="text-muted small">
                          {supplier.phone || "-"}
                        </td>
                        <td className="small">{supplier.email || "-"}</td>
                        <td className="text-end">
                          <strong>
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(supplier.total_payable)}
                              onClick={() =>
                                handleNumberClick(
                                  "Total AP",
                                  supplier.total_payable ?? 0,
                                  true,
                                )
                              }
                            >
                              {formatCurrency(supplier.total_payable)}
                            </span>
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && filteredSuppliers.length > 0 && (
            <div className="card-footer bg-white border-top px-3 py-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <small style={{ color: "var(--text-muted)" }}>
                    Showing{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {suppliersStartIndex + 1}-
                      {Math.min(
                        suppliersStartIndex + suppliersCurrent.length,
                        filteredSuppliers.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {filteredSuppliers.length}
                    </span>{" "}
                    suppliers
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => setSuppliersPage((p) => Math.max(1, p - 1))}
                    disabled={suppliersPage === 1}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    <FaChevronLeft className="me-1" />
                    Previous
                  </button>
                  <div className="d-none d-md-flex gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      const totalPages = suppliersTotalPages;
                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        let start = Math.max(2, suppliersPage - 1);
                        let end = Math.min(totalPages - 1, suppliersPage + 1);
                        if (suppliersPage <= 2) end = 4;
                        else if (suppliersPage >= totalPages - 1)
                          start = totalPages - 3;
                        if (start > 2) pages.push("...");
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (end < totalPages - 1) pages.push("...");
                        if (totalPages > 1) pages.push(totalPages);
                      }
                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() =>
                            page !== "..." && setSuppliersPage(page)
                          }
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${suppliersPage === page ? "var(--primary-color)" : "var(--input-border)"}`,
                            color:
                              suppliersPage === page
                                ? "white"
                                : "var(--text-primary)",
                            backgroundColor:
                              suppliersPage === page
                                ? "var(--primary-color)"
                                : "transparent",
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled && suppliersPage !== page) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-light)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled && suppliersPage !== page) {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "none";
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.color = "var(--text-primary)";
                            }
                          }}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>
                  <div className="d-md-none">
                    <small style={{ color: "var(--text-muted)" }}>
                      Page {suppliersPage} of {suppliersTotalPages}
                    </small>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setSuppliersPage((p) =>
                        Math.min(suppliersTotalPages, p + 1),
                      )
                    }
                    disabled={suppliersPage === suppliersTotalPages}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    Next
                    <FaChevronRight className="ms-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bills Tab */}
      {activeTab === "bills" && (
        <div
          className="card border-0 shadow-sm"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div
            className="card-header border-bottom-0 py-2"
            style={{
              background: "var(--topbar-bg)",
              color: "var(--topbar-text)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-semibold text-white">
                <i className="fas fa-file-invoice me-2"></i>
                Bills
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    ({filteredBills.length} total)
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {filteredBills.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-file-invoice fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Bills Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Start by creating your first bill."}
                </p>
              </div>
            ) : (
              <div className="table-responsive suppliers-ap-table-wrap table-striped table-hover">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        className="text-center small fw-semibold je-col-index"
                        style={{ width: "5%" }}
                      >
                        #
                      </th>
                      <th
                        className="text-center small fw-semibold je-col-actions"
                        style={{ width: "12%" }}
                      >
                        Actions
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%" }}
                      >
                        Bill #
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "18%" }}
                      >
                        Supplier
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "10%" }}
                      >
                        Date
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "10%" }}
                      >
                        Due Date
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "11%" }}
                      >
                        Amount
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "11%" }}
                      >
                        Paid
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "11%" }}
                      >
                        Balance
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "10%" }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {billsCurrent.map((bill, index) => (
                      <tr key={bill.id} className="align-middle">
                        <td
                          className="text-center fw-bold je-col-index"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {billsStartIndex + index + 1}
                        </td>
                        <td className="text-center je-col-actions">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowViewModal(true);
                              }}
                              title="View Details"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <FaEye style={{ fontSize: "0.875rem" }} />
                            </button>
                            {(parseFloat(bill.balance) || 0) > 0 && (
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentForm({
                                    ...paymentForm,
                                    bill_id: bill.id.toString(),
                                    amount: String(bill.balance ?? ""),
                                  });
                                  setShowPaymentForm(true);
                                }}
                                title="Record Payment"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <FaMoneyBillWave
                                  style={{ fontSize: "0.875rem" }}
                                />
                              </button>
                            )}
                            <button
                              className="btn btn-success btn-sm text-white"
                              onClick={() => openBillForEdit(bill)}
                              title="Edit Bill"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <FaEdit style={{ fontSize: "0.875rem" }} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeleteBill(bill)}
                              title="Delete Bill"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <FaTrash style={{ fontSize: "0.875rem" }} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <code className="small">{bill.bill_number}</code>
                        </td>
                        <td className="small">{bill.supplier?.name || "-"}</td>
                        <td className="small text-muted">
                          {formatDate(bill.bill_date)}
                        </td>
                        <td className="small text-muted">
                          {bill.due_date ? formatDate(bill.due_date) : "-"}
                        </td>
                        <td className="text-end fw-semibold">
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: "140px", cursor: "pointer" }}
                            title={formatCurrency(bill.total_amount)}
                            onClick={() =>
                              handleNumberClick(
                                "Amount",
                                bill.total_amount ?? 0,
                                true,
                              )
                            }
                          >
                            {formatCurrency(bill.total_amount)}
                          </span>
                        </td>
                        <td className="text-end text-success fw-semibold">
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: "140px", cursor: "pointer" }}
                            title={formatCurrency(bill.paid_amount)}
                            onClick={() =>
                              handleNumberClick(
                                "Paid",
                                bill.paid_amount ?? 0,
                                true,
                              )
                            }
                          >
                            {formatCurrency(bill.paid_amount)}
                          </span>
                        </td>
                        <td className="text-end">
                          <strong
                            className={
                              (parseFloat(bill.balance) || 0) > 0
                                ? "text-warning"
                                : "text-success"
                            }
                          >
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(bill.balance)}
                              onClick={() =>
                                handleNumberClick(
                                  "Balance",
                                  bill.balance ?? 0,
                                  true,
                                )
                              }
                            >
                              {formatCurrency(bill.balance)}
                            </span>
                          </strong>
                        </td>
                        <td>
                          {(() => {
                            const status = getBillStatus(bill);
                            return (
                              <span
                                className={`badge bg-${getStatusBadge(status)}`}
                              >
                                {status}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && filteredBills.length > 0 && (
            <div className="card-footer bg-white border-top px-3 py-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <small style={{ color: "var(--text-muted)" }}>
                    Showing{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {billsStartIndex + 1}-
                      {Math.min(
                        billsStartIndex + billsCurrent.length,
                        filteredBills.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {filteredBills.length}
                    </span>{" "}
                    bills
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                    disabled={billsPage === 1}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    <FaChevronLeft className="me-1" />
                    Previous
                  </button>
                  <div className="d-none d-md-flex gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      const totalPages = billsTotalPages;
                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        let start = Math.max(2, billsPage - 1);
                        let end = Math.min(totalPages - 1, billsPage + 1);
                        if (billsPage <= 2) end = 4;
                        else if (billsPage >= totalPages - 1)
                          start = totalPages - 3;
                        if (start > 2) pages.push("...");
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (end < totalPages - 1) pages.push("...");
                        if (totalPages > 1) pages.push(totalPages);
                      }
                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() => page !== "..." && setBillsPage(page)}
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${billsPage === page ? "var(--primary-color)" : "var(--input-border)"}`,
                            color:
                              billsPage === page
                                ? "white"
                                : "var(--text-primary)",
                            backgroundColor:
                              billsPage === page
                                ? "var(--primary-color)"
                                : "transparent",
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled && billsPage !== page) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-light)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled && billsPage !== page) {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "none";
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.color = "var(--text-primary)";
                            }
                          }}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>
                  <div className="d-md-none">
                    <small style={{ color: "var(--text-muted)" }}>
                      Page {billsPage} of {billsTotalPages}
                    </small>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setBillsPage((p) => Math.min(billsTotalPages, p + 1))
                    }
                    disabled={billsPage === billsTotalPages}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    Next
                    <FaChevronRight className="ms-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Supplier Ledger Tab */}
      {activeTab === "ledger" && (
        <div
          className="card border-0 shadow-sm"
          style={{ backgroundColor: "var(--background-white)" }}
        >
          <div
            className="card-header border-bottom-0 py-2"
            style={{
              background: "var(--topbar-bg)",
              color: "var(--topbar-text)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0 fw-semibold text-white d-flex align-items-center gap-2">
                <i className="fas fa-book"></i>
                Supplier Ledger
              </h5>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <label
                    className="form-label small fw-semibold mb-0 me-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Supplier
                  </label>
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 220 }}
                    value={ledgerSupplierId}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setLedgerSupplierId(value);
                      setLedgerPage(1);
                      await fetchLedgerPayments(value);
                    }}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={exportLedgerToCsv}
                    disabled={!ledgerSupplierId || ledgerRows.length === 0}
                    title="Export to Excel (CSV)"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <FaFileExcel className="me-1" />
                    Excel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={exportLedgerToPrint}
                    disabled={!ledgerSupplierId || ledgerRows.length === 0}
                    title="Export to PDF (Print)"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <FaFilePdf className="me-1" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {!ledgerSupplierId ? (
              <div className="text-center py-5">
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  Select a supplier to view the ledger.
                </h5>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  Choose a supplier from the dropdown above to see all bills and
                  payments with a running balance.
                </p>
              </div>
            ) : ledgerLoading ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  Loading supplier ledger...
                </h5>
              </div>
            ) : ledgerRows.length === 0 ? (
              <div className="text-center py-5">
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No ledger activity
                </h5>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  This supplier has no bills or payments yet.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 pb-0">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <div className="card stats-card h-100 shadow-sm border-0">
                        <div className="card-body p-2 p-md-3">
                          <div
                            className="text-xs fw-semibold text-uppercase mb-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Total Billed
                          </div>
                          <div
                            className="mb-0 fw-bold d-inline-block text-truncate w-100"
                            style={{
                              color: "var(--primary-dark)",
                              fontSize: "clamp(1rem, 3vw, 1.25rem)",
                              lineHeight: "1.2",
                              maxWidth: "100%",
                              cursor: "pointer",
                            }}
                            title={formatCurrency(ledgerTotals.totalBilled)}
                            onClick={() =>
                              handleNumberClick(
                                "Total Billed",
                                ledgerTotals.totalBilled,
                                true,
                              )
                            }
                          >
                            {formatCurrency(ledgerTotals.totalBilled)}
                          </div>
                          <div
                            className="text-xxs mt-1"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.65rem",
                              fontStyle: "italic",
                            }}
                          >
                            <i className="fas fa-info-circle me-1"></i>Click to
                            view full number
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card stats-card h-100 shadow-sm border-0">
                        <div className="card-body p-2 p-md-3">
                          <div
                            className="text-xs fw-semibold text-uppercase mb-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Total Paid
                          </div>
                          <div
                            className="mb-0 fw-bold d-inline-block text-truncate w-100"
                            style={{
                              color: "var(--success-color)",
                              fontSize: "clamp(1rem, 3vw, 1.25rem)",
                              lineHeight: "1.2",
                              maxWidth: "100%",
                              cursor: "pointer",
                            }}
                            title={formatCurrency(ledgerTotals.totalPaid)}
                            onClick={() =>
                              handleNumberClick(
                                "Total Paid",
                                ledgerTotals.totalPaid,
                                true,
                              )
                            }
                          >
                            {formatCurrency(ledgerTotals.totalPaid)}
                          </div>
                          <div
                            className="text-xxs mt-1"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.65rem",
                              fontStyle: "italic",
                            }}
                          >
                            <i className="fas fa-info-circle me-1"></i>Click to
                            view full number
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card stats-card h-100 shadow-sm border-0">
                        <div className="card-body p-2 p-md-3">
                          <div
                            className="text-xs fw-semibold text-uppercase mb-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Outstanding Balance
                          </div>
                          <div
                            className="mb-0 fw-bold d-inline-block text-truncate w-100"
                            style={{
                              color:
                                ledgerTotals.balance > 0
                                  ? "var(--warning-color)"
                                  : "var(--success-color)",
                              fontSize: "clamp(1rem, 3vw, 1.25rem)",
                              lineHeight: "1.2",
                              maxWidth: "100%",
                              cursor: "pointer",
                            }}
                            title={formatCurrency(ledgerTotals.balance)}
                            onClick={() =>
                              handleNumberClick(
                                "Outstanding Balance",
                                ledgerTotals.balance,
                                true,
                              )
                            }
                          >
                            {formatCurrency(ledgerTotals.balance)}
                          </div>
                          <div
                            className="text-xxs mt-1"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.65rem",
                              fontStyle: "italic",
                            }}
                          >
                            <i className="fas fa-info-circle me-1"></i>Click to
                            view full number
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="table-responsive suppliers-ap-table-wrap table-striped table-hover mt-3">
                  <table className="table table-striped table-hover mb-0">
                    <thead
                      style={{ backgroundColor: "var(--background-light)" }}
                    >
                      <tr>
                        <th
                          className="text-center small fw-semibold je-col-index"
                          style={{ width: "4%" }}
                        >
                          #
                        </th>
                        <th
                          className="text-center small fw-semibold je-col-actions"
                          style={{ width: "10%" }}
                        >
                          Actions
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "10%" }}
                        >
                          Date
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          Type
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          Reference
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "24%" }}
                        >
                          Description
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "10%" }}
                        >
                          Debit
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "10%" }}
                        >
                          Credit
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "10%" }}
                        >
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerCurrent.map((row, index) => (
                        <tr key={row.id} className="align-middle">
                          <td
                            className="text-center fw-bold je-col-index"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {ledgerStartIndex + index + 1}
                          </td>
                          <td className="text-center je-col-actions">
                            <div className="d-flex justify-content-center gap-1">
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => setLedgerSelectedRow(row)}
                                title="View Details"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <FaEye style={{ fontSize: "0.875rem" }} />
                              </button>
                              {row.type === "Payment" && !row.voidedAt && (
                                <button
                                  className="btn btn-sm text-white"
                                  onClick={() => handleVoidPaymentClick(row)}
                                  title="Void Payment"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "6px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#6c757d",
                                  }}
                                >
                                  <FaBan style={{ fontSize: "0.875rem" }} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="text-muted small">
                            {formatDate(row.date)}
                          </td>
                          <td>
                            {row.type === "Payment" && row.voidedAt ? (
                              <span className="badge bg-secondary border">
                                Voided
                              </span>
                            ) : (
                              <span
                                className={`badge border ${row.type === "Bill" ? "bg-primary-subtle text-primary border-primary" : "bg-success-subtle text-success border-success"}`}
                              >
                                {row.type}
                              </span>
                            )}
                          </td>
                          <td className="text-muted small">{row.reference}</td>
                          <td className="small">{row.description}</td>
                          <td className="text-end text-danger fw-semibold">
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={
                                row.debit ? formatCurrency(row.debit) : "—"
                              }
                              onClick={() =>
                                handleNumberClick("Debit", row.debit ?? 0, true)
                              }
                            >
                              {row.debit ? formatCurrency(row.debit) : "—"}
                            </span>
                          </td>
                          <td className="text-end text-success fw-semibold">
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={
                                row.credit ? formatCurrency(row.credit) : "—"
                              }
                              onClick={() =>
                                handleNumberClick(
                                  "Credit",
                                  row.credit ?? 0,
                                  true,
                                )
                              }
                            >
                              {row.credit ? formatCurrency(row.credit) : "—"}
                            </span>
                          </td>
                          <td className="text-end fw-semibold">
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(row.balance)}
                              onClick={() =>
                                handleNumberClick("Balance", row.balance, true)
                              }
                            >
                              {formatCurrency(row.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          {ledgerSupplierId && !ledgerLoading && ledgerRows.length > 0 && (
            <div className="card-footer bg-white border-top px-3 py-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <small style={{ color: "var(--text-muted)" }}>
                    Showing{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ledgerStartIndex + 1}-
                      {Math.min(
                        ledgerStartIndex + ledgerCurrent.length,
                        ledgerRows.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ledgerRows.length}
                    </span>{" "}
                    entries
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    disabled={ledgerPage === 1}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    <FaChevronLeft className="me-1" />
                    Previous
                  </button>
                  <div className="d-none d-md-flex gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      const totalPages = ledgerTotalPages;
                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        let start = Math.max(2, ledgerPage - 1);
                        let end = Math.min(totalPages - 1, ledgerPage + 1);
                        if (ledgerPage <= 2) end = 4;
                        else if (ledgerPage >= totalPages - 1)
                          start = totalPages - 3;
                        if (start > 2) pages.push("...");
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (end < totalPages - 1) pages.push("...");
                        if (totalPages > 1) pages.push(totalPages);
                      }
                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() => page !== "..." && setLedgerPage(page)}
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${ledgerPage === page ? "var(--primary-color)" : "var(--input-border)"}`,
                            color:
                              ledgerPage === page
                                ? "white"
                                : "var(--text-primary)",
                            backgroundColor:
                              ledgerPage === page
                                ? "var(--primary-color)"
                                : "transparent",
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled && ledgerPage !== page) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-light)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled && ledgerPage !== page) {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "none";
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.color = "var(--text-primary)";
                            }
                          }}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>
                  <div className="d-md-none">
                    <small style={{ color: "var(--text-muted)" }}>
                      Page {ledgerPage} of {ledgerTotalPages}
                    </small>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))
                    }
                    disabled={ledgerPage === ledgerTotalPages}
                    style={{
                      transition: "all 0.2s ease-in-out",
                      border: "2px solid var(--primary-color)",
                      color: "var(--primary-color)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                        e.target.style.backgroundColor = "var(--primary-color)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                    }}
                  >
                    Next
                    <FaChevronRight className="ms-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ledger Entry Details Modal (Supplier Ledger) */}
      {ledgerSelectedRow && (
        <Portal>
          <div
            className="modal fade show d-block modal-backdrop-animation"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLedgerSelectedRow(null);
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div
                className="modal-content border-0 modal-content-animation"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
              >
                <div
                  className="modal-header border-0 text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
                  }}
                >
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="fas fa-book"></i>
                    <span>Ledger Entry Details</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setLedgerSelectedRow(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div
                  className="modal-body bg-light"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  <div className="bg-white border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-2">Summary</div>
                    <div className="row g-2">
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Date
                        </div>
                        <div className="fw-semibold">
                          {formatDate(ledgerSelectedRow.date)}
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Type
                        </div>
                        {ledgerSelectedRow.type === "Payment" &&
                        ledgerSelectedRow.voidedAt ? (
                          <span className="badge bg-secondary">Voided</span>
                        ) : (
                          <span className="badge bg-light text-dark border">
                            {ledgerSelectedRow.type}
                          </span>
                        )}
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Reference
                        </div>
                        <div className="text-muted small">
                          {ledgerSelectedRow.reference || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-2">Amounts</div>
                    <div className="row g-2">
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Debit
                        </div>
                        <div className="text-danger fw-semibold">
                          {ledgerSelectedRow.debit
                            ? formatCurrency(ledgerSelectedRow.debit)
                            : "₱0.00"}
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Credit
                        </div>
                        <div className="text-success fw-semibold">
                          {ledgerSelectedRow.credit
                            ? formatCurrency(ledgerSelectedRow.credit)
                            : "₱0.00"}
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="small text-muted fw-semibold mb-1">
                          Balance after entry
                        </div>
                        <div className="fw-semibold">
                          {formatCurrency(ledgerSelectedRow.balance)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border rounded-3 p-3">
                    <div className="fw-semibold mb-2">Description</div>
                    <div
                      className="text-muted"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {ledgerSelectedRow.description || "—"}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-white">
                  <button
                    type="button"
                    className="btn btn-primary text-white fw-semibold client-submit-btn"
                    onClick={() => setLedgerSelectedRow(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Number View Modal */}
      {numberViewModal.show && (
        <NumberViewModal
          title={numberViewModal.title}
          value={numberViewModal.formattedValue}
          onClose={() =>
            setNumberViewModal((prev) => ({ ...prev, show: false }))
          }
        />
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierFormModal
          form={supplierForm}
          setForm={setSupplierForm}
          editing={editingSupplier}
          onSubmit={handleSaveSupplier}
          onClose={resetSupplierForm}
          saving={savingSupplier}
        />
      )}

      {/* Bill Form Modal */}
      {showBillForm && (
        <BillFormModal
          form={billForm}
          setForm={setBillForm}
          suppliers={suppliers}
          expenseAccounts={expenseAccounts}
          onSubmit={handleSaveBill}
          onClose={resetBillForm}
          saving={savingBill}
          editing={!!editingBill}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBill && (
        <PaymentFormModal
          form={paymentForm}
          setForm={setPaymentForm}
          bill={selectedBill}
          cashAccounts={cashAccounts}
          saving={savingPayment}
          onSubmit={handleSavePayment}
          onClose={resetPaymentForm}
        />
      )}

      {/* View Supplier Modal */}
      {showSupplierViewModal && selectedSupplier && (
        <SupplierViewModal
          supplier={selectedSupplier}
          onClose={() => setShowSupplierViewModal(false)}
          request={request}
          formatCurrency={formatCurrency}
        />
      )}

      {/* View Bill Modal */}
      {showViewModal && selectedBill && (
        <BillViewModal
          bill={selectedBill}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* Authorization Code Modal (delete supplier / delete bill / void payment) */}
      <AuthorizationCodeModal
        open={authCodeModal.show}
        onClose={() =>
          setAuthCodeModal({
            show: false,
            type: null,
            entity: null,
            error: null,
          })
        }
        onSubmit={(payload) => {
          if (authCodeModal.type === "supplier")
            handleAuthCodeSubmitSupplier(payload);
          else if (authCodeModal.type === "bill")
            handleAuthCodeSubmitBill(payload);
          else if (authCodeModal.type === "voidPayment")
            handleAuthCodeSubmitVoidPayment(payload);
        }}
        loading={authCodeSubmitting}
        title="Authorization Required"
        message={
          authCodeModal.type === "supplier"
            ? "Enter the authorization code from your administrator to delete this supplier."
            : authCodeModal.type === "bill"
              ? "Enter the authorization code from your administrator to delete this bill."
              : authCodeModal.type === "voidPayment"
                ? "Enter the authorization code from your administrator to void this payment."
                : "Enter the authorization code from your administrator to confirm this action."
        }
        actionLabel={
          authCodeModal.type === "supplier"
            ? "Delete Supplier"
            : authCodeModal.type === "bill"
              ? "Delete Bill"
              : authCodeModal.type === "voidPayment"
                ? "Void Payment"
                : "Confirm"
        }
        error={authCodeModal.error}
      />
    </div>
  );
};

// Supplier Form Modal Component - match Clients AR modal styling + smooth exit
const SupplierFormModal = ({
  form,
  setForm,
  editing,
  onSubmit,
  onClose,
  saving = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape" && !saving) handleClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [saving]);

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
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
                <FaTruck className="me-2" />
                {editing ? "Edit Supplier" : "New Supplier"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                disabled={saving}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Phone
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Address
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Contact Person
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.contact_person}
                    onChange={(e) =>
                      setForm({ ...form, contact_person: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Notes
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-white fw-semibold"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {editing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editing ? "Update" : "Create"} Supplier</>
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

// Bill Form Modal Component - match Clients AR modal styling + smooth exit
const BillFormModal = ({
  form,
  setForm,
  suppliers,
  expenseAccounts,
  onSubmit,
  onClose,
  saving = false,
  editing = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatAmountForDisplay = (value) => {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    if (!raw) return "";
    const [intPartRaw, decPartRaw] = raw.split(".");
    const intDigits = intPartRaw.replace(/\D/g, "");
    if (!intDigits) return decPartRaw ? `0.${decPartRaw}` : "";
    const intNumber = Number(intDigits);
    if (!Number.isFinite(intNumber)) return raw;
    const formattedInt = intNumber.toLocaleString("en-PH");
    return decPartRaw !== undefined && decPartRaw !== ""
      ? `${formattedInt}.${decPartRaw}`
      : formattedInt;
  };

  const handleTotalAmountChange = (e) => {
    const input = e.target.value || "";
    let cleaned = input.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    setForm({ ...form, total_amount: cleaned });
  };

  const handleClose = () => {
    if (saving) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape" && !saving) handleClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [saving]);

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
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
                {editing ? "Edit Bill" : "Create Bill"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                disabled={saving}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Supplier <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={form.supplier_id}
                      onChange={(e) =>
                        setForm({ ...form, supplier_id: e.target.value })
                      }
                      required
                      disabled={saving}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Bill Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.bill_date}
                      onChange={(e) =>
                        setForm({ ...form, bill_date: e.target.value })
                      }
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.due_date}
                      onChange={(e) =>
                        setForm({ ...form, due_date: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Expense Account <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={form.expense_account_id}
                      onChange={(e) =>
                        setForm({ ...form, expense_account_id: e.target.value })
                      }
                      required
                      disabled={saving}
                    >
                      <option value="">Select Account</option>
                      {expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Total Amount <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="form-control"
                      value={formatAmountForDisplay(form.total_amount)}
                      onChange={handleTotalAmountChange}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-white fw-semibold"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {editing ? "Updating..." : "Creating..."}
                    </>
                  ) : editing ? (
                    "Update Bill"
                  ) : (
                    "Create Bill"
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

// Payment Form Modal Component - same structure as Clients/AR Record Payment modal
const PaymentFormModal = ({
  form,
  setForm,
  bill,
  cashAccounts,
  saving = false,
  onSubmit,
  onClose,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatAmountForDisplay = (value) => {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    if (!raw) return "";
    const [intPartRaw, decPartRaw] = raw.split(".");
    const intDigits = intPartRaw.replace(/\D/g, "");
    if (!intDigits) return decPartRaw ? `0.${decPartRaw}` : "";
    const intNumber = Number(intDigits);
    if (!Number.isFinite(intNumber)) return raw;
    const formattedInt = intNumber.toLocaleString("en-PH");
    return decPartRaw !== undefined && decPartRaw !== ""
      ? `${formattedInt}.${decPartRaw}`
      : formattedInt;
  };

  const handleAmountChange = (e) => {
    const input = e.target.value || "";
    let cleaned = input.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    setForm({ ...form, amount: cleaned });
  };

  const balanceNum = parseFloat(bill?.balance) || 0;
  const amountNum =
    parseFloat(String(form.amount || "").replace(/,/g, "")) || 0;
  const amountExceedsBalance = amountNum > balanceNum && balanceNum >= 0;
  const amountError = amountExceedsBalance
    ? `Payment amount cannot exceed the current balance (${formatCurrency(balanceNum)}).`
    : null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape" && !saving) handleClose();
  };

  const handleClose = () => {
    if (saving) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
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
              <div
                className="d-flex align-items-start gap-3"
                style={{ minWidth: 0 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.15)",
                  }}
                >
                  <FaMoneyBillWave />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-bold"
                    style={{ fontSize: "1.05rem", lineHeight: 1.2 }}
                  >
                    Record Payment
                  </div>
                  <div
                    className="small opacity-75"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Bill {bill?.bill_number} •{" "}
                    {bill?.supplier?.name || "No supplier"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
                disabled={saving}
              ></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (amountExceedsBalance) return;
                onSubmit(e);
              }}
            >
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {/* Payment summary */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-4">
                    <div className="bg-white border rounded-3 p-3 h-100">
                      <div className="small text-muted fw-semibold mb-1">
                        Bill
                      </div>
                      <div className="fw-semibold">{bill?.bill_number}</div>
                      <div className="small text-muted mt-1">
                        {bill?.supplier?.name || "No supplier"}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="bg-white border rounded-3 p-3 h-100">
                      <div className="small text-muted fw-semibold mb-1">
                        Current Balance
                      </div>
                      <div
                        className="fw-bold text-warning"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {formatCurrency(bill?.balance)}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="bg-white border rounded-3 p-3 h-100">
                      <div className="small text-muted fw-semibold mb-1">
                        Payment Date
                      </div>
                      <div className="text-muted small">
                        {form.payment_date || "Select a date below"}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Payment details */}
                <div className="bg-white border rounded-3 p-3">
                  <div className="fw-semibold mb-2">Payment Details</div>
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.payment_date}
                        onChange={(e) =>
                          setForm({ ...form, payment_date: e.target.value })
                        }
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cash Account *
                      </label>
                      <select
                        className="form-select"
                        value={form.cash_account_id}
                        onChange={(e) =>
                          setForm({ ...form, cash_account_id: e.target.value })
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">Select account</option>
                        {cashAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Amount *
                      </label>
                      <input
                        type="text"
                        className={`form-control ${amountError ? "is-invalid" : ""}`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formatAmountForDisplay(form.amount)}
                        onChange={handleAmountChange}
                        required
                        disabled={saving}
                        aria-invalid={!!amountError}
                        aria-describedby={
                          amountError ? "amount-error" : undefined
                        }
                      />
                      {amountError && (
                        <div
                          id="amount-error"
                          className="invalid-feedback d-block"
                        >
                          {amountError}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-4">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Payment Method
                      </label>
                      <select
                        className="form-select"
                        value={form.payment_method}
                        onChange={(e) =>
                          setForm({ ...form, payment_method: e.target.value })
                        }
                        disabled={saving}
                      >
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-8">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Reference Number
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.reference_number}
                        onChange={(e) =>
                          setForm({ ...form, reference_number: e.target.value })
                        }
                        placeholder="Check number, transaction reference, etc."
                        disabled={saving}
                      />
                    </div>
                    <div className="col-12">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Notes
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                        placeholder="Optional internal notes"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success text-white fw-semibold client-submit-btn"
                  disabled={saving || amountExceedsBalance}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Recording…
                    </>
                  ) : (
                    "Record Payment"
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

// Supplier View Modal Component - same UI/structure as ClientViewModal, supplier content
const SupplierViewModal = ({
  supplier: initialSupplier,
  onClose,
  request,
  formatCurrency,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const supplier = detail || initialSupplier;

  useEffect(() => {
    if (!initialSupplier?.id) {
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    request(`/accounting/suppliers/${initialSupplier.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSupplier?.id, request]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
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
              <div
                className="d-flex align-items-start gap-3"
                style={{ minWidth: 0 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.15)",
                  }}
                >
                  <FaTruck />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-bold"
                    style={{ fontSize: "1.05rem", lineHeight: 1.2 }}
                  >
                    {supplier?.name}
                  </div>
                  <div
                    className="small opacity-75"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    AP: {formatCurrency(supplier?.total_payable)}
                  </div>
                </div>
              </div>
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
              {detailLoading ? (
                <div
                  className="d-flex flex-column align-items-center justify-content-center py-5"
                  role="status"
                  aria-label="Loading details"
                >
                  <span
                    className="spinner-border text-primary mb-3"
                    style={{ width: "2.5rem", height: "2.5rem" }}
                  />
                  <p className="text-muted mb-0 small">Loading details...</p>
                </div>
              ) : (
                <>
                  <Footprint
                    createdBy={detail?.created_by_name}
                    createdAt={detail?.created_at}
                    updatedBy={detail?.updated_by_name}
                    updatedAt={detail?.updated_at}
                  />
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-4">
                      <div className="bg-white border rounded-3 p-3 h-100">
                        <div className="small text-muted fw-semibold mb-1">
                          Accounts Payable
                        </div>
                        <div
                          className={`fw-bold ${(supplier?.total_payable || 0) > 0 ? "text-warning" : "text-success"}`}
                          style={{ fontSize: "1.25rem" }}
                        >
                          {formatCurrency(supplier?.total_payable)}
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-8">
                      <div className="bg-white border rounded-3 p-3 h-100">
                        <div className="d-flex flex-wrap gap-2">
                          {supplier?.email && (
                            <span className="badge bg-light text-dark border">
                              {supplier.email}
                            </span>
                          )}
                          {supplier?.phone && (
                            <span className="badge bg-light text-dark border">
                              {supplier.phone}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 row g-2">
                          <div className="col-12 col-md-6">
                            <div className="small text-muted fw-semibold">
                              Contact Person
                            </div>
                            <div className="fw-semibold">
                              {supplier?.contact_person || "—"}
                            </div>
                          </div>
                          <div className="col-12 col-md-6">
                            <div className="small text-muted fw-semibold">
                              Address
                            </div>
                            <div
                              className="text-muted"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {supplier?.address || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border rounded-3 p-3">
                    <div className="fw-semibold mb-2">Notes</div>
                    <div
                      className="text-muted"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {supplier?.notes || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-primary text-white fw-semibold client-submit-btn"
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

// Bill View Modal Component - same structure as InvoiceViewModal (Clients/AR)
const BillViewModal = ({ bill, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getBillStatus = (b) => {
    const baseStatus = b?.status || "received";
    const balance = parseFloat(b?.balance ?? b?.total_amount ?? 0) || 0;
    const hasDueDate = !!b?.due_date;
    if (baseStatus !== "paid" && balance > 0 && hasDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(b.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) return "overdue";
    }
    return baseStatus;
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: "secondary",
      received: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
    };
    return badges[status] || "secondary";
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
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
              <div
                className="d-flex align-items-start gap-3"
                style={{ minWidth: 0 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.15)",
                  }}
                >
                  <FaFileInvoice />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-bold"
                    style={{ fontSize: "1.05rem", lineHeight: 1.2 }}
                  >
                    Bill {bill?.bill_number}
                  </div>
                  <div
                    className="small opacity-75"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {bill?.supplier?.name || "No supplier"} •{" "}
                    {formatDate(bill?.bill_date)}
                  </div>
                </div>
              </div>
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
              <Footprint
                createdBy={bill?.created_by_name}
                createdAt={bill?.created_at}
                updatedBy={bill?.updated_by_name}
                updatedAt={bill?.updated_at}
              />
              {/* Summary */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">
                      Total Amount
                    </div>
                    <div className="fw-bold" style={{ fontSize: "1.25rem" }}>
                      {formatCurrency(bill?.total_amount)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">
                      Paid
                    </div>
                    <div
                      className="fw-bold text-success"
                      style={{ fontSize: "1.1rem" }}
                    >
                      {formatCurrency(bill?.paid_amount)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">
                      Balance
                    </div>
                    <div
                      className={`fw-bold ${(parseFloat(bill?.balance) || 0) > 0 ? "text-warning" : "text-success"}`}
                      style={{ fontSize: "1.1rem" }}
                    >
                      {formatCurrency(bill?.balance)}
                    </div>
                  </div>
                </div>
              </div>
              {/* Bill Information */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Bill Information</div>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">
                      Bill Number
                    </div>
                    <div className="fw-semibold">{bill?.bill_number}</div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="small text-muted fw-semibold">
                      Bill Date
                    </div>
                    <div className="text-muted">
                      {formatDate(bill?.bill_date)}
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="small text-muted fw-semibold">Due Date</div>
                    <div className="text-muted">
                      {bill?.due_date ? formatDate(bill?.due_date) : "N/A"}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Supplier</div>
                    <div className="fw-semibold">
                      {bill?.supplier?.name || "N/A"}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Status</div>
                    <span
                      className={`badge bg-${getStatusBadge(getBillStatus(bill))}`}
                    >
                      {getBillStatus(bill)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Expense Details */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Expense Details</div>
                <div className="row g-2">
                  <div className="col-12">
                    <div className="small text-muted fw-semibold">
                      Expense Account
                    </div>
                    <div className="fw-semibold">
                      {bill?.expense_account?.account_code} -{" "}
                      {bill?.expense_account?.account_name}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted fw-semibold">
                      Description
                    </div>
                    <div
                      className="text-muted"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {bill?.description || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-primary text-white fw-semibold client-submit-btn"
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

// Number View Modal (matches Clients AR)
const NumberViewModal = ({ title, value, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => showToast.success("Number copied to clipboard!"))
      .catch(() => showToast.error("Failed to copy number"));
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
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
                <i className="fas fa-info-circle me-2"></i>
                {title}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body text-center py-4 bg-light">
              <div className="mb-3">
                <div
                  className="h2 mb-2 fw-bold"
                  style={{
                    color: "var(--primary-color)",
                    wordBreak: "break-word",
                    fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                  }}
                >
                  {value}
                </div>
                <p className="text-muted small mb-0">Full number value</p>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCopy}
              >
                <i className="fas fa-copy me-2"></i>
                Copy
              </button>
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

export default SuppliersAP;
