import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  FaFileInvoice,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaFileExcel,
  FaChartBar,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import JournalEntryFormModal from "./JournalEntryFormModal";
import JournalEntryViewModal from "./JournalEntryViewModal";
import AuthorizationCodeModal from "../../../components/AuthorizationCodeModal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";

const JournalEntries = () => {
  const { request, isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("entry_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Form state
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    description: "",
    reference_number: "",
    lines: [
      { account_id: "", debit_amount: "", credit_amount: "", description: "" },
      { account_id: "", debit_amount: "", credit_amount: "", description: "" },
    ],
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalDebit: 0,
    totalCredit: 0,
  });

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
    entry: null,
    error: null,
  });
  // Whether any active authorization codes exist (controls if modal is needed).
  // Default true so personnel will see the modal on first click even before
  // the has-active check finishes, avoiding confusing \"no modal\" behavior.
  const [authCodesRequired, setAuthCodesRequired] = useState(true);

  // Report modal: period selection and PDF/Excel export
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalClosing, setReportModalClosing] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [reportCustomStart, setReportCustomStart] = useState("");
  const [reportCustomEnd, setReportCustomEnd] = useState("");
  const [reportExporting, setReportExporting] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, []);

  // Check once if there are any active authorization codes; if none, personnel
  // should not be asked for a code (modal will be skipped).
  useEffect(() => {
    let isMounted = true;
    const checkAuthCodes = async () => {
      try {
        const data = await request("/authorization-codes/has-active");
        if (isMounted) {
          setAuthCodesRequired(!!data?.has_codes);
        }
      } catch (err) {
        // Fail silently; default is modal required = false.
      }
    };
    checkAuthCodes();
    return () => {
      isMounted = false;
    };
  }, [request]);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortField, sortDirection]);

  const fetchAccounts = async () => {
    try {
      const data = await request("/accounting/chart-of-accounts?active_only=true");
      setAccounts(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      const data = await request("/accounting/journal-entries?per_page=1000");
      const entriesList = Array.isArray(data) ? data : (data?.data || []);
      setEntries(entriesList);

      // Calculate stats
      const totalDebit = entriesList.reduce(
        (sum, entry) => sum + (parseFloat(entry.total_debit) || 0),
        0
      );
      const totalCredit = entriesList.reduce(
        (sum, entry) => sum + (parseFloat(entry.total_credit) || 0),
        0
      );
      setStats({
        totalEntries: entriesList.length,
        totalDebit,
        totalCredit,
      });
    } catch (error) {
      console.error("Error fetching entries:", error);
      showToast.error("Failed to load journal entries");
      setStats({
        totalEntries: 0,
        totalDebit: 0,
        totalCredit: 0,
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterAndSortEntries = useCallback(() => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        const description = (entry.description || "").toLowerCase();
        const entryNumber = (entry.entry_number || "").toLowerCase();
        const reference = (entry.reference_number || "").toLowerCase();
        return (
          description.includes(loweredSearch) ||
          entryNumber.includes(loweredSearch) ||
          reference.includes(loweredSearch)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "entry_date" || sortField === "created_at") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortField === "description") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      } else {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [entries, searchTerm, sortField, sortDirection]);

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
      ],
    });
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 2) {
      showToast.warning("At least 2 lines are required");
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Clear the opposite field when one is filled
    if (field === "debit_amount" && value) {
      newLines[index].credit_amount = "";
    } else if (field === "credit_amount" && value) {
      newLines[index].debit_amount = "";
    }

    setFormData({ ...formData, lines: newLines });
    validateForm({ ...formData, lines: newLines });
  };

  const validateForm = (data = formData) => {
    const errors = {};

    if (!data.description.trim()) {
      errors.description = "Description is required";
    }

    if (data.lines.length < 2) {
      errors.lines = "At least 2 lines are required";
    }

    data.lines.forEach((line, index) => {
      if (!line.account_id) {
        errors[`line_${index}_account`] = "Account is required";
      }

      const hasDebit = parseFloat(line.debit_amount) > 0;
      const hasCredit = parseFloat(line.credit_amount) > 0;

      if (!hasDebit && !hasCredit) {
        errors[`line_${index}_amount`] =
          "Either debit or credit amount is required";
      }

      if (hasDebit && hasCredit) {
        errors[`line_${index}_amount`] = "Cannot have both debit and credit";
      }
    });

    // Validate DR = CR
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + (parseFloat(line.debit_amount) || 0),
      0
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + (parseFloat(line.credit_amount) || 0),
      0
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.balance = `Debits (${totalDebit.toFixed(
        2
      )}) must equal Credits (${totalCredit.toFixed(2)})`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast.error("Please fix the form errors");
      return;
    }

    try {
      setSubmitting(true);
      setActionLock(true);

      const payload = {
        entry_date: formData.entry_date,
        description: formData.description,
        reference_number: formData.reference_number || null,
        lines: formData.lines.map((line) => ({
          account_id: parseInt(line.account_id),
          debit_amount: parseFloat(line.debit_amount) || 0,
          credit_amount: parseFloat(line.credit_amount) || 0,
          description: line.description || null,
        })),
      };

      const url = editingEntry
        ? `/accounting/journal-entries/${editingEntry.id}`
        : "/accounting/journal-entries";
      const method = editingEntry ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify(payload),
      });

      showToast.success(
        editingEntry
          ? "Journal entry updated successfully"
          : "Journal entry created successfully"
      );
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      showToast.error(error.message || "Failed to save journal entry");
    } finally {
      setSubmitting(false);
      setActionLock(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split("T")[0],
      description: "",
      reference_number: "",
      lines: [
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
        {
          account_id: "",
          debit_amount: "",
          credit_amount: "",
          description: "",
        },
      ],
    });
    setFormErrors({});
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleEdit = (entry) => {
    if (isActionDisabled()) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    if (entry.source_document) {
      showToast.warning(entry.source_document.edit_hint);
      return;
    }
    setEditingEntry(entry);
    // Normalize entry_date to YYYY-MM-DD for <input type="date"> (API may return ISO string)
    const rawDate = entry.entry_date;
    const entryDate =
      typeof rawDate === "string"
        ? rawDate.slice(0, 10)
        : rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : rawDate;
    setFormData({
      entry_date: entryDate || new Date().toISOString().split("T")[0],
      description: entry.description,
      reference_number: entry.reference_number || "",
      lines: entry.lines.map((line) => ({
        account_id: line.account_id.toString(),
        debit_amount: line.debit_amount > 0 ? line.debit_amount.toString() : "",
        credit_amount:
          line.credit_amount > 0 ? line.credit_amount.toString() : "",
        description: line.description || "",
      })),
    });
    setShowForm(true);
  };

  const doDeleteJournalEntry = async (entry, payload) => {
    const opts = { method: "DELETE" };
    if (payload && (payload.authorization_code || payload.remarks)) {
      opts.body = JSON.stringify({
        authorization_code: payload.authorization_code || undefined,
        remarks: payload.remarks || undefined,
      });
    }
    await request(`/accounting/journal-entries/${entry.id}`, opts);
  };

  const handleDelete = async (entry) => {
    if (isActionDisabled(entry.id)) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    if (entry.source_document) {
      showToast.warning(entry.source_document.edit_hint);
      return;
    }

    const result = await showAlert.confirm(
      "Delete Journal Entry",
      `Are you sure you want to delete entry ${entry.entry_number}? This action cannot be undone.`,
      "Yes, Delete",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    // Admin does not need authorization code; personnel only if codes exist
    if (isAdmin && isAdmin()) {
      try {
        setActionLoading(entry.id);
        setActionLock(true);
        showAlert.loading("Deleting journal entry...");
        await doDeleteJournalEntry(entry, null);
        showAlert.close();
        showToast.success("Journal entry deleted successfully");
        fetchEntries();
      } catch (error) {
        console.error("Error deleting entry:", error);
        showAlert.close();
        showToast.error(error.message || "Failed to delete journal entry");
      } finally {
        setActionLoading(null);
        setActionLock(false);
      }
      return;
    }

    // If no active authorization codes exist, let personnel delete without modal
    if (!authCodesRequired) {
      try {
        setActionLoading(entry.id);
        setActionLock(true);
        showAlert.loading("Deleting journal entry...");
        await doDeleteJournalEntry(entry, null);
        showAlert.close();
        showToast.success("Journal entry deleted successfully");
        fetchEntries();
      } catch (error) {
        console.error("Error deleting entry:", error);
        showAlert.close();
        showToast.error(error.message || "Failed to delete journal entry");
      } finally {
        setActionLoading(null);
        setActionLock(false);
      }
      return;
    }

    // Otherwise prompt personnel for an authorization code
    setAuthCodeModal({ show: true, entry, error: null });
  };

  const handleAuthCodeSubmit = async ({ authorization_code, remarks }) => {
    const { entry } = authCodeModal;
    if (!entry) return;
    try {
      setActionLoading(entry.id);
      setActionLock(true);
      setAuthCodeModal((prev) => ({ ...prev, error: null }));
      await doDeleteJournalEntry(entry, { authorization_code, remarks });
      setAuthCodeModal({ show: false, entry: null, error: null });
      showToast.success("Journal entry deleted successfully");
      fetchEntries();
    } catch (error) {
      setAuthCodeModal((prev) => ({ ...prev, error: error.message }));
      showToast.error(error.message || "Failed to delete journal entry");
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleViewDetails = (entry) => {
    if (isActionDisabled()) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    // List already has entry with lines + footprint from API; open modal instantly
    setViewingEntry(entry);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Report: get start_date and end_date (YYYY-MM-DD) and label from selected period
  const getReportDateRange = useCallback(() => {
    const now = new Date();
    let startDate, endDate, label;
    if (reportPeriod === "today") {
      startDate = endDate = now.toISOString().split("T")[0];
      label = `Today (${formatDate(startDate)})`;
    } else if (reportPeriod === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      startDate = monday.toISOString().split("T")[0];
      endDate = now.toISOString().split("T")[0];
      label = `This Week (${formatDate(startDate)} – ${formatDate(endDate)})`;
    } else if (reportPeriod === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      endDate = now.toISOString().split("T")[0];
      label = `This Month (${formatDate(startDate)} – ${formatDate(endDate)})`;
    } else if (reportPeriod === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      label = `Last Month (${formatDate(startDate)} – ${formatDate(endDate)})`;
    } else if (reportPeriod === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      endDate = now.toISOString().split("T")[0];
      label = `This Year (${formatDate(startDate)} – ${formatDate(endDate)})`;
    } else {
      startDate = reportCustomStart || now.toISOString().split("T")[0];
      endDate = reportCustomEnd || now.toISOString().split("T")[0];
      label = `Custom (${formatDate(startDate)} – ${formatDate(endDate)})`;
    }
    return { start_date: startDate, end_date: endDate, label };
  }, [reportPeriod, reportCustomStart, reportCustomEnd]);

  const fetchReportEntries = async (startDate, endDate) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      per_page: "5000",
    });
    const data = await request(`/accounting/journal-entries?${params.toString()}`);
    const list = data?.data ?? (Array.isArray(data) ? data : []);
    return list;
  };

  const handleOpenReportModal = () => {
    setReportModalClosing(false);
    setShowReportModal(true);
  };

  const handleCloseReportModal = async () => {
    setReportModalClosing(true);
    await new Promise((r) => setTimeout(r, 200));
    setShowReportModal(false);
    setReportModalClosing(false);
  };

  const handleExportReportPdf = async () => {
    const { start_date, end_date, label } = getReportDateRange();
    if (reportPeriod === "custom" && (!reportCustomStart || !reportCustomEnd)) {
      showToast.error("Please select From and To dates for custom range.");
      return;
    }
    setReportExporting(true);
    try {
      const list = await fetchReportEntries(start_date, end_date);
      const generated = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const totalDebit = list.reduce((s, e) => s + (parseFloat(e.total_debit) || 0), 0);
      const totalCredit = list.reduce((s, e) => s + (parseFloat(e.total_credit) || 0), 0);
      const rowsHtml = list
        .map(
          (entry, idx) => `
          <tr>
            <td class="cell-num">${idx + 1}</td>
            <td class="cell-text">${(entry.entry_number || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${formatDate(entry.entry_date)}</td>
            <td class="cell-text">${(entry.description || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${(entry.reference_number || "").replace(/</g, "&lt;")}</td>
            <td class="cell-amt">${formatCurrency(entry.total_debit)}</td>
            <td class="cell-amt">${formatCurrency(entry.total_credit)}</td>
          </tr>`,
        )
        .join("");
      const win = window.open("", "_blank");
      if (!win) {
        showToast.error("Please allow pop-ups to open the report.");
        return;
      }
      win.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Journal Entries Report - ${label}</title>
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
            <h1>Journal Entries Report</h1>
            <div class="sub">${label}</div>
          </div>
          <div class="report-meta"><strong>Generated:</strong> ${generated}</div>
          <div class="summary-box">
            <span>Period:</span> ${label}
            <span>Total Entries:</span> ${list.length}
            <span>Total Debit:</span> ${formatCurrency(totalDebit)}
            <span>Total Credit:</span> ${formatCurrency(totalCredit)}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:4%;">#</th>
                <th style="width:12%;">Entry Number</th>
                <th style="width:10%;">Date</th>
                <th style="width:28%;">Description</th>
                <th style="width:14%;">Reference</th>
                <th style="width:16%;">Total Debit</th>
                <th style="width:16%;">Total Credit</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="report-footer">CPC Accounting System · Journal Entries Report · ${generated}</div>
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
      showToast.success("Report opened for printing or save as PDF.");
    } catch (err) {
      console.error("Report export error:", err);
      showToast.error(err?.message || "Failed to generate report.");
    } finally {
      setReportExporting(false);
    }
  };

  const handleExportReportExcel = async () => {
    const { start_date, end_date, label } = getReportDateRange();
    if (reportPeriod === "custom" && (!reportCustomStart || !reportCustomEnd)) {
      showToast.error("Please select From and To dates for custom range.");
      return;
    }
    setReportExporting(true);
    try {
      const list = await fetchReportEntries(start_date, end_date);
      const generated = new Date().toLocaleString();
      const bom = "\uFEFF";
      const lines = [
        "Journal Entries Report",
        `"${label}"`,
        `"Generated","${generated}"`,
        "",
        `"Total Entries",${list.length}`,
        "",
        "#,Entry Number,Date,Description,Reference,Total Debit,Total Credit",
      ];
      list.forEach((entry, idx) => {
        const desc = (entry.description || "").replace(/"/g, '""');
        const ref = (entry.reference_number || "").replace(/"/g, '""');
        lines.push(
          [
            idx + 1,
            `"${(entry.entry_number || "").replace(/"/g, '""')}"`,
            `"${formatDate(entry.entry_date)}"`,
            `"${desc}"`,
            `"${ref}"`,
            entry.total_debit ?? "",
            entry.total_credit ?? "",
          ].join(","),
        );
      });
      const csvContent = bom + lines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Journal_Entries_Report_${start_date}_to_${end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success("Report downloaded as Excel (CSV).");
    } catch (err) {
      console.error("Report export error:", err);
      showToast.error(err?.message || "Failed to generate report.");
    } finally {
      setReportExporting(false);
    }
  };

  const calculateTotals = () => {
    const totalDebit = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.debit_amount) || 0),
      0
    );
    const totalCredit = formData.lines.reduce(
      (sum, line) => sum + (parseFloat(line.credit_amount) || 0),
      0
    );
    return { totalDebit, totalCredit };
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const isActionDisabled = (id = null) => {
    return (
      actionLock ||
      (actionLoading !== null && (id === null || actionLoading !== id))
    );
  };

  const hasActiveFilters =
    searchTerm || sortField !== "entry_date" || sortDirection !== "desc";

  const clearFilters = () => {
    setSearchTerm("");
    setSortField("entry_date");
    setSortDirection("desc");
  };

  // Pagination
  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);

  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const paginationMeta = useMemo(() => {
    return {
      current_page: currentPage,
      last_page: totalPages,
      total: filteredEntries.length,
      from: filteredEntries.length > 0 ? startIndex + 1 : 0,
      to: Math.min(endIndex, filteredEntries.length),
    };
  }, [currentPage, totalPages, filteredEntries.length, startIndex, endIndex]);

  const handleSort = (field) => {
    if (isActionDisabled()) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 journal-entries-container ${
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

        /* Mobile-only: keep # and Actions sticky while scrolling table */
        @media (max-width: 767.98px) {
          .journal-entries-table-wrap {
            position: relative;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }

          .journal-entries-table-wrap table {
            min-width: 860px;
            border-collapse: separate;
            border-spacing: 0;
          }

          .journal-entries-table-wrap .je-col-index,
          .journal-entries-table-wrap .je-col-actions {
            position: sticky;
            /* Solid background to avoid "glass" overlay */
            background-color: var(--bs-table-bg);
            z-index: 5;
          }

          .journal-entries-table-wrap thead .je-col-index,
          .journal-entries-table-wrap thead .je-col-actions {
            z-index: 7;
            background: var(--background-light, #f8f9fa);
          }

          .journal-entries-table-wrap .je-col-index {
            left: 0;
            min-width: 44px;
            width: 44px;
          }

          .journal-entries-table-wrap .je-col-actions {
            left: 44px; /* same as index width */
            min-width: 128px;
            width: 128px;
          }

          /* Match Bootstrap striped + hover backgrounds for sticky cells */
          .journal-entries-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-index,
          .journal-entries-table-wrap.table-striped > tbody > tr:nth-of-type(odd) > .je-col-actions {
            background-color: var(--bs-table-striped-bg);
          }

          .journal-entries-table-wrap.table-hover > tbody > tr:hover > .je-col-index,
          .journal-entries-table-wrap.table-hover > tbody > tr:hover > .je-col-actions {
            background-color: var(--bs-table-hover-bg);
          }
        }
      `}</style>

      {loading ? (
        <LoadingSpinner text="Loading journal entries..." />
      ) : (
        <>
          {/* Page Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <div className="flex-grow-1 mb-2 mb-md-0">
              <h1
                className="h4 mb-1 fw-bold"
                style={{ color: "var(--text-primary)" }}
              >
                <FaFileInvoice className="me-2" />
                Journal Entries
              </h1>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                Record all financial transactions
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-sm btn-primary text-white"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                disabled={isActionDisabled()}
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
                <FaPlus className="me-1" />
                New Entry
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchEntries}
                disabled={loading || isActionDisabled()}
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
              <button
                className="btn btn-sm"
                onClick={handleOpenReportModal}
                disabled={loading || isActionDisabled()}
                style={{
                  transition: "all 0.2s ease-in-out",
                  border: "2px solid #0f172a",
                  color: "#0f172a",
                  backgroundColor: "transparent",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    e.target.style.backgroundColor = "#1e3a5f";
                    e.target.style.color = "white";
                    e.target.style.borderColor = "#1e3a5f";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#0f172a";
                  e.target.style.borderColor = "#0f172a";
                }}
              >
                <FaChartBar className="me-1" />
                Generate Report
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
                        Total Entries
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Entries",
                            stats.totalEntries,
                            false
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
                          if (!initialLoading) {
                            e.target.style.opacity = "1";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {initialLoading
                          ? "..."
                          : abbreviateNumber(stats.totalEntries, false)}
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
                        Total Debit
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Debit",
                            stats.totalDebit,
                            true
                          )
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
                        {initialLoading
                          ? "..."
                          : abbreviateNumber(stats.totalDebit, true)}
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
                        className="fas fa-arrow-down"
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
                        Total Credit
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          !initialLoading &&
                          handleNumberClick(
                            "Total Credit",
                            stats.totalCredit,
                            true
                          )
                        }
                        style={{
                          color: "var(--primary-dark)",
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
                          : abbreviateNumber(stats.totalCredit, true)}
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
                        className="fas fa-arrow-up"
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
                        style={{ color: "var(--primary-dark)" }}
                      >
                        Filtered Results
                      </div>
                      <div
                        className="mb-0 fw-bold"
                        onClick={() =>
                          handleNumberClick(
                            "Filtered Results",
                            filteredEntries.length,
                            false
                          )
                        }
                        style={{
                          color: "var(--primary-dark)",
                          fontSize: "clamp(1rem, 3vw, 1.8rem)",
                          lineHeight: "1.2",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = "0.8";
                          e.target.style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = "1";
                          e.target.style.transform = "scale(1)";
                        }}
                      >
                        {abbreviateNumber(filteredEntries.length, false)}
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
                        className="fas fa-filter"
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
                    Search Entries
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
                      placeholder="Search by entry number, description, or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={loading || isActionDisabled()}
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
                        disabled={loading || isActionDisabled()}
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
                <div className="col-6 col-md-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Sort By
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="entry_date">Entry Date</option>
                    <option value="entry_number">Entry Number</option>
                    <option value="description">Description</option>
                    <option value="total_debit">Total Debit</option>
                    <option value="total_credit">Total Credit</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label small fw-semibold mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Order
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value)}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
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
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    disabled={loading || isActionDisabled()}
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
                    disabled={
                      loading || isActionDisabled() || !hasActiveFilters
                    }
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

          {/* Main Content Card */}
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
                  Journal Entries
                  {!loading && (
                    <small className="opacity-75 ms-2 text-white">
                      ({paginationMeta.total} total)
                    </small>
                  )}
                </h5>
              </div>
            </div>

            <div className="card-body p-0">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i
                      className="fas fa-file-invoice fa-3x"
                      style={{ color: "var(--text-muted)", opacity: 0.5 }}
                    ></i>
                  </div>
                  <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                    No Journal Entries Found
                  </h5>
                  <p
                    className="mb-3 small"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Start by creating your first journal entry to record financial transactions."}
                  </p>
                  {!searchTerm && (
                    <button
                      className="btn btn-sm btn-primary text-white"
                      onClick={() => {
                        resetForm();
                        setShowForm(true);
                      }}
                      disabled={isActionDisabled()}
                      style={{
                        transition: "all 0.2s ease-in-out",
                        borderWidth: "2px",
                        borderRadius: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow =
                            "0 4px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <FaPlus className="me-1" />
                      Add Entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive journal-entries-table-wrap">
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
                          style={{ width: "15%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("entry_number")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Entry Number
                            <i
                              className={`ms-1 ${getSortIcon("entry_number")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("entry_date")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Date
                            <i
                              className={`ms-1 ${getSortIcon("entry_date")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "25%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                            onClick={() => handleSort("description")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Description
                            <i
                              className={`ms-1 ${getSortIcon("description")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          Reference
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                            onClick={() => handleSort("total_debit")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Total Debit
                            <i
                              className={`ms-1 ${getSortIcon("total_debit")}`}
                            ></i>
                          </button>
                        </th>
                        <th
                          className="text-end small fw-semibold"
                          style={{ width: "12%" }}
                        >
                          <button
                            className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-end"
                            onClick={() => handleSort("total_credit")}
                            disabled={isActionDisabled()}
                            style={{ color: "inherit" }}
                          >
                            Total Credit
                            <i
                              className={`ms-1 ${getSortIcon("total_credit")}`}
                            ></i>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEntries.map((entry, index) => (
                        <tr key={entry.id} className="align-middle">
                          <td
                            className="text-center fw-bold je-col-index"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + index + 1}
                          </td>
                          <td className="text-center je-col-actions">
                            <div className="d-flex justify-content-center gap-1">
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => handleViewDetails(entry)}
                                disabled={isActionDisabled()}
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
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
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
                                onClick={() => handleEdit(entry)}
                                disabled={isActionDisabled() || !!entry.source_document}
                                title={entry.source_document ? entry.source_document.edit_hint : "Edit Entry"}
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
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
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
                                onClick={() => handleDelete(entry)}
                                disabled={isActionDisabled(entry.id) || !!entry.source_document}
                                title={entry.source_document ? entry.source_document.edit_hint : "Delete Entry"}
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
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                {actionLoading === entry.id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  ></span>
                                ) : (
                                  <FaTrash style={{ fontSize: "0.875rem" }} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="fw-medium"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.entry_number}
                            >
                              {entry.entry_number}
                            </div>
                          </td>
                          <td className="text-muted small">
                            {formatDate(entry.entry_date)}
                          </td>
                          <td style={{ maxWidth: "300px", overflow: "hidden" }}>
                            <div
                              className="small"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.description}
                            >
                              {entry.description}
                            </div>
                            {entry.source_document && (
                              <span
                                className="badge bg-secondary mt-1"
                                style={{ fontSize: "0.65rem" }}
                                title={entry.source_document.edit_hint}
                              >
                                From {entry.source_document.type}: {entry.source_document.reference}
                              </span>
                            )}
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="small text-muted"
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={entry.reference_number || "—"}
                            >
                              {entry.reference_number || "—"}
                            </div>
                          </td>
                          <td className="text-end text-danger fw-semibold">
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(entry.total_debit)}
                              onClick={() =>
                                handleNumberClick(
                                  "Total Debit",
                                  entry.total_debit,
                                  true
                                )
                              }
                            >
                              {formatCurrency(entry.total_debit)}
                            </span>
                          </td>
                          <td className="text-end text-success fw-semibold">
                            <span
                              className="d-inline-block text-truncate"
                              style={{ maxWidth: "140px", cursor: "pointer" }}
                              title={formatCurrency(entry.total_credit)}
                              onClick={() =>
                                handleNumberClick(
                                  "Total Credit",
                                  entry.total_credit,
                                  true
                                )
                              }
                            >
                              {formatCurrency(entry.total_credit)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filteredEntries.length > 0 && (
              <div className="card-footer bg-white border-top px-3 py-2">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                  <div className="text-center text-md-start">
                    <small style={{ color: "var(--text-muted)" }}>
                      Showing{" "}
                      <span
                        className="fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {paginationMeta.from || startIndex + 1}-
                        {paginationMeta.to ||
                          Math.min(
                            startIndex + currentEntries.length,
                            paginationMeta.total
                          )}
                      </span>{" "}
                      of{" "}
                      <span
                        className="fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {paginationMeta.total}
                      </span>{" "}
                      entries
                    </small>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={
                        paginationMeta.current_page === 1 || isActionDisabled()
                      }
                      style={{
                        transition: "all 0.2s ease-in-out",
                        border: "2px solid var(--primary-color)",
                        color: "var(--primary-color)",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow =
                            "0 2px 4px rgba(0,0,0,0.1)";
                          e.target.style.backgroundColor =
                            "var(--primary-color)";
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
                        let pages = [];
                        const maxVisiblePages = 5;
                        const totalPages = paginationMeta.last_page;

                        if (totalPages <= maxVisiblePages) {
                          pages = Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          );
                        } else {
                          pages.push(1);
                          let start = Math.max(
                            2,
                            paginationMeta.current_page - 1
                          );
                          let end = Math.min(
                            totalPages - 1,
                            paginationMeta.current_page + 1
                          );

                          if (paginationMeta.current_page <= 2) {
                            end = 4;
                          } else if (
                            paginationMeta.current_page >=
                            totalPages - 1
                          ) {
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

                        return pages.map((page, index) => (
                          <button
                            key={index}
                            className="btn btn-sm"
                            onClick={() =>
                              page !== "..." && setCurrentPage(page)
                            }
                            disabled={page === "..." || isActionDisabled()}
                            style={{
                              transition: "all 0.2s ease-in-out",
                              border: `2px solid ${
                                paginationMeta.current_page === page
                                  ? "var(--primary-color)"
                                  : "var(--input-border)"
                              }`,
                              color:
                                paginationMeta.current_page === page
                                  ? "white"
                                  : "var(--text-primary)",
                              backgroundColor:
                                paginationMeta.current_page === page
                                  ? "var(--primary-color)"
                                  : "transparent",
                              minWidth: "40px",
                            }}
                            onMouseEnter={(e) => {
                              if (
                                !e.target.disabled &&
                                paginationMeta.current_page !== page
                              ) {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow =
                                  "0 2px 4px rgba(0,0,0,0.1)";
                                e.target.style.backgroundColor =
                                  "var(--primary-light)";
                                e.target.style.color = "white";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (
                                !e.target.disabled &&
                                paginationMeta.current_page !== page
                              ) {
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
                        Page {paginationMeta.current_page} of{" "}
                        {paginationMeta.last_page}
                      </small>
                    </div>

                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, paginationMeta.last_page)
                        )
                      }
                      disabled={
                        paginationMeta.current_page ===
                          paginationMeta.last_page || isActionDisabled()
                      }
                      style={{
                        transition: "all 0.2s ease-in-out",
                        border: "2px solid var(--primary-color)",
                        color: "var(--primary-color)",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow =
                            "0 2px 4px rgba(0,0,0,0.1)";
                          e.target.style.backgroundColor =
                            "var(--primary-color)";
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

          {/* Form Modal */}
          {showForm && (
            <JournalEntryFormModal
              formData={formData}
              setFormData={setFormData}
              accounts={accounts}
              formErrors={formErrors}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              isBalanced={isBalanced}
              submitting={submitting}
              editingEntry={editingEntry}
              onAddLine={handleAddLine}
              onRemoveLine={handleRemoveLine}
              onLineChange={handleLineChange}
              onSubmit={handleSubmit}
              onClose={resetForm}
            />
          )}

          {/* View Modal */}
          {viewingEntry && (
            <JournalEntryViewModal
              entry={viewingEntry}
              onClose={() => setViewingEntry(null)}
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
              setAuthCodeModal({ show: false, entry: null, error: null })
            }
            onSubmit={handleAuthCodeSubmit}
            loading={
              actionLock &&
              authCodeModal.entry &&
              actionLoading === authCodeModal.entry?.id
            }
            title="Authorization Required"
            message="Enter the authorization code from your administrator to delete this journal entry."
            actionLabel="Delete Entry"
            error={authCodeModal.error}
          />

          {/* Generate Report Modal – period selection, PDF/Excel export */}
          {showReportModal && (
            <Portal>
              <div
                className={`modal fade show d-block modal-backdrop-animation ${reportModalClosing ? "exit" : ""}`}
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                tabIndex="-1"
                onClick={(e) => e.target === e.currentTarget && handleCloseReportModal()}
              >
                <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
                  <div
                    className={`modal-content border-0 rounded-3 modal-content-animation ${reportModalClosing ? "exit" : ""}`}
                    style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="modal-header border-0 rounded-top-3 py-3 text-white"
                      style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}
                    >
                      <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                        <FaChartBar />
                        Generate Journal Entries Report
                      </h5>
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        aria-label="Close"
                        onClick={handleCloseReportModal}
                        disabled={reportExporting}
                      />
                    </div>
                    <div className="modal-body bg-light py-4">
                      <p className="text-muted small mb-3">
                        Select the period for the report, then export to PDF (print) or Excel (CSV).
                      </p>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Period</label>
                        <select
                          className="form-select"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                          disabled={reportExporting}
                          style={{ borderColor: "#cbd5e1", borderRadius: "6px" }}
                        >
                          <option value="today">Today</option>
                          <option value="this_week">This Week</option>
                          <option value="this_month">This Month</option>
                          <option value="last_month">Last Month</option>
                          <option value="this_year">This Year</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>
                      {reportPeriod === "custom" && (
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <label className="form-label small fw-semibold">From</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={reportCustomStart}
                              onChange={(e) => setReportCustomStart(e.target.value)}
                              disabled={reportExporting}
                              style={{ borderColor: "#cbd5e1", borderRadius: "6px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-semibold">To</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={reportCustomEnd}
                              onChange={(e) => setReportCustomEnd(e.target.value)}
                              disabled={reportExporting}
                              style={{ borderColor: "#cbd5e1", borderRadius: "6px" }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm text-white d-flex align-items-center gap-2"
                          onClick={handleExportReportPdf}
                          disabled={reportExporting}
                          style={{ borderRadius: "6px" }}
                        >
                          {reportExporting ? (
                            <span className="spinner-border spinner-border-sm" role="status" />
                          ) : (
                            <FaFilePdf />
                          )}
                          Export to PDF
                        </button>
                        <button
                          type="button"
                          className="btn btn-success btn-sm text-white d-flex align-items-center gap-2"
                          onClick={handleExportReportExcel}
                          disabled={reportExporting}
                          style={{ borderRadius: "6px" }}
                        >
                          {reportExporting ? (
                            <span className="spinner-border spinner-border-sm" role="status" />
                          ) : (
                            <FaFileExcel />
                          )}
                          Export to Excel
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleCloseReportModal}
                          disabled={reportExporting}
                          style={{ borderRadius: "6px" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Portal>
          )}
        </>
      )}
    </div>
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
    }, 200); // Match the exit animation duration
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

export default JournalEntries;
