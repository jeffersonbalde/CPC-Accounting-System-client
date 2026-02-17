import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Footprint from "../../../components/Footprint";
import {
  FaUserTie,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileInvoice,
  FaMoneyBillWave,
  FaEye,
  FaSyncAlt,
  FaSearch,
  FaFilter,
  FaIdCard,
  FaClipboardList,
  FaBriefcase,
  FaBullhorn,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaFileExcel,
  FaFilePdf,
  FaBan,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import AuthorizationCodeModal from "../../../components/AuthorizationCodeModal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const ClientsAR = () => {
  const { request, isAdmin, isPersonnel } = useAuth();
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("clients"); // clients, invoices

  // Pagination state (match Journal Entries style)
  const [clientsPage, setClientsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [ledgerPage, setLedgerPage] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal states
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showClientViewModal, setShowClientViewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [ledgerClientId, setLedgerClientId] = useState("");
  const [ledgerPayments, setLedgerPayments] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSelectedRow, setLedgerSelectedRow] = useState(null);

  // Number view modal state
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  // Authorization code modal (personnel only)
  const [authCodeModal, setAuthCodeModal] = useState({
    show: false,
    type: null, // "invoice" | "client" | "voidPayment"
    entity: null,
    error: null,
  });
  const [authCodeSubmitting, setAuthCodeSubmitting] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    notes: "",
    profile: {
      client_category: "universal", // universal | real_estate
      services_availed: [],
      services_other: "",
      business: {
        company_name: "",
        industry: "",
        website: "",
      },
      marketing: {
        lead_source: "",
        campaign: "",
        preferred_channel: "",
      },
      real_estate: {
        property_type: "",
        building_type: "",
        stories: "",
        lot_area_sqm: "",
        floor_area_sqm: "",
        location: "",
        project_stage: "",
      },
    },
  });

  const [invoiceForm, setInvoiceForm] = useState({
    client_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    income_account_id: "",
    total_amount: "",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    cash_account_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchInvoices();
    fetchIncomeAccounts();
    fetchCashAccounts();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await request("/accounting/clients?active_only=true");
      setClients(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const data = await request("/accounting/invoices?per_page=50");
      setInvoices(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      showToast.error("Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchIncomeAccounts = async () => {
    try {
      // Same as Journal Entries: load all active COA then filter (ensures dropdown populates)
      const data = await request(
        "/accounting/chart-of-accounts?active_only=true",
      );
      const all = Array.isArray(data) ? data : data?.data || [];
      const list = all.filter((acc) => {
        if (acc.account_type_category === "revenue") return true;
        if (!acc.account_type_category && acc.account_type === "REVENUE")
          return true;
        return false;
      });
      setIncomeAccounts(list);
    } catch (error) {
      console.error("Error fetching income accounts:", error);
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

  const fetchLedgerPayments = async (clientId) => {
    if (!clientId) {
      setLedgerPayments([]);
      return;
    }
    try {
      setLedgerLoading(true);
      const data = await request(
        `/accounting/payments?payment_type=receipt&client_id=${clientId}&per_page=500`,
      );
      setLedgerPayments(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching ledger payments:", error);
      showToast.error("Failed to load client ledger payments");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      const url = editingClient
        ? `/accounting/clients/${editingClient.id}`
        : "/accounting/clients";
      const method = editingClient ? "PUT" : "POST";

      const data = await request(url, {
        method,
        body: JSON.stringify({
          ...clientForm,
          profile: clientForm.profile || null,
        }),
      });

      showToast.success(
        editingClient
          ? "Client updated successfully"
          : "Client created successfully",
      );

      // Optimistically update clients list so edits are immediately reflected
      if (editingClient) {
        setClients((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      } else {
        setClients((prev) => [...prev, data]);
      }

      resetClientForm();
      fetchClients();
    } catch (error) {
      showToast.error(error?.message || "Failed to save client");
    } finally {
      setSavingClient(false);
    }
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    try {
      const isEditing = !!editingInvoice;
      showAlert.loading(
        isEditing ? "Updating invoice..." : "Creating invoice...",
      );
      const url = isEditing
        ? `/accounting/invoices/${editingInvoice.id}`
        : "/accounting/invoices";
      const method = isEditing ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify({
          ...invoiceForm,
          total_amount: parseFloat(invoiceForm.total_amount),
        }),
      });

      showAlert.close();
      showToast.success(
        isEditing
          ? "Invoice updated successfully"
          : "Invoice created successfully",
      );
      resetInvoiceForm();
      fetchInvoices();
      fetchClients();
    } catch (error) {
      showAlert.close();
      showToast.error(error.message || "Failed to create invoice");
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      setSavingPayment(true);
      showAlert.loading("Recording payment...");
      await request("/accounting/payments", {
        method: "POST",
        body: JSON.stringify({
          payment_type: "receipt",
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      showAlert.close();
      showToast.success("Payment recorded successfully");
      resetPaymentForm();
      fetchInvoices();
      fetchClients();
    } catch (error) {
      showAlert.close();
      showToast.error(error.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const doDeleteInvoice = async (invoice, payload) => {
    const opts = { method: "DELETE" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/invoices/${invoice.id}`, opts);
  };

  // Whether any active authorization codes exist (controls if personnel need code).
  // Default true so personnel will see the modal on first click even before
  // the has-active check finishes, avoiding confusing \"no modal\" behavior.
  const [authCodesRequired, setAuthCodesRequired] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkAuthCodes = async () => {
      try {
        const data = await request("/authorization-codes/has-active");
        if (isMounted) {
          setAuthCodesRequired(!!data?.has_codes);
        }
      } catch (err) {
        // fail silently; default is no modal
      }
    };
    checkAuthCodes();
    return () => {
      isMounted = false;
    };
  }, [request]);

  const handleDeleteInvoice = async (invoice) => {
    const result = await showAlert.confirm(
      "Delete Invoice",
      `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`,
      "Yes, Delete",
      "Cancel",
    );

    if (!result.isConfirmed) return;

    // Admin does not need authorization code; personnel only if codes exist
    if (isAdmin && isAdmin()) {
      try {
        showAlert.loading("Deleting invoice...");
        await doDeleteInvoice(invoice, null);
        showAlert.close();
        showToast.success("Invoice deleted successfully");
        await fetchInvoices();
        await fetchClients();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to delete invoice");
      }
      return;
    }

    // Personnel: only show authorization modal if active codes exist
    if (!authCodesRequired) {
      try {
        showAlert.loading("Deleting invoice...");
        await doDeleteInvoice(invoice, null);
        showAlert.close();
        showToast.success("Invoice deleted successfully");
        await fetchInvoices();
        await fetchClients();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to delete invoice");
      }
      return;
    }

    setAuthCodeModal({
      show: true,
      type: "invoice",
      entity: invoice,
      error: null,
    });
  };

  const handleAuthCodeSubmitInvoice = async ({
    authorization_code,
    remarks,
  }) => {
    const { entity } = authCodeModal;
    if (!entity || authCodeModal.type !== "invoice") return;
    try {
      setAuthCodeSubmitting(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doDeleteInvoice(entity, { authorization_code, remarks });
      setAuthCodeModal({ show: false, type: null, entity: null, error: null });
      showToast.success("Invoice deleted successfully");
      await fetchInvoices();
      await fetchClients();
    } catch (error) {
      setAuthCodeModal((prev) => ({ ...prev, error: error.message }));
      showToast.error(error.message || "Failed to delete invoice");
    } finally {
      setAuthCodeSubmitting(false);
    }
  };

  const doDeleteClient = async (client, payload) => {
    const opts = { method: "DELETE" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/clients/${client.id}`, opts);
  };

  const handleDeleteClient = async (client) => {
    const result = await showAlert.confirm(
      "Delete Client",
      `Are you sure you want to delete ${client.name}?`,
    );

    if (!result.isConfirmed) return;

    // Admin does not need authorization code; personnel only if codes exist
    if (isAdmin && isAdmin()) {
      try {
        showAlert.loading("Deleting client...");
        await doDeleteClient(client, null);
        showAlert.close();
        showToast.success("Client deleted successfully");
        fetchClients();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to delete client");
      }
      return;
    }

    // Personnel: only show authorization modal if active codes exist
    if (!authCodesRequired) {
      try {
        showAlert.loading("Deleting client...");
        await doDeleteClient(client, null);
        showAlert.close();
        showToast.success("Client deleted successfully");
        fetchClients();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to delete client");
      }
      return;
    }

    setAuthCodeModal({
      show: true,
      type: "client",
      entity: client,
      error: null,
    });
  };

  const handleAuthCodeSubmitClient = async ({
    authorization_code,
    remarks,
  }) => {
    const { entity } = authCodeModal;
    if (!entity || authCodeModal.type !== "client") return;
    try {
      setAuthCodeSubmitting(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doDeleteClient(entity, { authorization_code, remarks });
      setAuthCodeModal({ show: false, type: null, entity: null, error: null });
      showToast.success("Client deleted successfully");
      fetchClients();
    } catch (error) {
      setAuthCodeModal((prev) => ({ ...prev, error: error.message }));
      showToast.error(error.message || "Failed to delete client");
    } finally {
      setAuthCodeSubmitting(false);
    }
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
      "This will reverse the receipt and update the invoice balance. This cannot be undone.",
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
        if (ledgerClientId) fetchLedgerPayments(ledgerClientId);
        fetchClients();
        fetchInvoices();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to void payment");
      }
      return;
    }

    if (!authCodesRequired) {
      try {
        showAlert.loading("Voiding payment...");
        await doVoidPayment(row.paymentId, null);
        showAlert.close();
        showToast.success("Payment voided successfully");
        if (ledgerClientId) fetchLedgerPayments(ledgerClientId);
        fetchClients();
        fetchInvoices();
      } catch (error) {
        showAlert.close();
        showToast.error(error.message || "Failed to void payment");
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
      if (ledgerClientId) fetchLedgerPayments(ledgerClientId);
      fetchClients();
      fetchInvoices();
    } catch (error) {
      setAuthCodeModal((prev) => ({ ...prev, error: error.message }));
      showToast.error(error.message || "Failed to void payment");
    } finally {
      setAuthCodeSubmitting(false);
    }
  };

  const resetClientForm = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      notes: "",
      profile: {
        client_category: "universal",
        services_availed: [],
        services_other: "",
        business: { company_name: "", industry: "", website: "" },
        marketing: { lead_source: "", campaign: "", preferred_channel: "" },
        real_estate: {
          property_type: "",
          building_type: "",
          stories: "",
          lot_area_sqm: "",
          floor_area_sqm: "",
          location: "",
          project_stage: "",
        },
      },
    });
    setEditingClient(null);
    setShowClientForm(false);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      client_id: "",
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: "",
      income_account_id: "",
      total_amount: "",
      description: "",
    });
    setEditingInvoice(null);
    setShowInvoiceForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      invoice_id: "",
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

  // Abbreviate large numbers for display
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

    // Remove trailing zeros after decimal
    abbreviated = parseFloat(abbreviated).toString();

    const sign = amount < 0 ? "-" : "";
    return isCurrency
      ? `${sign}₱${abbreviated}${suffix}`
      : `${sign}${abbreviated}${suffix}`;
  };

  // Format full number for display in modal
  const formatFullNumber = (amount, isCurrency = false) => {
    if (isCurrency) {
      return formatCurrency(amount);
    }
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Handle number click to show modal
  const handleNumberClick = (title, value, isCurrency = false) => {
    setNumberViewModal({
      show: true,
      title,
      value,
      formattedValue: formatFullNumber(value, isCurrency),
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
      void: "secondary",
    };
    return badges[status] || "secondary";
  };

  // Ensure invoices is an array
  const invoicesArray = Array.isArray(invoices) ? invoices : [];

  // Calculate totals with proper number parsing
  const totalAR = clients.reduce((sum, client) => {
    const receivable = parseFloat(client.total_receivable) || 0;
    return sum + receivable;
  }, 0);

  const totalInvoices = invoicesArray.reduce((sum, inv) => {
    const amount = parseFloat(inv.total_amount) || 0;
    return sum + amount;
  }, 0);

  const totalPaid = invoicesArray.reduce((sum, inv) => {
    const paid = parseFloat(inv.paid_amount) || 0;
    return sum + paid;
  }, 0);

  // Filter clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];
    if (searchTerm.trim() && activeTab === "clients") {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name?.toLowerCase().includes(search) ||
          client.email?.toLowerCase().includes(search) ||
          client.phone?.toLowerCase().includes(search) ||
          client.contact_person?.toLowerCase().includes(search),
      );
    }
    return filtered;
  }, [clients, searchTerm, activeTab]);

  const getInvoiceStatus = (invoice) => {
    const baseStatus = invoice.status || "sent";
    const balance =
      parseFloat(invoice.balance ?? invoice.total_amount ?? 0) || 0;
    const hasDueDate = !!invoice.due_date;

    if (baseStatus !== "paid" && balance > 0 && hasDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        return "overdue";
      }
    }

    return baseStatus;
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoicesArray];
    if (searchTerm.trim() && activeTab === "invoices") {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number?.toLowerCase().includes(search) ||
          invoice.client?.name?.toLowerCase().includes(search) ||
          invoice.description?.toLowerCase().includes(search),
      );
    }
    if (filterStatus !== "all" && activeTab === "invoices") {
      filtered = filtered.filter(
        (invoice) => getInvoiceStatus(invoice) === filterStatus,
      );
    }
    return filtered;
  }, [invoicesArray, searchTerm, filterStatus, activeTab]);

  // Client-side pagination for Clients tab
  const clientsTotalPages =
    Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const clientsStartIndex = (clientsPage - 1) * itemsPerPage;
  const clientsCurrent = filteredClients.slice(
    clientsStartIndex,
    clientsStartIndex + itemsPerPage,
  );

  // Client-side pagination for Invoices tab
  const invoicesTotalPages =
    Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const invoicesStartIndex = (invoicesPage - 1) * itemsPerPage;
  const invoicesCurrent = filteredInvoices.slice(
    invoicesStartIndex,
    invoicesStartIndex + itemsPerPage,
  );

  // Ledger data (per selected client)
  const ledgerInvoices = useMemo(() => {
    if (!ledgerClientId) return [];
    return invoicesArray.filter((inv) => {
      const cid = inv.client_id || inv.client?.id;
      return String(cid) === String(ledgerClientId);
    });
  }, [invoicesArray, ledgerClientId]);

  const ledgerRows = useMemo(() => {
    if (!ledgerClientId) return [];

    const rows = [];

    ledgerInvoices.forEach((inv) => {
      rows.push({
        id: `inv-${inv.id}`,
        date: inv.invoice_date,
        type: "Invoice",
        reference: inv.invoice_number,
        description: inv.description || `Invoice ${inv.invoice_number}`,
        debit: parseFloat(inv.total_amount) || 0,
        credit: 0,
      });
    });

    ledgerPayments.forEach((pay) => {
      if (!pay.invoice || !pay.invoice.client) return;
      const cid = pay.invoice.client.id;
      if (String(cid) !== String(ledgerClientId)) return;

      const voidedAt = !!pay.voided_at;
      rows.push({
        id: `pay-${pay.id}`,
        paymentId: pay.id,
        voidedAt,
        date: pay.payment_date,
        type: "Payment",
        reference: pay.payment_number,
        description:
          pay.notes ||
          pay.reference_number ||
          (pay.invoice
            ? `Payment for ${pay.invoice.invoice_number}`
            : "Payment"),
        debit: 0,
        credit: voidedAt ? 0 : parseFloat(pay.amount) || 0,
      });
    });

    // Sort by date then id
    rows.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() === db.getTime()) {
        return String(a.id).localeCompare(String(b.id));
      }
      return da - db;
    });

    // Compute running balance
    let balance = 0;
    return rows.map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
  }, [ledgerClientId, ledgerInvoices, ledgerPayments]);

  const ledgerTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    ledgerRows.forEach((row) => {
      debit += row.debit;
      credit += row.credit;
    });
    return {
      totalInvoiced: debit,
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
    if (!ledgerClientId || ledgerRows.length === 0) return;
    const client = clients.find((c) => String(c.id) === String(ledgerClientId));
    const clientName = (client?.name || "Client").replace(/"/g, '""');

    const bom = "\uFEFF";
    const lines = [
      "Client Ledger Report",
      `"${clientName}"`,
      `"Generated","${new Date().toLocaleString()}"`,
      "",
      `"Total Invoiced","${formatCurrency(ledgerTotals.totalInvoiced)}"`,
      `"Total Paid","${formatCurrency(ledgerTotals.totalPaid)}"`,
      `"Outstanding Balance","${formatCurrency(ledgerTotals.balance)}"`,
      "",
      "Line #,Date,Type,Reference,Description,Debit,Credit,Running Balance",
    ];

    ledgerRows.forEach((row, idx) => {
      const dateStr = formatDate(row.date);
      const safeDesc = (row.description || "").replace(/"/g, '""');
      const debit = row.debit != null ? String(row.debit) : "";
      const credit = row.credit != null ? String(row.credit) : "";
      const balance = row.balance != null ? String(row.balance) : "";
      lines.push(
        [
          idx + 1,
          `"${dateStr}"`,
          `"${(row.type || "").replace(/"/g, '""')}"`,
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
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Client_Ledger_${(client?.name || "Client").replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportLedgerToPrint = () => {
    if (!ledgerClientId || ledgerRows.length === 0) return;
    const client = clients.find((c) => String(c.id) === String(ledgerClientId));
    const clientName = (client?.name || "Client").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = ledgerRows
      .map(
        (row, idx) => `
        <tr>
          <td class="cell-num">${idx + 1}</td>
          <td class="cell-text">${formatDate(row.date)}</td>
          <td class="cell-text">${(row.type || "").replace(/</g, "&lt;")}</td>
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
        <title>Client Ledger - ${clientName}</title>
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
          <h1>Client Ledger</h1>
          <div class="sub">${clientName}</div>
        </div>
        <div class="report-meta">
          <strong>Generated:</strong> ${generated}
        </div>
        <div class="summary-box">
          <span>Total Invoiced:</span> ${formatCurrency(ledgerTotals.totalInvoiced)}
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
        <div class="report-footer">CPC Accounting System · Client Ledger Report · ${generated}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchTerm || filterStatus !== "all";

  if (loading && initialLoading) {
    return (
      <div className="container-fluid px-3 pt-0 pb-2">
        <LoadingSpinner text="Loading clients and invoices..." />
      </div>
    );
  }

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 clients-ar-container ${
        !loading ? "fadeIn" : ""
      }`}
    >
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

        /* Modern SaaS Tab Animations */
        @keyframes tabSlideIn {
          from {
            opacity: 0;
            transform: translateY(-3px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes tabPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes tabGlow {
          0%, 100% {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          }
          50% {
            box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.2);
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

        /* Modern SaaS Tab Classes */
        .active-saas-tab {
          animation: tabSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .active-saas-tab .badge {
          animation: tabPulse 0.4s ease-out;
        }

        .inactive-saas-tab:hover {
          transform: translateY(-1px);
        }

        /* Corporate-style tabs: mobile-first, underline style */
        .client-ar-tabs {
          border-bottom: 1px solid var(--border-color, #dee2e6);
          background: var(--background-white, #fff);
          width: 100%;
        }

        @media (max-width: 767.98px) {
          .client-ar-tabs {
            border-radius: 0;
            box-shadow: none;
            padding: 0;
            gap: 0;
            display: flex;
            flex-wrap: nowrap;
            border-bottom: 1px solid var(--border-color, #dee2e6);
            background: var(--background-white, #fff);
          }

          .client-ar-tab-btn {
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

          .client-ar-tab-btn:hover {
            color: var(--primary-color);
            background: rgba(0, 0, 0, 0.02);
          }

          .client-ar-tab-btn.active {
            color: var(--primary-color);
            font-weight: 600;
            border-bottom-color: var(--primary-color);
            background: transparent;
          }

          .client-ar-tab-btn .client-ar-tab-icon {
            font-size: 1rem;
            opacity: 0.9;
          }

          .client-ar-tab-btn .client-ar-tab-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }

          .client-ar-tab-btn .client-ar-tab-badge {
            font-size: 0.625rem;
            padding: 0.125rem 0.35rem;
            min-width: 1.25rem;
          }

          .client-ar-tabs .inactive-saas-tab:hover {
            transform: none;
          }
        }

        @media (min-width: 768px) {
          .client-ar-tabs {
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

          .client-ar-tab-btn {
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

          .client-ar-tab-btn:hover {
            background: rgba(255, 255, 255, 0.5) !important;
            color: var(--primary-color);
          }

          .client-ar-tab-btn.active {
            background: white !important;
            color: var(--primary-color) !important;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
          }

          .client-ar-tab-btn.active .client-ar-tab-badge {
            background: var(--primary-color) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }

          .client-ar-tab-btn:not(.active) .client-ar-tab-badge {
            background: white !important;
            color: var(--text-primary, #212529) !important;
            border: none !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          }

          .client-ar-tab-btn .client-ar-tab-icon {
            font-size: 1rem;
            margin-right: 0.375rem;
          }

          .client-ar-tab-btn .client-ar-tab-label {
            margin-right: 0;
          }

          .client-ar-tab-btn .client-ar-tab-badge {
            font-size: 0.6875rem;
            padding: 0.25rem 0.5rem;
            font-weight: 600;
            margin-left: 0.125rem;
          }

          .client-ar-tab-btn.client-ar-tab-ledger {
            min-width: 160px;
          }
        }

        /* Mobile-only: match Journal Entries table sticky # + Actions */
        @media (max-width: 767.98px) {
          .clients-ar-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }

          .clients-ar-table-wrap table {
            min-width: 820px;
            border-collapse: separate;
            border-spacing: 0;
          }

          .clients-ar-table-wrap .je-col-index,
          .clients-ar-table-wrap .je-col-actions {
            position: sticky;
            background-color: var(--bs-table-bg);
            z-index: 5;
          }

          .clients-ar-table-wrap thead .je-col-index,
          .clients-ar-table-wrap thead .je-col-actions {
            z-index: 7;
            background: var(--background-light, #f8f9fa);
          }

          .clients-ar-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }

          .clients-ar-table-wrap .je-col-actions {
            left: 44px;
            min-width: 128px;
            width: 128px;
          }

          .clients-ar-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .clients-ar-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: var(--bs-table-striped-bg);
          }

          .clients-ar-table-wrap.table-hover > tbody > tr:hover > .je-col-index,
          .clients-ar-table-wrap.table-hover > tbody > tr:hover > .je-col-actions {
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
            <FaUserTie className="me-2" />
            Clients / Accounts Receivable
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage clients and track receivables
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={() => {
              resetClientForm();
              setShowClientForm(true);
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
            Add Client
          </button>
          <button
            className="btn btn-sm btn-success text-white"
            onClick={() => {
              resetInvoiceForm();
              setShowInvoiceForm(true);
            }}
            disabled={clients.length === 0}
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
            Create Invoice
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              fetchClients();
              fetchInvoices();
            }}
            disabled={loading}
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

      {/* Statistics Cards */}
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
                    Total Clients
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total Clients", clients.length, false)
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
                      if (!initialLoading) {
                        e.target.style.opacity = "1";
                        e.target.style.transform = "scale(1)";
                      }
                    }}
                  >
                    {initialLoading
                      ? "..."
                      : abbreviateNumber(clients.length, false)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
                  </div>
                </div>
                <div className="col-auto flex-shrink-0 ms-2">
                  <i
                    className="fas fa-users"
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
                    Total AR
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      handleNumberClick("Total AR", totalAR, true)
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
                      if (!initialLoading) {
                        e.target.style.opacity = "1";
                        e.target.style.transform = "scale(1)";
                      }
                    }}
                  >
                    {initialLoading ? "..." : abbreviateNumber(totalAR, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
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
                    style={{ color: "var(--primary-dark)" }}
                  >
                    Total Invoices
                  </div>
                  <div
                    className="mb-0 fw-bold"
                    onClick={() =>
                      !initialLoading &&
                      !invoicesLoading &&
                      handleNumberClick("Total Invoices", totalInvoices, true)
                    }
                    style={{
                      color: "var(--primary-dark)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor:
                        initialLoading || invoicesLoading
                          ? "default"
                          : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading && !invoicesLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!initialLoading && !invoicesLoading) {
                        e.target.style.opacity = "1";
                        e.target.style.transform = "scale(1)";
                      }
                    }}
                  >
                    {initialLoading || invoicesLoading
                      ? "..."
                      : abbreviateNumber(totalInvoices, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
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
                      !invoicesLoading &&
                      handleNumberClick("Total Paid", totalPaid, true)
                    }
                    style={{
                      color: "var(--success-color)",
                      fontSize: "clamp(1rem, 3vw, 1.8rem)",
                      lineHeight: "1.2",
                      cursor:
                        initialLoading || invoicesLoading
                          ? "default"
                          : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!initialLoading && !invoicesLoading) {
                        e.target.style.opacity = "0.8";
                        e.target.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!initialLoading && !invoicesLoading) {
                        e.target.style.opacity = "1";
                        e.target.style.transform = "scale(1)";
                      }
                    }}
                  >
                    {initialLoading || invoicesLoading
                      ? "..."
                      : abbreviateNumber(totalPaid, true)}
                  </div>
                  <div
                    className="text-xxs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.65rem",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Click to view full number
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

      {/* Search and Filter Controls */}
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
                    activeTab === "clients"
                      ? "Search by name, email, phone..."
                      : "Search by invoice number, client..."
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
                    className="btn btn-sm clear-search-btn"
                    type="button"
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
            {activeTab === "invoices" && (
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
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="void">Void</option>
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
                  setClientsPage(1);
                  setInvoicesPage(1);
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
                className="btn btn-sm btn-outline-secondary w-100 w-md-auto"
                type="button"
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

      {/* Corporate-style Tabs: underline on mobile, pill on desktop */}
      <div className="mb-4 w-100">
        <div className="client-ar-tabs">
          <button
            type="button"
            className={`client-ar-tab-btn position-relative ${
              activeTab === "clients"
                ? "active active-saas-tab"
                : "inactive-saas-tab"
            }`}
            onClick={() => setActiveTab("clients")}
          >
            <i className="fas fa-users client-ar-tab-icon" aria-hidden></i>
            <span className="client-ar-tab-label">Clients</span>
            <span
              className={`badge rounded-pill client-ar-tab-badge ${
                activeTab === "clients"
                  ? "bg-primary text-white"
                  : "bg-secondary text-white"
              }`}
            >
              {filteredClients.length}
            </span>
          </button>
          <button
            type="button"
            className={`client-ar-tab-btn position-relative ${
              activeTab === "invoices"
                ? "active active-saas-tab"
                : "inactive-saas-tab"
            }`}
            onClick={() => setActiveTab("invoices")}
          >
            <i
              className="fas fa-file-invoice client-ar-tab-icon"
              aria-hidden
            ></i>
            <span className="client-ar-tab-label">Invoices</span>
            <span
              className={`badge rounded-pill client-ar-tab-badge ${
                activeTab === "invoices"
                  ? "bg-primary text-white"
                  : "bg-secondary text-white"
              }`}
            >
              {filteredInvoices.length}
            </span>
          </button>
          <button
            type="button"
            className={`client-ar-tab-btn client-ar-tab-ledger position-relative ${
              activeTab === "ledger"
                ? "active active-saas-tab"
                : "inactive-saas-tab"
            }`}
            onClick={() => setActiveTab("ledger")}
          >
            <i className="fas fa-book client-ar-tab-icon" aria-hidden></i>
            <span className="client-ar-tab-label">
              <span className="d-none d-sm-inline">Client </span>Ledger
            </span>
          </button>
        </div>
      </div>

      {/* Clients Tab */}
      {activeTab === "clients" && (
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
                <i className="fas fa-users me-2"></i>
                Clients
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    ({filteredClients.length} total)
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {filteredClients.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-users fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Clients Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Start by creating your first client."}
                </p>
              </div>
            ) : (
              <div className="table-responsive clients-ar-table-wrap table-striped table-hover">
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
                        Total AR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsCurrent.map((client, index) => (
                      <tr key={client.id} className="align-middle">
                        <td
                          className="text-center fw-bold je-col-index"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {clientsStartIndex + index + 1}
                        </td>
                        <td className="text-center je-col-actions">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowClientViewModal(true);
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaEye style={{ fontSize: "0.875rem" }} />
                            </button>
                            <button
                              className="btn btn-success btn-sm text-white"
                              onClick={() => {
                                setEditingClient(client);
                                const p = client.profile || {};
                                const business = p.business || {};
                                const marketing = p.marketing || {};
                                const real_estate = p.real_estate || {};
                                setClientForm({
                                  name: client.name,
                                  email: client.email || "",
                                  phone: client.phone || "",
                                  address: client.address || "",
                                  contact_person: client.contact_person || "",
                                  notes: client.notes || "",
                                  profile: {
                                    client_category:
                                      p.client_category || "universal",
                                    services_availed: Array.isArray(
                                      p.services_availed,
                                    )
                                      ? p.services_availed
                                      : [],
                                    services_other: p.services_other || "",
                                    business: {
                                      company_name: business.company_name || "",
                                      industry: business.industry || "",
                                      website: business.website || "",
                                    },
                                    marketing: {
                                      lead_source: marketing.lead_source || "",
                                      campaign: marketing.campaign || "",
                                      preferred_channel:
                                        marketing.preferred_channel || "",
                                    },
                                    real_estate: {
                                      property_type:
                                        real_estate.property_type || "",
                                      building_type:
                                        real_estate.building_type || "",
                                      stories: real_estate.stories || "",
                                      lot_area_sqm:
                                        real_estate.lot_area_sqm || "",
                                      floor_area_sqm:
                                        real_estate.floor_area_sqm || "",
                                      location: real_estate.location || "",
                                      project_stage:
                                        real_estate.project_stage || "",
                                    },
                                  },
                                });
                                setShowClientForm(true);
                              }}
                              title="Edit Client"
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaEdit style={{ fontSize: "0.875rem" }} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeleteClient(client)}
                              title="Delete Client"
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaTrash style={{ fontSize: "0.875rem" }} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div
                            className="fw-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {client.name}
                          </div>
                          {client.contact_person && (
                            <div className="small text-muted">
                              Contact: {client.contact_person}
                            </div>
                          )}
                        </td>
                        <td className="text-muted small">
                          {client.phone || "-"}
                        </td>
                        <td className="text-muted small">
                          {client.email || "-"}
                        </td>
                        <td className="text-end">
                          <strong
                            className={
                              client.total_receivable > 0
                                ? "text-warning"
                                : "text-success"
                            }
                          >
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(client.total_receivable)}
                              onClick={() =>
                                handleNumberClick(
                                  "Total AR",
                                  client.total_receivable,
                                  true,
                                )
                              }
                            >
                              {formatCurrency(client.total_receivable)}
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

          {!loading && filteredClients.length > 0 && (
            <div className="card-footer bg-white border-top px-3 py-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <small style={{ color: "var(--text-muted)" }}>
                    Showing{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {clientsStartIndex + 1}-
                      {Math.min(
                        clientsStartIndex + clientsCurrent.length,
                        filteredClients.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {filteredClients.length}
                    </span>{" "}
                    clients
                  </small>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setClientsPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={clientsPage === 1}
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
                      const totalPages = clientsTotalPages;

                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);
                        let start = Math.max(2, clientsPage - 1);
                        let end = Math.min(totalPages - 1, clientsPage + 1);

                        if (clientsPage <= 2) {
                          end = 4;
                        } else if (clientsPage >= totalPages - 1) {
                          start = totalPages - 3;
                        }

                        if (start > 2) {
                          pages.push("...");
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (end < totalPages - 1) {
                          pages.push("...");
                        }

                        if (totalPages > 1) {
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() => page !== "..." && setClientsPage(page)}
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${
                              clientsPage === page
                                ? "var(--primary-color)"
                                : "var(--input-border)"
                            }`,
                            color:
                              clientsPage === page
                                ? "white"
                                : "var(--text-primary)",
                            backgroundColor:
                              clientsPage === page
                                ? "var(--primary-color)"
                                : "transparent",
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled && clientsPage !== page) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-light)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled && clientsPage !== page) {
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
                      Page {clientsPage} of {clientsTotalPages}
                    </small>
                  </div>

                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setClientsPage((prev) =>
                        Math.min(prev + 1, clientsTotalPages),
                      )
                    }
                    disabled={clientsPage === clientsTotalPages}
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

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
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
                Invoices
                {!loading && (
                  <small className="opacity-75 ms-2 text-white">
                    (
                    {invoicesLoading && invoicesArray.length === 0
                      ? "Loading..."
                      : `${filteredInvoices.length} total`}
                    )
                  </small>
                )}
              </h5>
            </div>
          </div>
          <div className="card-body p-0">
            {invoicesLoading && invoicesArray.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  Loading invoices...
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  Please wait while we fetch the latest invoices.
                </p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="fas fa-file-invoice fa-3x"
                    style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  ></i>
                </div>
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  No Invoices Found
                </h5>
                <p
                  className="mb-3 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search criteria"
                    : "Start by creating your first invoice."}
                </p>
              </div>
            ) : (
              <div className="table-responsive clients-ar-table-wrap">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
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
                        style={{ width: "12%" }}
                      >
                        Invoice #
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "15%" }}
                      >
                        Client
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
                        style={{ width: "12%" }}
                      >
                        Amount
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "12%" }}
                      >
                        Paid
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "12%" }}
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
                    {invoicesCurrent.map((invoice, index) => (
                      <tr key={invoice.id} className="align-middle">
                        <td
                          className="text-center fw-bold je-col-index"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {invoicesStartIndex + index + 1}
                        </td>
                        <td className="text-center je-col-actions">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => {
                                setSelectedInvoice(invoice);
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
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 4px 8px rgba(0,0,0,0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <FaEye style={{ fontSize: "0.875rem" }} />
                            </button>
                            {invoice.balance > 0 &&
                              invoice.status !== "void" && (
                                <button
                                  className="btn btn-success btn-sm text-white"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setPaymentForm({
                                      ...paymentForm,
                                      invoice_id: invoice.id.toString(),
                                      amount: invoice.balance.toString(),
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
                            {invoice.status !== "void" && (
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => {
                                  setEditingInvoice(invoice);
                                  setInvoiceForm({
                                    client_id:
                                      invoice.client_id?.toString() ||
                                      invoice.client?.id?.toString() ||
                                      "",
                                    invoice_date: invoice.invoice_date
                                      ? new Date(invoice.invoice_date)
                                          .toISOString()
                                          .slice(0, 10)
                                      : "",
                                    due_date: invoice.due_date
                                      ? new Date(invoice.due_date)
                                          .toISOString()
                                          .slice(0, 10)
                                      : "",
                                    income_account_id:
                                      invoice.income_account_id?.toString() ||
                                      "",
                                    total_amount:
                                      invoice.total_amount?.toString() || "",
                                    description: invoice.description || "",
                                  });
                                  setShowInvoiceForm(true);
                                }}
                                title="Edit Invoice"
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
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                <FaEdit style={{ fontSize: "0.875rem" }} />
                              </button>
                            )}
                            {invoice.status !== "void" && (
                              <button
                                className="btn btn-danger btn-sm text-white"
                                onClick={() => handleDeleteInvoice(invoice)}
                                title="Delete Invoice"
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
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="small">
                            {invoice.invoice_number}
                          </code>
                        </td>
                        <td className="small">{invoice.client?.name || "-"}</td>
                        <td className="text-muted small">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="text-muted small">
                          {invoice.due_date
                            ? formatDate(invoice.due_date)
                            : "-"}
                        </td>
                        <td className="text-end fw-semibold">
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: "140px", cursor: "pointer" }}
                            title={formatCurrency(invoice.total_amount)}
                            onClick={() =>
                              handleNumberClick(
                                "Amount",
                                invoice.total_amount,
                                true,
                              )
                            }
                          >
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </td>
                        <td className="text-end text-success fw-semibold">
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: "140px", cursor: "pointer" }}
                            title={formatCurrency(invoice.paid_amount)}
                            onClick={() =>
                              handleNumberClick(
                                "Paid",
                                invoice.paid_amount,
                                true,
                              )
                            }
                          >
                            {formatCurrency(invoice.paid_amount)}
                          </span>
                        </td>
                        <td className="text-end">
                          <strong
                            className={
                              invoice.balance > 0
                                ? "text-warning"
                                : "text-success"
                            }
                          >
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(invoice.balance)}
                              onClick={() =>
                                handleNumberClick(
                                  "Balance",
                                  invoice.balance,
                                  true,
                                )
                              }
                            >
                              {formatCurrency(invoice.balance)}
                            </span>
                          </strong>
                        </td>
                        <td>
                          {(() => {
                            const status = getInvoiceStatus(invoice);
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

          {!invoicesLoading && filteredInvoices.length > 0 && (
            <div className="card-footer bg-white border-top px-3 py-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <small style={{ color: "var(--text-muted)" }}>
                    Showing{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {invoicesStartIndex + 1}-
                      {Math.min(
                        invoicesStartIndex + invoicesCurrent.length,
                        filteredInvoices.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {filteredInvoices.length}
                    </span>{" "}
                    invoices
                  </small>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setInvoicesPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={invoicesPage === 1}
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
                      const totalPages = invoicesTotalPages;

                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);
                        let start = Math.max(2, invoicesPage - 1);
                        let end = Math.min(totalPages - 1, invoicesPage + 1);

                        if (invoicesPage <= 2) {
                          end = 4;
                        } else if (invoicesPage >= totalPages - 1) {
                          start = totalPages - 3;
                        }

                        if (start > 2) {
                          pages.push("...");
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (end < totalPages - 1) {
                          pages.push("...");
                        }

                        if (totalPages > 1) {
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() =>
                            page !== "..." && setInvoicesPage(page)
                          }
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${
                              invoicesPage === page
                                ? "var(--primary-color)"
                                : "var(--input-border)"
                            }`,
                            color:
                              invoicesPage === page
                                ? "white"
                                : "var(--text-primary)",
                            backgroundColor:
                              invoicesPage === page
                                ? "var(--primary-color)"
                                : "transparent",
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled && invoicesPage !== page) {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                              e.target.style.backgroundColor =
                                "var(--primary-light)";
                              e.target.style.color = "white";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled && invoicesPage !== page) {
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
                      Page {invoicesPage} of {invoicesTotalPages}
                    </small>
                  </div>

                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setInvoicesPage((prev) =>
                        Math.min(prev + 1, invoicesTotalPages),
                      )
                    }
                    disabled={invoicesPage === invoicesTotalPages}
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

      {/* Ledger Tab */}
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
                Client Ledger
              </h5>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <label
                    className="form-label small fw-semibold mb-0 me-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Client
                  </label>
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 220 }}
                    value={ledgerClientId}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setLedgerClientId(value);
                      setLedgerPage(1);
                      await fetchLedgerPayments(value);
                    }}
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={exportLedgerToCsv}
                    disabled={!ledgerClientId || ledgerRows.length === 0}
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
                    disabled={!ledgerClientId || ledgerRows.length === 0}
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
            {!ledgerClientId ? (
              <div className="text-center py-5">
                <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                  Select a client to view the ledger.
                </h5>
                <p
                  className="mb-0 small"
                  style={{ color: "var(--text-muted)" }}
                >
                  Choose a client from the dropdown above to see all invoices
                  and payments with a running balance.
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
                  Loading client ledger...
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
                  This client has no invoices or payments yet.
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
                            Total Invoiced
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
                            title={formatCurrency(ledgerTotals.totalInvoiced)}
                            onClick={() =>
                              handleNumberClick(
                                "Total Invoiced",
                                ledgerTotals.totalInvoiced,
                                true,
                              )
                            }
                          >
                            {formatCurrency(ledgerTotals.totalInvoiced)}
                          </div>
                          <div
                            className="text-xxs mt-1"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.65rem",
                              fontStyle: "italic",
                            }}
                          >
                            <i className="fas fa-info-circle me-1"></i>
                            Click to view full number
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
                            <i className="fas fa-info-circle me-1"></i>
                            Click to view full number
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
                            <i className="fas fa-info-circle me-1"></i>
                            Click to view full number
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive clients-ar-table-wrap table-striped table-hover mt-3">
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
                          style={{ width: "16%" }}
                        >
                          Reference
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "28%" }}
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
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(-1px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                    e.currentTarget.style.backgroundColor =
                                      "#5a6268";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.backgroundColor =
                                      "#6c757d";
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
                                className={`badge ${
                                  row.type === "Invoice"
                                    ? "bg-primary-subtle text-primary border-primary"
                                    : "bg-success-subtle text-success border-success"
                                } border`}
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

          {ledgerClientId && !ledgerLoading && ledgerRows.length > 0 && (
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
                    onClick={() =>
                      setLedgerPage((prev) => Math.max(prev - 1, 1))
                    }
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
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);
                        let start = Math.max(2, ledgerPage - 1);
                        let end = Math.min(totalPages - 1, ledgerPage + 1);

                        if (ledgerPage <= 2) {
                          end = 4;
                        } else if (ledgerPage >= totalPages - 1) {
                          start = totalPages - 3;
                        }

                        if (start > 2) {
                          pages.push("...");
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (end < totalPages - 1) {
                          pages.push("...");
                        }

                        if (totalPages > 1) {
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((page, idx) => (
                        <button
                          key={idx}
                          className="btn btn-sm"
                          onClick={() => page !== "..." && setLedgerPage(page)}
                          disabled={page === "..."}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            border: `2px solid ${
                              ledgerPage === page
                                ? "var(--primary-color)"
                                : "var(--input-border)"
                            }`,
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
                      setLedgerPage((prev) =>
                        Math.min(prev + 1, ledgerTotalPages),
                      )
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

      {/* Ledger View Modal */}
      {ledgerSelectedRow && (
        <Portal>
          <div
            className="modal fade show d-block modal-backdrop-animation"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex="-1"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setLedgerSelectedRow(null);
              }
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

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientFormModal
          form={clientForm}
          setForm={setClientForm}
          editing={editingClient}
          onSubmit={handleSaveClient}
          onClose={resetClientForm}
          saving={savingClient}
        />
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceFormModal
          form={invoiceForm}
          setForm={setInvoiceForm}
          clients={clients}
          incomeAccounts={incomeAccounts}
          onSubmit={handleSaveInvoice}
          onClose={resetInvoiceForm}
          editing={!!editingInvoice}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <PaymentFormModal
          form={paymentForm}
          setForm={setPaymentForm}
          invoice={selectedInvoice}
          cashAccounts={cashAccounts}
          saving={savingPayment}
          onSubmit={handleSavePayment}
          onClose={resetPaymentForm}
        />
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* View Client Modal */}
      {showClientViewModal && selectedClient && (
        <ClientViewModal
          client={selectedClient}
          onClose={() => setShowClientViewModal(false)}
        />
      )}

      {/* Number View Modal */}
      {numberViewModal.show && (
        <NumberViewModal
          title={numberViewModal.title}
          value={numberViewModal.formattedValue}
          onClose={() =>
            setNumberViewModal({ ...numberViewModal, show: false })
          }
        />
      )}

      {/* Authorization Code Modal (personnel only) */}
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
          if (authCodeModal.type === "invoice") {
            handleAuthCodeSubmitInvoice(payload);
          } else if (authCodeModal.type === "client") {
            handleAuthCodeSubmitClient(payload);
          } else if (authCodeModal.type === "voidPayment") {
            handleAuthCodeSubmitVoidPayment(payload);
          }
        }}
        loading={authCodeSubmitting}
        title="Authorization Required"
        message={
          authCodeModal.type === "invoice"
            ? "Enter the authorization code from your administrator to delete this invoice."
            : authCodeModal.type === "client"
              ? "Enter the authorization code from your administrator to delete this client."
              : authCodeModal.type === "voidPayment"
                ? "Enter the authorization code from your administrator to void this payment."
                : "Enter the authorization code from your administrator to confirm this action."
        }
        actionLabel={
          authCodeModal.type === "invoice"
            ? "Delete Invoice"
            : authCodeModal.type === "client"
              ? "Delete Client"
              : authCodeModal.type === "voidPayment"
                ? "Void Payment"
                : "Confirm"
        }
        error={authCodeModal.error}
      />
    </div>
  );
};

// Client Form Modal Component
const ClientFormModal = ({
  form,
  setForm,
  editing,
  onSubmit,
  onClose,
  saving = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialFormState = useRef(null);
  const SERVICE_OPTIONS = [
    "Bookkeeping",
    "Accounting Consultation",
    "Tax Compliance",
    "Payroll",
    "Audit Support",
    "Business Registration",
    "Real Estate Services",
    "Marketing Support",
    "Other",
  ];

  const safeProfile = form.profile || {};
  const safeBusiness = safeProfile.business || {};
  const safeMarketing = safeProfile.marketing || {};
  const safeRE = safeProfile.real_estate || {};

  const updateProfile = (patch) => {
    setForm({
      ...form,
      profile: {
        client_category: safeProfile.client_category || "universal",
        services_availed: Array.isArray(safeProfile.services_availed)
          ? safeProfile.services_availed
          : [],
        services_other: safeProfile.services_other || "",
        business: {
          company_name: safeBusiness.company_name || "",
          industry: safeBusiness.industry || "",
          website: safeBusiness.website || "",
        },
        marketing: {
          lead_source: safeMarketing.lead_source || "",
          campaign: safeMarketing.campaign || "",
          preferred_channel: safeMarketing.preferred_channel || "",
        },
        real_estate: {
          property_type: safeRE.property_type || "",
          building_type: safeRE.building_type || "",
          stories: safeRE.stories || "",
          lot_area_sqm: safeRE.lot_area_sqm || "",
          floor_area_sqm: safeRE.floor_area_sqm || "",
          location: safeRE.location || "",
          project_stage: safeRE.project_stage || "",
        },
        ...patch,
      },
    });
  };

  const toggleService = (service) => {
    const curr = Array.isArray(safeProfile.services_availed)
      ? safeProfile.services_availed
      : [];
    const next = curr.includes(service)
      ? curr.filter((s) => s !== service)
      : [...curr, service];
    updateProfile({ services_availed: next });
  };

  const validateEmail = (value) => {
    if (!value) return true;
    // simple, practical email check (backend enforces strict validation)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  };

  const validatePhone = (value) => {
    if (!value) return true;
    const raw = String(value).trim();
    // allow +, digits, spaces, dash, parentheses
    if (!/^[+()\-\s0-9]+$/.test(raw)) return false;
    const digits = raw.replace(/\D/g, "");
    // common corporate constraint (E.164-ish)
    return digits.length >= 7 && digits.length <= 15;
  };

  const validateUrl = (value) => {
    if (!value) return true;
    const raw = String(value).trim();
    try {
      // accept "example.com" by coercing scheme
      const url =
        raw.startsWith("http://") || raw.startsWith("https://")
          ? raw
          : `https://${raw}`;
      // eslint-disable-next-line no-new
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const next = {};
    const name = String(form.name || "").trim();
    if (!name) next.name = "Client name is required.";
    else if (name.length < 2)
      next.name = "Client name must be at least 2 characters.";

    if (!validateEmail(form.email)) next.email = "Enter a valid email address.";
    if (!validatePhone(form.phone))
      next.phone = "Enter a valid contact number.";
    if (!String(form.contact_person || "").trim())
      next.contact_person = "Contact person is required.";

    if (!validateUrl(safeBusiness.website))
      next.website = "Enter a valid website or link.";

    const services = Array.isArray(safeProfile.services_availed)
      ? safeProfile.services_availed
      : [];
    const servicesOther = String(safeProfile.services_other || "").trim();
    if (services.includes("Other") && !servicesOther) {
      next.services_other = "Please specify other service(s).";
    }

    const isRE = (safeProfile.client_category || "universal") === "real_estate";
    if (isRE) {
      if (!String(safeRE.property_type || "").trim())
        next.property_type = "Property type is required.";
      if (!String(safeRE.location || "").trim())
        next.location = "Location is required.";
      if (
        safeRE.stories !== "" &&
        safeRE.stories !== null &&
        safeRE.stories !== undefined
      ) {
        const v = Number(safeRE.stories);
        if (!Number.isFinite(v) || v < 0)
          next.stories = "Storeys must be a valid number.";
      }
      if (
        safeRE.lot_area_sqm !== "" &&
        safeRE.lot_area_sqm !== null &&
        safeRE.lot_area_sqm !== undefined
      ) {
        const v = Number(safeRE.lot_area_sqm);
        if (!Number.isFinite(v) || v < 0)
          next.lot_area_sqm = "Lot area must be a valid number.";
      }
      if (
        safeRE.floor_area_sqm !== "" &&
        safeRE.floor_area_sqm !== null &&
        safeRE.floor_area_sqm !== undefined
      ) {
        const v = Number(safeRE.floor_area_sqm);
        if (!Number.isFinite(v) || v < 0)
          next.floor_area_sqm = "Floor area must be a valid number.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const sanitizePhoneInput = (value) => {
    // Allow only: digits, space, +, -, (, )
    const cleaned = String(value || "").replace(/[^0-9+()\-\s]/g, "");
    // keep only one leading plus
    const normalized = cleaned.replace(/\+/g, (m, offset) =>
      offset === 0 ? "+" : "",
    );
    return normalized;
  };

  const setPhoneRealtime = (rawValue) => {
    const nextValue = sanitizePhoneInput(rawValue);
    setForm({ ...form, phone: nextValue });

    // realtime validation feedback
    const ok = validatePhone(nextValue);
    setErrors((prev) => ({
      ...prev,
      phone: ok ? undefined : "Enter a valid contact number.",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(e);
  };

  // Unsaved changes tracking
  useEffect(() => {
    if (initialFormState.current === null) {
      initialFormState.current = JSON.stringify(form);
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialFormState.current) {
      const changed = JSON.stringify(form) !== initialFormState.current;
      setHasUnsavedChanges(changed);
    }
  }, [form]);

  const handleCloseAttempt = async () => {
    if (saving) return;

    if (hasUnsavedChanges) {
      const result = await showAlert.confirm(
        "Unsaved Changes",
        "You have unsaved client details. Are you sure you want to close without saving?",
        "Yes, Close",
        "Continue Editing",
      );

      if (!result.isConfirmed) {
        return;
      }
    }

    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseAttempt();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      handleCloseAttempt();
    }
  };

  const handleClose = () => {
    handleCloseAttempt();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
      <style>{`
        @keyframes clientSectionIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-form-section {
          animation: clientSectionIn 220ms ease-out both;
        }

        /* Remove glow/box-shadow from submit button */
        .client-submit-btn,
        .client-submit-btn:focus,
        .client-submit-btn:active {
          box-shadow: none !important;
          outline: none !important;
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
        <div className="modal-dialog modal-dialog-centered modal-lg">
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
                <FaUserTie className="me-2" />
                {editing ? "Edit Client" : "New Client"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                disabled={saving}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {/* Category (professional / no helper text) */}
                <div className="client-form-section d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-2 mb-3">
                  <div>
                    <div
                      className="fw-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Client Details
                    </div>
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <label
                      className="form-label small fw-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Category
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={safeProfile.client_category || "universal"}
                      onChange={(e) =>
                        updateProfile({ client_category: e.target.value })
                      }
                    >
                      <option value="universal">General Business</option>
                      <option value="real_estate">Real Estate</option>
                    </select>
                  </div>
                </div>

                {/* Basic details */}
                <div
                  className="client-form-section bg-white border rounded-3 p-3 mb-3"
                  style={{ animationDelay: "40ms" }}
                >
                  <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                    <FaIdCard />
                    <span>Basic Information</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.name ? "is-invalid" : ""
                        }`}
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="e.g., Juan Dela Cruz / ABC Trading"
                        required
                      />
                      {errors.name && (
                        <div className="invalid-feedback">{errors.name}</div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Contact Person
                      </label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.contact_person ? "is-invalid" : ""
                        }`}
                        value={form.contact_person}
                        onChange={(e) =>
                          setForm({ ...form, contact_person: e.target.value })
                        }
                        placeholder="e.g., Maria Santos"
                      />
                      {errors.contact_person && (
                        <div className="invalid-feedback">
                          {errors.contact_person}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        className={`form-control ${
                          errors.email ? "is-invalid" : ""
                        }`}
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="e.g., name@company.com"
                      />
                      {errors.email && (
                        <div className="invalid-feedback">{errors.email}</div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Phone
                      </label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.phone ? "is-invalid" : ""
                        }`}
                        value={form.phone}
                        inputMode="tel"
                        autoComplete="tel"
                        pattern="^[+()\-\s0-9]+$"
                        placeholder="e.g., +63 912 345 6789"
                        onBeforeInput={(e) => {
                          // Block invalid characters before they appear
                          const data = e.data ?? "";
                          if (data && /[^0-9+()\-\s]/.test(data)) {
                            e.preventDefault();
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow navigation/edit keys
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                            "Home",
                            "End",
                            "Tab",
                            "Enter",
                          ];
                          if (allowedKeys.includes(e.key)) return;
                          if (e.ctrlKey || e.metaKey) return; // copy/paste/select all

                          // Allow only digits and formatting characters
                          if (/^[0-9()+\-\s]$/.test(e.key)) return;
                          e.preventDefault();
                        }}
                        onChange={(e) => setPhoneRealtime(e.target.value)}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          e.preventDefault();
                          setPhoneRealtime(text);
                        }}
                      />
                      {errors.phone && (
                        <div className="invalid-feedback">{errors.phone}</div>
                      )}
                    </div>
                    <div className="col-12">
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
                        placeholder="Street, Barangay, City, Province"
                      />
                    </div>
                  </div>
                </div>

                {/* Services Availed */}
                <div
                  className="client-form-section bg-white border rounded-3 p-3 mb-3"
                  style={{ animationDelay: "80ms" }}
                >
                  <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                    <FaClipboardList />
                    <span>Services Availed</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((svc) => {
                      const selected =
                        Array.isArray(safeProfile.services_availed) &&
                        safeProfile.services_availed.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          className={`btn btn-sm ${
                            selected
                              ? "btn-primary text-white"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => toggleService(svc)}
                          style={{ borderRadius: "999px" }}
                        >
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                  {Array.isArray(safeProfile.services_availed) &&
                    safeProfile.services_availed.includes("Other") && (
                      <div
                        className="client-form-section mt-3"
                        style={{ animationDelay: "40ms" }}
                      >
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Other service(s)
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.services_other ? "is-invalid" : ""
                          }`}
                          value={safeProfile.services_other || ""}
                          onChange={(e) =>
                            updateProfile({ services_other: e.target.value })
                          }
                          placeholder="Specify other services (e.g., Permits processing, Site inspection)"
                        />
                        {errors.services_other && (
                          <div className="invalid-feedback">
                            {errors.services_other}
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Business & Marketing */}
                <div
                  className="client-form-section bg-white border rounded-3 p-3 mb-3"
                  style={{ animationDelay: "120ms" }}
                >
                  <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                    <FaBriefcase />
                    <span>Business</span>
                    <span className="text-muted" style={{ fontWeight: 600 }}>
                      /
                    </span>
                    <FaBullhorn />
                    <span>Marketing</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Company / Business Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={safeBusiness.company_name || ""}
                        onChange={(e) =>
                          updateProfile({
                            business: {
                              ...safeBusiness,
                              company_name: e.target.value,
                            },
                          })
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Industry
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={safeBusiness.industry || ""}
                        onChange={(e) =>
                          updateProfile({
                            business: {
                              ...safeBusiness,
                              industry: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g., Construction, Retail, IT"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Website / Social Link
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={safeBusiness.website || ""}
                        onChange={(e) =>
                          updateProfile({
                            business: {
                              ...safeBusiness,
                              website: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g., company.com / facebook.com/page"
                      />
                      {errors.website && (
                        <div className="small text-danger mt-1">
                          {errors.website}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Lead Source
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={safeMarketing.lead_source || ""}
                        onChange={(e) =>
                          updateProfile({
                            marketing: {
                              ...safeMarketing,
                              lead_source: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g., Referral, Facebook, Walk-in"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Campaign
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={safeMarketing.campaign || ""}
                        onChange={(e) =>
                          updateProfile({
                            marketing: {
                              ...safeMarketing,
                              campaign: e.target.value,
                            },
                          })
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Preferred Channel
                      </label>
                      <select
                        className="form-select"
                        value={safeMarketing.preferred_channel || ""}
                        onChange={(e) =>
                          updateProfile({
                            marketing: {
                              ...safeMarketing,
                              preferred_channel: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Select</option>
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="facebook">Facebook</option>
                        <option value="viber">Viber</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="walk_in">Walk-in</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Real Estate Details (only when selected) */}
                {(safeProfile.client_category || "universal") ===
                  "real_estate" && (
                  <div
                    className="client-form-section bg-white border rounded-3 p-3 mb-3"
                    style={{ animationDelay: "160ms" }}
                  >
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                      <FaBuilding />
                      <span>Real Estate</span>
                    </div>
                    <div className="row g-2">
                      <div className="col-12 col-md-6">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Property Type
                        </label>
                        <select
                          className={`form-select ${
                            errors.property_type ? "is-invalid" : ""
                          }`}
                          value={safeRE.property_type || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                property_type: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select</option>
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                          <option value="industrial">Industrial</option>
                          <option value="land">Land</option>
                          <option value="mixed_use">Mixed-use</option>
                        </select>
                        {errors.property_type && (
                          <div className="invalid-feedback">
                            {errors.property_type}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Building Type
                        </label>
                        <select
                          className="form-select"
                          value={safeRE.building_type || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                building_type: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select</option>
                          <option value="bungalow">Bungalow</option>
                          <option value="two_storey">Two-storey</option>
                          <option value="apartment">Apartment</option>
                          <option value="office">Office</option>
                          <option value="warehouse">Warehouse</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Storeys
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control ${
                            errors.stories ? "is-invalid" : ""
                          }`}
                          value={safeRE.stories || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                stories: e.target.value,
                              },
                            })
                          }
                        />
                        {errors.stories && (
                          <div className="invalid-feedback">
                            {errors.stories}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-4">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Lot Area (sqm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`form-control ${
                            errors.lot_area_sqm ? "is-invalid" : ""
                          }`}
                          value={safeRE.lot_area_sqm || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                lot_area_sqm: e.target.value,
                              },
                            })
                          }
                        />
                        {errors.lot_area_sqm && (
                          <div className="invalid-feedback">
                            {errors.lot_area_sqm}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-4">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Floor Area (sqm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`form-control ${
                            errors.floor_area_sqm ? "is-invalid" : ""
                          }`}
                          value={safeRE.floor_area_sqm || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                floor_area_sqm: e.target.value,
                              },
                            })
                          }
                        />
                        {errors.floor_area_sqm && (
                          <div className="invalid-feedback">
                            {errors.floor_area_sqm}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-8">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Location
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.location ? "is-invalid" : ""
                          }`}
                          value={safeRE.location || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                location: e.target.value,
                              },
                            })
                          }
                        />
                        {errors.location && (
                          <div className="invalid-feedback">
                            {errors.location}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-4">
                        <label
                          className="form-label small fw-semibold mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Project Stage
                        </label>
                        <select
                          className="form-select"
                          value={safeRE.project_stage || ""}
                          onChange={(e) =>
                            updateProfile({
                              real_estate: {
                                ...safeRE,
                                project_stage: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select</option>
                          <option value="inquiry">Inquiry</option>
                          <option value="planning">Planning</option>
                          <option value="on_going">On-going</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div
                  className="client-form-section bg-white border rounded-3 p-3"
                  style={{ animationDelay: "200ms" }}
                >
                  <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                    <FaBuilding style={{ visibility: "hidden" }} />
                    <span>Notes</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Optional notes"
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
                  className="btn btn-primary text-white fw-semibold client-submit-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      {editing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editing ? "Update" : "Create"} Client</>
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

// Invoice Form Modal Component
const InvoiceFormModal = ({
  form,
  setForm,
  clients,
  incomeAccounts,
  onSubmit,
  onClose,
  editing,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialFormState = useRef(null);

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
    // Remove existing commas and keep digits + decimal point
    let cleaned = input.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    setForm({ ...form, total_amount: cleaned });
  };

  // Unsaved changes tracking
  useEffect(() => {
    if (initialFormState.current === null) {
      initialFormState.current = JSON.stringify(form);
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialFormState.current) {
      const changed = JSON.stringify(form) !== initialFormState.current;
      setHasUnsavedChanges(changed);
    }
  }, [form]);

  const handleCloseAttempt = async () => {
    if (hasUnsavedChanges) {
      const result = await showAlert.confirm(
        "Unsaved Changes",
        "You have unsaved invoice details. Are you sure you want to close without saving?",
        "Yes, Close",
        "Continue Editing",
      );

      if (!result.isConfirmed) {
        return;
      }
    }

    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseAttempt();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      handleCloseAttempt();
    }
  };

  const handleClose = () => {
    handleCloseAttempt();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  return (
    <Portal>
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
        <div className="modal-dialog modal-dialog-centered modal-lg">
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
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <FaFileInvoice />
                <span>{editing ? "Edit Invoice" : "Create Invoice"}</span>
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="bg-white border rounded-3 p-3 mb-3">
                  <div className="fw-semibold mb-2">
                    {editing ? "Edit Invoice" : "Invoice Details"}
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Client <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={form.client_id}
                        onChange={(e) =>
                          setForm({ ...form, client_id: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-3">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Invoice Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.invoice_date}
                        onChange={(e) =>
                          setForm({ ...form, invoice_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-12 col-md-3">
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
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Income Account <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={form.income_account_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            income_account_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Account</option>
                        {incomeAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label small fw-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Total Amount <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formatAmountForDisplay(form.total_amount)}
                        onChange={handleAmountChange}
                        required
                      />
                    </div>
                    <div className="col-12">
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
                        placeholder="Optional description or notes for this invoice"
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-white fw-semibold client-submit-btn"
                >
                  {editing ? "Update Invoice" : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Payment Form Modal Component
const PaymentFormModal = ({
  form,
  setForm,
  invoice,
  cashAccounts,
  saving,
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
    // Remove commas and keep digits + decimal point
    let cleaned = input.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    setForm({ ...form, amount: cleaned });
  };

  const balanceNum = parseFloat(invoice?.balance) || 0;
  const amountNum =
    parseFloat(String(form.amount || "").replace(/,/g, "")) || 0;
  const amountExceedsBalance = amountNum > balanceNum && balanceNum >= 0;
  const amountError = amountExceedsBalance
    ? `Payment amount cannot exceed the current balance (${formatCurrency(balanceNum)}).`
    : null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) {
      handleClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape" && !saving) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (saving) return;
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
                    Invoice {invoice.invoice_number} •{" "}
                    {invoice.client?.name || "No client"}
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
                        Invoice
                      </div>
                      <div className="fw-semibold">
                        {invoice.invoice_number}
                      </div>
                      <div className="small text-muted mt-1">
                        {invoice.client?.name || "No client"}
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
                        {formatCurrency(invoice.balance)}
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
                      >
                        <option value="">Select account</option>
                        {cashAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
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

// Invoice View Modal Component - uses list data (with footprint from API); no fetch on open
const InvoiceViewModal = ({ invoice, onClose }) => {
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

  const getInvoiceStatus = (invoice) => {
    const baseStatus = invoice.status || "sent";
    const balance =
      parseFloat(invoice.balance ?? invoice.total_amount ?? 0) || 0;
    const hasDueDate = !!invoice.due_date;

    if (baseStatus !== "paid" && balance > 0 && hasDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        return "overdue";
      }
    }

    return baseStatus;
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: "info",
      paid: "success",
      partial: "warning",
      overdue: "danger",
      void: "secondary",
    };
    return badges[status] || "secondary";
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
                    Invoice {invoice.invoice_number}
                  </div>
                  <div
                    className="small opacity-75"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {invoice.client?.name || "No client"} •{" "}
                    {formatDate(invoice.invoice_date)}
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
                createdBy={invoice?.created_by_name}
                createdAt={invoice?.created_at}
                updatedBy={invoice?.updated_by_name}
                updatedAt={invoice?.updated_at}
              />
              {/* Summary */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">
                      Total Amount
                    </div>
                    <div className="fw-bold" style={{ fontSize: "1.25rem" }}>
                      {formatCurrency(invoice?.total_amount)}
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
                      {formatCurrency(invoice.paid_amount)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">
                      Balance
                    </div>
                    <div
                      className={`fw-bold ${
                        invoice.balance > 0 ? "text-warning" : "text-success"
                      }`}
                      style={{ fontSize: "1.1rem" }}
                    >
                      {formatCurrency(invoice.balance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Core details */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Invoice Information</div>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">
                      Invoice Number
                    </div>
                    <div className="fw-semibold">{invoice.invoice_number}</div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="small text-muted fw-semibold">
                      Invoice Date
                    </div>
                    <div className="text-muted">
                      {formatDate(invoice.invoice_date)}
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="small text-muted fw-semibold">Due Date</div>
                    <div className="text-muted">
                      {invoice.due_date ? formatDate(invoice.due_date) : "N/A"}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Client</div>
                    <div className="fw-semibold">
                      {invoice.client?.name || "N/A"}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Status</div>
                    {(() => {
                      const status = getInvoiceStatus(invoice);
                      return (
                        <span className={`badge bg-${getStatusBadge(status)}`}>
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Income Account & Description */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Revenue Details</div>
                <div className="row g-2">
                  <div className="col-12">
                    <div className="small text-muted fw-semibold">
                      Income Account
                    </div>
                    <div className="fw-semibold">
                      {invoice.income_account?.account_code} -{" "}
                      {invoice.income_account?.account_name}
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
                      {invoice.description || "—"}
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

// Client View Modal Component
const ClientViewModal = ({ client, onClose }) => {
  const { request } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const profile = client?.profile || {};
  const business = profile?.business || {};
  const marketing = profile?.marketing || {};
  const re = profile?.real_estate || {};
  const categoryValue = profile?.client_category || "universal";
  const categoryLabel =
    categoryValue === "real_estate" ? "Real Estate" : "General Business";
  const services = Array.isArray(profile?.services_availed)
    ? profile.services_availed
    : [];
  const servicesOther = profile?.services_other || "";
  const hasRE = categoryValue === "real_estate";

  useEffect(() => {
    if (!client?.id) {
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    request(`/accounting/clients/${client.id}`)
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
  }, [client?.id, request]);

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numAmount);
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
                  <FaUserTie />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-bold"
                    style={{ fontSize: "1.05rem", lineHeight: 1.2 }}
                  >
                    {client.name}
                  </div>
                  <div
                    className="small opacity-75"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {categoryLabel} • AR:{" "}
                    {formatCurrency(client.total_receivable)}
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
                  {/* Summary */}
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-4">
                      <div className="bg-white border rounded-3 p-3 h-100">
                        <div className="small text-muted fw-semibold mb-1">
                          Accounts Receivable
                        </div>
                        <div
                          className={`fw-bold ${
                            client.total_receivable > 0
                              ? "text-warning"
                              : "text-success"
                          }`}
                          style={{ fontSize: "1.25rem" }}
                        >
                          {formatCurrency(client.total_receivable)}
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-8">
                      <div className="bg-white border rounded-3 p-3 h-100">
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-primary">
                            {categoryLabel}
                          </span>
                          {client.email && (
                            <span className="badge bg-light text-dark border">
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="badge bg-light text-dark border">
                              {client.phone}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 row g-2">
                          <div className="col-12 col-md-6">
                            <div className="small text-muted fw-semibold">
                              Contact Person
                            </div>
                            <div className="fw-semibold">
                              {client.contact_person || "—"}
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
                              {client.address || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="bg-white border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                      <FaClipboardList />
                      <span>Services Availed</span>
                    </div>
                    {services.length === 0 ? (
                      <div className="text-muted">—</div>
                    ) : (
                      <div className="d-flex flex-wrap gap-2">
                        {services.map((s) => (
                          <span
                            key={s}
                            className="badge bg-light text-dark border"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {servicesOther && (
                      <div className="mt-2">
                        <div className="small text-muted fw-semibold">
                          Other service(s)
                        </div>
                        <div
                          className="text-muted"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {servicesOther}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business & Marketing */}
                  <div className="bg-white border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                      <FaBriefcase />
                      <span>Business</span>
                      <span className="text-muted" style={{ fontWeight: 600 }}>
                        /
                      </span>
                      <FaBullhorn />
                      <span>Marketing</span>
                    </div>
                    <div className="row g-2">
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Company / Business Name
                        </div>
                        <div className="fw-semibold">
                          {business.company_name || "—"}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Industry
                        </div>
                        <div className="fw-semibold">
                          {business.industry || "—"}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Website / Social
                        </div>
                        <div className="fw-semibold">
                          {business.website || "—"}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Lead Source
                        </div>
                        <div className="fw-semibold">
                          {marketing.lead_source || "—"}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Campaign
                        </div>
                        <div className="fw-semibold">
                          {marketing.campaign || "—"}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small text-muted fw-semibold">
                          Preferred Channel
                        </div>
                        <div className="fw-semibold">
                          {marketing.preferred_channel || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real Estate */}
                  {hasRE && (
                    <div className="bg-white border rounded-3 p-3 mb-3">
                      <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                        <FaBuilding />
                        <span>Real Estate</span>
                      </div>
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <div className="small text-muted fw-semibold">
                            Property Type
                          </div>
                          <div className="fw-semibold">
                            {re.property_type || "—"}
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="small text-muted fw-semibold">
                            Building Type
                          </div>
                          <div className="fw-semibold">
                            {re.building_type || "—"}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted fw-semibold">
                            Storeys
                          </div>
                          <div className="fw-semibold">{re.stories ?? "—"}</div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted fw-semibold">
                            Lot Area (sqm)
                          </div>
                          <div className="fw-semibold">
                            {re.lot_area_sqm ?? "—"}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted fw-semibold">
                            Floor Area (sqm)
                          </div>
                          <div className="fw-semibold">
                            {re.floor_area_sqm ?? "—"}
                          </div>
                        </div>
                        <div className="col-12 col-md-8">
                          <div className="small text-muted fw-semibold">
                            Location
                          </div>
                          <div className="fw-semibold">
                            {re.location || "—"}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted fw-semibold">
                            Project Stage
                          </div>
                          <div className="fw-semibold">
                            {re.project_stage || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="bg-white border rounded-3 p-3">
                    <div className="fw-semibold mb-2">Notes</div>
                    <div
                      className="text-muted"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {client.notes || "—"}
                    </div>
                  </div>
                </>
              )}
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

// Number View Modal Component
const NumberViewModal = ({ title, value, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        showToast.success("Number copied to clipboard!");
      })
      .catch(() => {
        showToast.error("Failed to copy number");
      });
  };

  return (
    <Portal>
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
        <div className="modal-dialog modal-dialog-centered">
          <div
            className={`modal-content border-0 ${
              isClosing
                ? "modal-content-animation exit"
                : "modal-content-animation"
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
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

export default ClientsAR;
