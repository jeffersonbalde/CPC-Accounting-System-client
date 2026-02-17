import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showToast } from "../../../services/notificationService";
import {
  FaArrowDown,
  FaPlus,
  FaEye,
  FaFilter,
  FaSearch,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaFileExcel,
  FaChartBar,
} from "react-icons/fa";
import Portal from "../../../components/Portal";
import LoadingSpinner from "../../../components/admin/LoadingSpinner";
import Footprint from "../../../components/Footprint";

const Expenses = () => {
  const { request } = useAuth();
  const [expenseTransactions, setExpenseTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Number view modal (click to view full number)
  const [numberViewModal, setNumberViewModal] = useState({
    show: false,
    title: "",
    value: "",
    formattedValue: "",
  });

  // Report modal: period selection and PDF/Excel export
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalClosing, setReportModalClosing] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [reportCustomStart, setReportCustomStart] = useState("");
  const [reportCustomEnd, setReportCustomEnd] = useState("");
  const [reportExporting, setReportExporting] = useState(false);

  // Stats (from raw data; filter panel uses filtered count)
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalExpenses: 0,
    expenseAccounts: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    expense_account_id: "",
    supplier_id: "",
    cash_account_id: "",
    amount: "",
    description: "",
    reference_number: "",
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchExpenseAccounts();
      await fetchCashAccounts();
      await fetchSuppliers();
      await fetchExpenseTransactions();
    };
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortTransactions();
  }, [
    expenseTransactions,
    searchTerm,
    filterAccount,
    startDate,
    endDate,
    sortField,
    sortDirection,
  ]);

  const filterAndSortTransactions = useCallback(() => {
    let filtered = [...expenseTransactions];

    if (filterAccount !== "all") {
      const accountFilter = String(filterAccount);
      filtered = filtered.filter(
        (t) => String(t.account_code || "") === accountFilter,
      );
    }

    if (startDate) {
      filtered = filtered.filter((t) => {
        const d = t.date ? String(t.date).split("T")[0] : "";
        return d >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter((t) => {
        const d = t.date ? String(t.date).split("T")[0] : "";
        return d <= endDate;
      });
    }

    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const supplierName = String(t.supplier_name || "").toLowerCase();
        const description = String(t.description || "").toLowerCase();
        const reference = String(t.reference ?? "").toLowerCase();
        return (
          supplierName.includes(loweredSearch) ||
          description.includes(loweredSearch) ||
          reference.includes(loweredSearch)
        );
      });
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortField === "description" || sortField === "supplier_name") {
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

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [
    expenseTransactions,
    searchTerm,
    filterAccount,
    startDate,
    endDate,
    sortField,
    sortDirection,
  ]);

  const fetchExpenseTransactions = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      const allTransactions = [];

      const billsData = await request("/accounting/bills?per_page=100");
      const bills = Array.isArray(billsData)
        ? billsData
        : billsData?.data || [];
      if (bills.length > 0) {
        const billTransactions = bills.map((bill) => ({
          id: `bill-${bill.id}`,
          type: "bill",
          date: bill.bill_date,
          account_code: bill.expense_account?.account_code || "",
          account_name: bill.expense_account?.account_name || "",
          supplier_name: bill.supplier?.name || "",
          amount: parseFloat(bill.total_amount) || 0,
          description: bill.description || `Bill ${bill.bill_number}`,
          reference: bill.bill_number,
          status: bill.status,
          journal_entry_id: bill.journal_entry_id,
          created_by_name: bill.created_by_name,
          updated_by_name: bill.updated_by_name,
          created_at: bill.created_at,
          updated_at: bill.updated_at,
        }));
        allTransactions.push(...billTransactions);
      }

      let allJournalEntries = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 10) {
        const journalData = await request(
          `/accounting/journal-entries?per_page=50&page=${page}`,
        ).catch(() => ({ data: [] }));
        const entries = Array.isArray(journalData)
          ? journalData
          : journalData?.data || [];
        if (entries.length === 0) hasMore = false;
        else {
          allJournalEntries.push(...entries);
          if (journalData.last_page && page >= journalData.last_page)
            hasMore = false;
          else page++;
        }
      }

      // Filter journal entries that have expense accounts in debit lines (dynamic by category)
      allJournalEntries.forEach((entry) => {
        if (entry.lines && Array.isArray(entry.lines)) {
          entry.lines.forEach((line) => {
            const isExpenseAccount =
              line.account &&
              line.account.account_type_category === "expense";
            if (isExpenseAccount && parseFloat(line.debit_amount) > 0) {
              const isBillEntry = allTransactions.some(
                (t) => t.journal_entry_id === entry.id && t.type === "bill",
              );
              const isBillReference =
                entry.reference_number?.startsWith("BILL-");
              const isInvoiceReference =
                entry.reference_number?.startsWith("INV-");
              if (!isBillEntry && !isBillReference && !isInvoiceReference) {
                const existingTransaction = allTransactions.find(
                  (t) =>
                    t.journal_entry_id === entry.id &&
                    String(t.account_code || "") ===
                      String(line.account?.account_code || ""),
                );
                if (!existingTransaction) {
                  allTransactions.push({
                    id: `journal-${entry.id}-${line.id}`,
                    type: "manual",
                    date: entry.entry_date,
                    account_code: line.account.account_code || "",
                    account_name: line.account.account_name || "",
                    supplier_name: "",
                    amount: parseFloat(line.debit_amount) || 0,
                    description:
                      line.description ||
                      entry.description ||
                      "Manual expense entry",
                    reference: entry.reference_number || entry.entry_number,
                    status: null,
                    journal_entry_id: entry.id,
                    created_by_name: entry.created_by_name,
                    updated_by_name: entry.updated_by_name,
                    created_at: entry.created_at,
                    updated_at: entry.updated_at,
                  });
                }
              }
            }
          });
        }
      });

      setExpenseTransactions(allTransactions);
      const byAccount = allTransactions.reduce((acc, t) => {
        const key = t.account_code || "Other";
        if (!acc[key]) acc[key] = true;
        return acc;
      }, {});
      setStats({
        totalTransactions: allTransactions.length,
        totalExpenses: allTransactions.reduce(
          (s, t) => s + (parseFloat(t.amount) || 0),
          0,
        ),
        expenseAccounts: Object.keys(byAccount).length,
      });
    } catch (error) {
      console.error("Error fetching expense transactions:", error);
      showToast.error("Failed to load expense transactions");
      setStats({ totalTransactions: 0, totalExpenses: 0, expenseAccounts: 0 });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchExpenseAccounts = async () => {
    try {
      // Same as Create Bill modal: fetch all active COA then filter by category (dynamic, no hardcoding).
      // This ensures custom account types with category "Expense" (e.g. "55 - haha") always appear.
      const data = await request("/accounting/chart-of-accounts?active_only=true");
      const all = Array.isArray(data) ? data : data?.data || [];
      const expenseOnly = all.filter((acc) => acc.account_type_category === "expense");
      setExpenseAccounts(expenseOnly);
    } catch (error) {
      console.error("Error fetching expense accounts:", error);
    }
  };

  const filterExpenseAccountOptions = useMemo(() => {
    const byCode = new Map();
    expenseAccounts.forEach((acc) => {
      const code = String(acc.account_code || "");
      if (code)
        byCode.set(code, {
          id: acc.id,
          account_code: code,
          account_name: acc.account_name || code,
        });
    });
    expenseTransactions.forEach((t) => {
      const code = String(t.account_code || "");
      if (code && !byCode.has(code))
        byCode.set(code, {
          id: code,
          account_code: code,
          account_name: t.account_name || code,
        });
    });
    return Array.from(byCode.values()).sort((a, b) =>
      (a.account_code || "").localeCompare(b.account_code || ""),
    );
  }, [expenseAccounts, expenseTransactions]);

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

  const fetchSuppliers = async () => {
    try {
      const data = await request("/accounting/suppliers?active_only=true");
      setSuppliers(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const isActionDisabled = () => actionLock;

  const hasActiveFilters =
    searchTerm || filterAccount !== "all" || startDate || endDate;
  const clearFilters = () => {
    setSearchTerm("");
    setFilterAccount("all");
    setStartDate("");
    setEndDate("");
    setSortField("date");
    setSortDirection("desc");
  };

  const handleSort = (field) => {
    if (isActionDisabled()) return;
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage],
  );
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginationMeta = useMemo(
    () => ({
      current_page: currentPage,
      last_page: totalPages,
      total: filteredTransactions.length,
      from: filteredTransactions.length > 0 ? startIndex + 1 : 0,
      to: Math.min(endIndex, filteredTransactions.length),
    }),
    [
      currentPage,
      totalPages,
      filteredTransactions.length,
      startIndex,
      endIndex,
    ],
  );

  const totalExpenses = useMemo(
    () =>
      filteredTransactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
    [filteredTransactions],
  );

  const expensesByAccount = useMemo(() => {
    return filteredTransactions.reduce((acc, transaction) => {
      const key = transaction.account_code || "Other";
      if (!acc[key]) {
        acc[key] = {
          account_code: transaction.account_code,
          account_name: transaction.account_name,
          total: 0,
          count: 0,
        };
      }
      acc[key].total += parseFloat(transaction.amount) || 0;
      acc[key].count += 1;
      return acc;
    }, {});
  }, [filteredTransactions]);

  const abbreviateNumber = (amount, isCurrency = false) => {
    if (amount == null || amount === 0) return isCurrency ? "₱0.00" : "0";
    const num = Math.abs(amount);
    if (num >= 1000000)
      return (isCurrency ? "₱" : "") + (num / 1000000).toFixed(1) + "M";
    if (num >= 1000)
      return (isCurrency ? "₱" : "") + (num / 1000).toFixed(1) + "K";
    return isCurrency
      ? new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 2,
        }).format(amount)
      : String(amount);
  };

  const handleNumberClick = (title, value, isCurrency = false) => {
    const formatted = isCurrency
      ? new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 2,
        }).format(value)
      : String(value);
    setNumberViewModal({
      show: true,
      title,
      value: String(value),
      formattedValue: formatted,
    });
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      setActionLock(true);
      await request("/accounting/journal-entries", {
        method: "POST",
        body: JSON.stringify({
          entry_date: formData.expense_date,
          description:
            formData.description || `Expense: ${formData.expense_account_id}`,
          reference_number: formData.reference_number || null,
          lines: [
            {
              account_id: parseInt(formData.expense_account_id),
              debit_amount: parseFloat(formData.amount),
              credit_amount: 0,
              description: formData.description || "Expense paid",
            },
            {
              account_id: parseInt(formData.cash_account_id),
              debit_amount: 0,
              credit_amount: parseFloat(formData.amount),
              description: formData.description || "Expense paid",
            },
          ],
        }),
      });

      showToast.success("Expense recorded successfully");
      resetForm();
      await fetchExpenseTransactions();
    } catch (error) {
      showToast.error(error.message || "Failed to record expense");
    } finally {
      setActionLock(false);
    }
  };

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split("T")[0],
      expense_account_id: "",
      supplier_id: "",
      cash_account_id: "",
      amount: "",
      description: "",
      reference_number: "",
    });
    setShowForm(false);
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

  // Report: get start_date, end_date (YYYY-MM-DD) and label from selected period
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

  const getReportTransactions = useCallback((start_date, end_date) => {
    return expenseTransactions.filter((t) => {
      const d = t.date ? String(t.date).split("T")[0] : "";
      return d >= start_date && d <= end_date;
    });
  }, [expenseTransactions]);

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

  const handleExportReportPdf = () => {
    const { start_date, end_date, label } = getReportDateRange();
    if (reportPeriod === "custom" && (!reportCustomStart || !reportCustomEnd)) {
      showToast.error("Please select From and To dates for custom range.");
      return;
    }
    setReportExporting(true);
    try {
      const list = getReportTransactions(start_date, end_date);
      const generated = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const totalExpenses = list.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

      // Summary by account (account code, name, count, total)
      const byAccount = list.reduce((acc, t) => {
        const code = t.account_code || "";
        const name = (t.account_name || "").replace(/</g, "&lt;");
        const key = code || "Other";
        if (!acc[key]) acc[key] = { code, name: name || (key === "Other" ? "Other" : ""), count: 0, total: 0 };
        acc[key].count += 1;
        acc[key].total += parseFloat(t.amount) || 0;
        return acc;
      }, {});
      const accountRows = Object.values(byAccount)
        .sort((a, b) => String(a.code).localeCompare(String(b.code)))
        .map(
          (row, idx) => `
          <tr>
            <td class="cell-num">${idx + 1}</td>
            <td class="cell-text">${(row.code || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${row.name}</td>
            <td class="cell-num">${row.count}</td>
            <td class="cell-amt">${formatCurrency(row.total)}</td>
          </tr>`,
        )
        .join("");

      const rowsHtml = list
        .map(
          (t, idx) => `
          <tr>
            <td class="cell-num">${idx + 1}</td>
            <td class="cell-text">${formatDate(t.date)}</td>
            <td class="cell-text">${(t.type || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${(t.supplier_name || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${(t.account_code || "").replace(/</g, "&lt;")} ${(t.account_name || "").replace(/</g, "&lt;")}</td>
            <td class="cell-text">${(t.reference || "").replace(/</g, "&lt;")}</td>
            <td class="cell-amt">${formatCurrency(t.amount)}</td>
          </tr>`,
        )
        .join("");
      const win = window.open("", "_blank");
      if (!win) {
        showToast.error("Please allow pop-ups to open the report.");
        setReportExporting(false);
        return;
      }
      win.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Expenses Report - ${label}</title>
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
            .section-title { font-size: 12px; font-weight: 700; color: #1e3a5f; margin: 20px 0 8px 0; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Expenses Report</h1>
            <div class="sub">${label}</div>
          </div>
          <div class="report-meta"><strong>Generated:</strong> ${generated}</div>
          <div class="summary-box">
            <span>Period:</span> ${label}
            <span>Total Transactions:</span> ${list.length}
            <span>Total Expenses:</span> ${formatCurrency(totalExpenses)}
          </div>
          <div class="section-title">Summary by Account</div>
          <table>
            <thead>
              <tr>
                <th style="width:4%;">#</th>
                <th style="width:12%;">Account Code</th>
                <th style="width:36%;">Account Name</th>
                <th style="width:12%;">Count</th>
                <th style="width:18%;">Total</th>
              </tr>
            </thead>
            <tbody>${accountRows}</tbody>
          </table>
          <div class="section-title">List of Transactions</div>
          <table>
            <thead>
              <tr>
                <th style="width:4%;">#</th>
                <th style="width:10%;">Date</th>
                <th style="width:10%;">Type</th>
                <th style="width:14%;">Supplier</th>
                <th style="width:18%;">Account</th>
                <th style="width:14%;">Reference</th>
                <th style="width:14%;">Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="report-footer">CPC Accounting System · Expenses Report · ${generated}</div>
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

  const handleExportReportExcel = () => {
    const { start_date, end_date, label } = getReportDateRange();
    if (reportPeriod === "custom" && (!reportCustomStart || !reportCustomEnd)) {
      showToast.error("Please select From and To dates for custom range.");
      return;
    }
    setReportExporting(true);
    try {
      const list = getReportTransactions(start_date, end_date);
      const generated = new Date().toLocaleString();
      const bom = "\uFEFF";
      const byAccount = list.reduce((acc, t) => {
        const code = t.account_code || "";
        const name = (t.account_name || "").replace(/"/g, '""');
        const key = code || "Other";
        if (!acc[key]) acc[key] = { code: (code || "").replace(/"/g, '""'), name: name || (key === "Other" ? "Other" : ""), count: 0, total: 0 };
        acc[key].count += 1;
        acc[key].total += parseFloat(t.amount) || 0;
        return acc;
      }, {});
      const accountLines = Object.values(byAccount)
        .sort((a, b) => String(a.code).localeCompare(String(b.code)))
        .map((row, idx) => [idx + 1, `"${row.code}"`, `"${row.name}"`, row.count, row.total.toFixed(2)].join(","));

      const lines = [
        "Expenses Report",
        `"${label}"`,
        `"Generated","${generated}"`,
        "",
        `"Total Entries",${list.length}`,
        "",
        "Summary by Account",
        "#,Account Code,Account Name,Count,Total",
        ...accountLines,
        "",
        "List of Transactions",
        "#,Date,Type,Supplier,Account,Reference,Amount",
      ];
      list.forEach((t, idx) => {
        const type = (t.type || "").replace(/"/g, '""');
        const supplier = (t.supplier_name || "").replace(/"/g, '""');
        const account = `${t.account_code || ""} ${t.account_name || ""}`.trim().replace(/"/g, '""');
        const ref = (t.reference || "").replace(/"/g, '""');
        lines.push(
          [
            idx + 1,
            `"${formatDate(t.date)}"`,
            `"${type}"`,
            `"${supplier}"`,
            `"${account}"`,
            `"${ref}"`,
            t.amount ?? "",
          ].join(","),
        );
      });
      const csvContent = bom + lines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Expenses_Report_${start_date}_to_${end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success("Excel report downloaded.");
    } catch (err) {
      console.error("Excel export error:", err);
      showToast.error(err?.message || "Failed to export Excel.");
    } finally {
      setReportExporting(false);
    }
  };

    return (
    <div
      className={`container-fluid px-3 pt-0 pb-2 expenses-container ${
        !loading ? "fadeIn" : ""
      }`}
    >
      <style>{`
        .modal-backdrop-animation { animation: modalBackdropFadeIn 0.3s ease-out forwards; }
        .modal-backdrop-animation.exit { animation: modalBackdropFadeOut 0.2s ease-in forwards; }
        .modal-content-animation { animation: modalContentSlideIn 0.3s ease-out forwards; }
        .modal-content-animation.exit { animation: modalContentSlideOut 0.2s ease-in forwards; }
        @keyframes modalBackdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalBackdropFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalContentSlideIn { from { opacity: 0; transform: translateY(-50px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalContentSlideOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-50px) scale(0.95); } }
        @media (max-width: 767.98px) {
          .expenses-transactions-table-wrap { position: relative; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
          .expenses-transactions-table-wrap table { min-width: 720px; border-collapse: separate; border-spacing: 0; }
          .expenses-transactions-table-wrap .je-col-index, .expenses-transactions-table-wrap .je-col-actions { position: sticky; background-color: #fff; z-index: 5; }
          .expenses-transactions-table-wrap thead .je-col-index, .expenses-transactions-table-wrap thead .je-col-actions { z-index: 7; background-color: #f8f9fa !important; }
          .expenses-transactions-table-wrap .je-col-index { left: 0; min-width: 44px; width: 44px; }
          .expenses-transactions-table-wrap .je-col-actions { left: 44px; min-width: 56px; width: 56px; }
        }
      `}</style>

      {loading ? (
        <LoadingSpinner text="Loading expense transactions..." />
      ) : (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <div className="flex-grow-1 mb-2 mb-md-0">
              <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            <FaArrowDown className="me-2" />
            Expenses
          </h1>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                Track all expense transactions
              </p>
        </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
                type="button"
                className="btn btn-sm"
                onClick={fetchExpenseTransactions}
                disabled={loading || isActionDisabled()}
                style={{ padding: "0.45rem 0.9rem", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: loading || isActionDisabled() ? "not-allowed" : "pointer", opacity: loading || isActionDisabled() ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                onMouseEnter={(e) => { if (!loading && !e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = "#e2e8f0"; e.currentTarget.style.borderColor = "#cbd5e1"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }
              >
                <FaSyncAlt style={{ fontSize: "0.875rem", color: "inherit" }} /> Refresh
        </button>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2"
                onClick={handleOpenReportModal}
                disabled={loading || isActionDisabled()}
                style={{
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: "#1e3a5f",
                  border: "1px solid #1e3a5f",
                  borderRadius: "4px",
                  cursor: loading || isActionDisabled() ? "not-allowed" : "pointer",
                  opacity: loading || isActionDisabled() ? 0.7 : 1,
                }}
              >
                <FaChartBar style={{ fontSize: "0.875rem" }} />
                Generate Report
              </button>
            </div>
      </div>

          {/* Statistics panels — same structure as Income (4 panels) with hover */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="h-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>
                <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total transactions</div>
                <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div onClick={() => !initialLoading && handleNumberClick("Total Transactions", stats.totalTransactions, false)} style={{ color: "#334155", fontSize: "clamp(1rem, 3vw, 1.5rem)", fontWeight: 700, lineHeight: 1.2, cursor: initialLoading ? "default" : "pointer", userSelect: "none", fontVariantNumeric: "tabular-nums" }}>{initialLoading ? "..." : abbreviateNumber(stats.totalTransactions, false)}</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#64748b" }}><i className="fas fa-info-circle me-1" /> Click to view full number</div>
            </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="fas fa-file-invoice" style={{ color: "#64748b", fontSize: "1.1rem" }} /></div>
          </div>
        </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="h-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>
                <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total expenses</div>
                <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div onClick={() => !initialLoading && handleNumberClick("Total Expenses", stats.totalExpenses, true)} style={{ color: "#dc2626", fontSize: "clamp(1rem, 3vw, 1.5rem)", fontWeight: 700, lineHeight: 1.2, cursor: initialLoading ? "default" : "pointer", userSelect: "none", fontVariantNumeric: "tabular-nums" }}>{initialLoading ? "..." : abbreviateNumber(stats.totalExpenses, true)}</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#64748b" }}><i className="fas fa-info-circle me-1" /> Click to view full number</div>
          </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="fas fa-arrow-down" style={{ color: "#dc2626", fontSize: "1.1rem" }} /></div>
        </div>
            </div>
          </div>
            <div className="col-6 col-md-3">
              <div className="h-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>
                <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expense accounts</div>
                <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div onClick={() => !initialLoading && handleNumberClick("Expense Accounts", stats.expenseAccounts, false)} style={{ color: "#334155", fontSize: "clamp(1rem, 3vw, 1.5rem)", fontWeight: 700, lineHeight: 1.2, cursor: initialLoading ? "default" : "pointer", userSelect: "none", fontVariantNumeric: "tabular-nums" }}>{initialLoading ? "..." : abbreviateNumber(stats.expenseAccounts, false)}</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#64748b" }}><i className="fas fa-info-circle me-1" /> Click to view full number</div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="fas fa-chart-line" style={{ color: "#64748b", fontSize: "1.1rem" }} /></div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="h-100" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>
                <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Filtered results</div>
                <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div onClick={() => handleNumberClick("Filtered Results", filteredTransactions.length, false)} style={{ color: "#334155", fontSize: "clamp(1rem, 3vw, 1.5rem)", fontWeight: 700, lineHeight: 1.2, cursor: "pointer", userSelect: "none", fontVariantNumeric: "tabular-nums" }}>{abbreviateNumber(filteredTransactions.length, false)}</div>
                    <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#64748b" }}><i className="fas fa-info-circle me-1" /> Click to view full number</div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="fas fa-filter" style={{ color: "#64748b", fontSize: "1.1rem" }} /></div>
                </div>
              </div>
        </div>
      </div>

          {/* Search and Filter — same structure as Income */}
          <div className="mb-3" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem" }}>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-4 col-lg-3">
                  <label className="d-block mb-1" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Search transactions</label>
                  <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#fff", overflow: "hidden" }}>
                    <span style={{ display: "flex", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", color: "#64748b", borderRight: "1px solid #e2e8f0" }}><i className="fas fa-search" style={{ fontSize: "0.875rem" }} /></span>
                    <input type="text" placeholder="Supplier, description, reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={loading || isActionDisabled()} style={{ flex: 1, padding: "0.5rem 0.75rem", border: "none", outline: "none", fontSize: "0.8125rem", color: "#334155", backgroundColor: "#fff", minWidth: 0 }} />
                    {searchTerm && <button type="button" onClick={() => setSearchTerm("")} disabled={loading || isActionDisabled()} style={{ padding: "0.35rem 0.6rem", border: "none", background: "transparent", color: "#64748b", cursor: "pointer" }} title="Clear search"><i className="fas fa-times" style={{ fontSize: "0.75rem" }} /></button>}
            </div>
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <label className="d-block mb-1" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expense account</label>
                  <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} disabled={loading || isActionDisabled()} style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.8125rem", fontWeight: 500, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
                    <option value="all">All accounts</option>
                    {filterExpenseAccountOptions.map((account) => (
                      <option key={String(account.account_code)} value={String(account.account_code)}>{account.account_code} – {account.account_name}</option>
                ))}
              </select>
            </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <label className="d-block mb-1" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading || isActionDisabled()} style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
            </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <label className="d-block mb-1" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>End date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={loading || isActionDisabled()} style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
                </div>
                <div className="col-6 col-md-4 col-lg-auto">
                  <label className="d-block mb-1" style={{ fontSize: "0.7rem", fontWeight: 600, color: "transparent", userSelect: "none" }}>Action</label>
                  <button type="button" onClick={clearFilters} disabled={loading || isActionDisabled() || !hasActiveFilters} style={{ width: "100%", padding: "0.5rem 0.875rem", fontSize: "0.8125rem", fontWeight: 600, color: hasActiveFilters ? "#334155" : "#94a3b8", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: hasActiveFilters && !loading ? "pointer" : "not-allowed", opacity: hasActiveFilters ? 1 : 0.8, whiteSpace: "nowrap", transition: "background-color 0.2s ease, border-color 0.2s ease" }} onMouseEnter={(e) => { if (hasActiveFilters && !loading && !e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = "#e2e8f0"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}><i className="fas fa-times me-1" style={{ fontSize: "0.75rem" }} /> Clear filters</button>
            </div>
          </div>
        </div>
      </div>

          {/* Expenses by Account — same structure as Income by Account */}
          {Object.keys(expensesByAccount).length > 0 && (() => {
            const accountRows = Object.values(expensesByAccount).sort((a, b) => b.total - a.total);
            const grandTotal = accountRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
            return (
              <div className="mb-3" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "0.875rem 1.25rem", background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="fas fa-chart-pie" style={{ color: "#fff", fontSize: "0.95rem" }} />
          </div>
                    <div>
                      <h5 style={{ margin: 0, fontWeight: 600, fontSize: "1rem", color: "#fff", letterSpacing: "0.01em" }}>Expenses by Account</h5>
                      <small style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem" }}>Summary by expense account</small>
                    </div>
                  </div>
                </div>
                <div className="d-block d-md-none" style={{ padding: "0.75rem" }}>
                  {accountRows.map((item, index) => (
                    <div key={index} style={{ padding: "0.875rem 1rem", marginBottom: index < accountRows.length - 1 ? "0.5rem" : 0, backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <span style={{ padding: "0.2rem 0.45rem", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "ui-monospace, monospace" }}>{item.account_code || "—"}</span>
                        <span style={{ fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem" }}>{formatCurrency(item.total)}</span>
                      </div>
                      <div style={{ marginTop: "0.5rem", color: "#475569", fontSize: "0.875rem" }}>{item.account_name || "—"}</div>
                      <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#64748b" }}>{item.count} transaction{item.count !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: "0.75rem", padding: "0.875rem 1rem", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.875rem" }}>Total</span>
                    <span style={{ fontWeight: 600, color: "#b91c1c", fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem" }}>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
                <div className="d-none d-md-block" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Code</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Count</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Expenses</th>
                  </tr>
                </thead>
                <tbody>
                      {accountRows.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem", verticalAlign: "middle" }}>
                            <span style={{ display: "inline-block", padding: "0.25rem 0.5rem", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "ui-monospace, monospace" }}>{item.account_code || "—"}</span>
                        </td>
                          <td style={{ padding: "0.75rem 1rem", color: "#334155", verticalAlign: "middle" }}>{item.account_name || "—"}</td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums", verticalAlign: "middle" }}>{item.count}</td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums", verticalAlign: "middle" }}>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #e2e8f0", fontWeight: 600 }}>
                        <td colSpan={3} style={{ padding: "0.875rem 1rem", color: "#334155", fontSize: "0.875rem" }}>Total</td>
                        <td style={{ padding: "0.875rem 1rem", textAlign: "right", color: "#b91c1c", fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem" }}>{formatCurrency(grandTotal)}</td>
                      </tr>
                    </tfoot>
              </table>
            </div>
          </div>
            );
          })()}

          {/* Expense Transactions — same structure as Income Transactions */}
          <div className="mb-3" style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "0.875rem 1.25rem", background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-arrow-down" style={{ color: "#fff", fontSize: "0.95rem" }} />
        </div>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 600, fontSize: "1rem", color: "#fff", letterSpacing: "0.01em" }}>
                    Expense Transactions
                    {!loading && <span style={{ opacity: 0.9, fontWeight: 500, marginLeft: "0.35rem" }}>({paginationMeta.total} total)</span>}
                  </h5>
                  <small style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem" }}>List of expense entries by date</small>
                </div>
              </div>
            </div>
            <div style={{ padding: 0 }}>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3"><i className="fas fa-arrow-down fa-3x" style={{ color: "var(--text-muted)", opacity: 0.5 }} /></div>
                  <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>No Expense Transactions Found</h5>
                  <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                    {hasActiveFilters ? "Try adjusting your search criteria" : "Start by creating your first expense transaction."}
                  </p>
                  {!hasActiveFilters && (
                    <button className="btn btn-sm btn-danger text-white" onClick={() => { resetForm(); setShowForm(true); }} disabled={isActionDisabled()} style={{ borderRadius: "4px" }}>
                      <FaPlus className="me-1" /> Add Expense
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="d-block d-md-none" style={{ padding: "0.75rem" }}>
                    {currentTransactions.map((transaction, index) => (
                      <div key={transaction.id} style={{ padding: "0.875rem 1rem", marginBottom: index < currentTransactions.length - 1 ? "0.5rem" : 0, backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{formatDate(transaction.date)}</span>
                          <span style={{ fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem", cursor: "pointer" }} onClick={() => handleNumberClick("Amount", transaction.amount, true)} onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Amount", transaction.amount, true)} role="button" tabIndex={0} title={formatCurrency(transaction.amount)}>{formatCurrency(transaction.amount)}</span>
                        </div>
                        <div style={{ marginTop: "0.35rem", fontSize: "0.875rem", color: "#334155" }}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.4rem", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "ui-monospace, monospace" }}>{transaction.account_code || "—"}</span> {transaction.account_name || ""}
                        </div>
                        {(transaction.supplier_name || transaction.description) && (
                          <div style={{ marginTop: "0.35rem", fontSize: "0.8125rem", color: "#475569" }} title={transaction.description || transaction.supplier_name}>
                            {transaction.supplier_name ? `${transaction.supplier_name}${transaction.description ? " · " : ""}` : ""}{transaction.description ? (transaction.description.length > 50 ? `${transaction.description.slice(0, 50)}…` : transaction.description) : ""}
                          </div>
                        )}
                        <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{transaction.reference ? `Ref: ${transaction.reference}` : ""}{transaction.status ? ` · ${transaction.status}` : ""}</span>
                          <button type="button" className="btn btn-sm" onClick={() => { setSelectedTransaction(transaction); setShowViewModal(true); }} disabled={isActionDisabled()} title="View Details" style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.8125rem", backgroundColor: "#dc2626", color: "#fff", border: "none" }}><FaEye className="me-1" style={{ fontSize: "0.75rem" }} /> View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="d-none d-md-block table-responsive expenses-transactions-table-wrap" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }} className="mb-0">
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "4%" }}>#</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "10%" }}>Actions</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "12%" }}>
                            <button type="button" className="btn btn-link p-0 border-0 text-decoration-none" onClick={() => handleSort("date")} disabled={isActionDisabled()} style={{ color: "#475569", fontWeight: 600 }}>Date <i className={`ms-1 ${getSortIcon("date")}`} /></button>
                          </th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "15%" }}>Account</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "15%" }}>Supplier</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "20%" }}>
                            <button type="button" className="btn btn-link p-0 border-0 text-decoration-none" onClick={() => handleSort("description")} disabled={isActionDisabled()} style={{ color: "#475569", fontWeight: 600 }}>Description <i className={`ms-1 ${getSortIcon("description")}`} /></button>
                          </th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "12%" }}>Reference</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "12%" }}>
                            <button type="button" className="btn btn-link p-0 border-0 text-decoration-none" onClick={() => handleSort("amount")} disabled={isActionDisabled()} style={{ color: "#475569", fontWeight: 600 }}>Amount <i className={`ms-1 ${getSortIcon("amount")}`} /></button>
                          </th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "10%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                        {currentTransactions.map((transaction, index) => (
                          <tr key={transaction.id} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid #f1f5f9" }} className="align-middle" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#fff" : "#fafbfc"; }}>
                            <td className="je-col-index text-center" style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#334155" }}>{startIndex + index + 1}</td>
                            <td className="je-col-actions text-center" style={{ padding: "0.75rem 1rem" }}>
                              <button type="button" className="btn btn-sm" onClick={() => { setSelectedTransaction(transaction); setShowViewModal(true); }} disabled={isActionDisabled()} title="View Details" style={{ width: "32px", height: "32px", borderRadius: "6px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626", color: "#fff", border: "none" }}><FaEye style={{ fontSize: "0.875rem" }} /></button>
                    </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{formatDate(transaction.date)}</td>
                            <td style={{ padding: "0.75rem 1rem", maxWidth: "150px", overflow: "hidden" }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${transaction.account_code} - ${transaction.account_name}`}>
                                <span style={{ display: "inline-block", padding: "0.2rem 0.4rem", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "ui-monospace, monospace" }}>{transaction.account_code}</span>
                        </div>
                              <div style={{ fontSize: "0.8125rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={transaction.account_name}>{transaction.account_name}</div>
                      </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#334155", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={transaction.supplier_name || "—"}>{transaction.supplier_name || "—"}</td>
                            <td style={{ padding: "0.75rem 1rem", color: "#334155", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={transaction.description}>{transaction.description}</td>
                            <td style={{ padding: "0.75rem 1rem", color: "#64748b", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={transaction.reference || "—"}><code style={{ fontSize: "0.8125rem" }}>{transaction.reference || "—"}</code></td>
                            <td className="text-end" style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                              <span style={{ cursor: "pointer" }} onClick={() => handleNumberClick("Amount", transaction.amount, true)} onKeyDown={(e) => e.key === "Enter" && handleNumberClick("Amount", transaction.amount, true)} role="button" tabIndex={0} title={formatCurrency(transaction.amount)}>{formatCurrency(transaction.amount)}</span>
                      </td>
                            <td style={{ padding: "0.75rem 1rem" }}>{transaction.status && <span className={`badge bg-${getStatusBadge(transaction.status)}`}>{transaction.status}</span>}</td>
                    </tr>
                        ))}
              </tbody>
                      {filteredTransactions.length > 0 && (
                        <tfoot>
                          <tr style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #e2e8f0", fontWeight: 600 }}>
                            <td colSpan={8} style={{ padding: "0.875rem 1rem", color: "#334155", fontSize: "0.875rem" }}>Total</td>
                            <td style={{ padding: "0.875rem 1rem", textAlign: "right", color: "#b91c1c", fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem" }}>{formatCurrency(totalExpenses)}</td>
                            <td style={{ padding: "0.875rem 1rem" }} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
                </>
              )}
        </div>

            {!loading && filteredTransactions.length > 0 && (
              <div style={{ padding: "0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Page navigation</div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3" style={{ padding: "0.875rem 1rem" }}>
                  <div className="text-center text-md-start text-nowrap order-1 order-md-0 align-self-md-center">
                    <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Showing </span>
                    <span style={{ fontWeight: 600, color: "#334155", fontVariantNumeric: "tabular-nums" }}>{paginationMeta.from || startIndex + 1}–{paginationMeta.to || Math.min(startIndex + currentTransactions.length, paginationMeta.total)}</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}> of </span>
                    <span style={{ fontWeight: 600, color: "#334155", fontVariantNumeric: "tabular-nums" }}>{paginationMeta.total}</span>
                    <span style={{ fontSize: "0.8125rem", color: "#64748b" }}> transactions</span>
                  </div>
                  <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-center justify-content-md-end gap-2 order-2 order-md-1 w-100 w-md-auto ms-md-auto">
                    <div className="d-flex align-items-center justify-content-center justify-content-md-end gap-2" style={{ minWidth: "fit-content" }}>
                      <label className="mb-0 text-nowrap" style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Per page</label>
                      <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} disabled={loading || isActionDisabled()} aria-label="Items per page" style={{ padding: "0.35rem 0.6rem", fontSize: "0.8125rem", fontWeight: 500, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", minWidth: "4rem", width: "auto" }}>
                        <option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option>
                      </select>
                    </div>
                    <div className="d-flex flex-column align-items-center gap-2 d-md-none w-100">
                      <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500 }}>Page {paginationMeta.current_page} of {paginationMeta.last_page}</span>
                      <div className="d-flex justify-content-center gap-2 w-100" style={{ minHeight: "36px" }}>
                        <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={paginationMeta.current_page === 1 || isActionDisabled()} style={{ flex: 1, minHeight: "36px", minWidth: "88px", padding: "0.4rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: paginationMeta.current_page === 1 ? "not-allowed" : "pointer", opacity: paginationMeta.current_page === 1 ? 0.6 : 1 }}><FaChevronLeft className="me-1" style={{ verticalAlign: "middle" }} /> Previous</button>
                        <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, paginationMeta.last_page))} disabled={paginationMeta.current_page === paginationMeta.last_page || isActionDisabled()} style={{ flex: 1, minHeight: "36px", minWidth: "88px", padding: "0.4rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: paginationMeta.current_page === paginationMeta.last_page ? "not-allowed" : "pointer", opacity: paginationMeta.current_page === paginationMeta.last_page ? 0.6 : 1 }}>Next <FaChevronRight className="ms-1" style={{ verticalAlign: "middle" }} /></button>
                      </div>
                    </div>
                    <div className="d-none d-md-flex align-items-center flex-wrap justify-content-end gap-2" style={{ minHeight: "36px" }}>
                      <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={paginationMeta.current_page === 1 || isActionDisabled()} style={{ minHeight: "36px", minWidth: "88px", padding: "0.4rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: paginationMeta.current_page === 1 ? "not-allowed" : "pointer", opacity: paginationMeta.current_page === 1 ? 0.6 : 1 }}><FaChevronLeft className="me-1" style={{ verticalAlign: "middle" }} /> Previous</button>
                      {(() => { let pages = []; const maxVisiblePages = 5; const totalPages = paginationMeta.last_page; if (totalPages <= maxVisiblePages) pages = Array.from({ length: totalPages }, (_, i) => i + 1); else { pages.push(1); let start = Math.max(2, paginationMeta.current_page - 1); let end = Math.min(totalPages - 1, paginationMeta.current_page + 1); if (paginationMeta.current_page <= 2) end = 4; else if (paginationMeta.current_page >= totalPages - 1) start = totalPages - 3; if (start > 2) pages.push("..."); for (let i = start; i <= end; i++) pages.push(i); if (end < totalPages - 1) pages.push("..."); if (totalPages > 1) pages.push(totalPages); } return pages.map((page, index) => (<button key={index} type="button" onClick={() => page !== "..." && setCurrentPage(page)} disabled={page === "..." || isActionDisabled()} style={{ minWidth: "36px", minHeight: "36px", padding: "0.25rem", fontSize: "0.8125rem", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: paginationMeta.current_page === page ? "#fff" : "#334155", backgroundColor: paginationMeta.current_page === page ? "#1e293b" : "#fff", border: `1px solid ${paginationMeta.current_page === page ? "#1e293b" : "#e2e8f0"}`, borderRadius: "4px", cursor: page === "..." ? "default" : "pointer" }}>{page}</button>)); })()}
                      <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, paginationMeta.last_page))} disabled={paginationMeta.current_page === paginationMeta.last_page || isActionDisabled()} style={{ minHeight: "36px", minWidth: "88px", padding: "0.4rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#334155", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: paginationMeta.current_page === paginationMeta.last_page ? "not-allowed" : "pointer", opacity: paginationMeta.current_page === paginationMeta.last_page ? 0.6 : 1 }}>Next <FaChevronRight className="ms-1" style={{ verticalAlign: "middle" }} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
      </div>

      {showForm && (
            <ExpenseFormModal formData={formData} setFormData={setFormData} expenseAccounts={expenseAccounts} cashAccounts={cashAccounts} suppliers={suppliers} onSubmit={handleSaveExpense} onClose={resetForm} submitting={actionLock} />
          )}
      {showViewModal && selectedTransaction && (
            <ExpenseViewModal transaction={selectedTransaction} onClose={() => setShowViewModal(false)} />
          )}
          {numberViewModal.show && (
            <ExpenseNumberViewModal title={numberViewModal.title} value={numberViewModal.formattedValue} onClose={() => setNumberViewModal({ ...numberViewModal, show: false })} />
          )}

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
                        Generate Expenses Report
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

// Expense Number View Modal (same structure as Income NumberViewModal)
const ExpenseNumberViewModal = ({ title, value, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) handleClose(); };
  const handleEscapeKey = (e) => { if (e.key === "Escape") handleClose(); };
  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => showToast.success("Number copied to clipboard!")).catch(() => showToast.error("Failed to copy number"));
  };
  return (
    <Portal>
      <div className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`} style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={handleBackdropClick} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content border-0 ${isClosing ? "modal-content-animation exit" : "modal-content-animation"}`} style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div className="modal-header border-0 text-white" style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }}>
              <h5 className="modal-title fw-bold"><i className="fas fa-info-circle me-2" />{title}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose} aria-label="Close" />
            </div>
            <div className="modal-body text-center py-4 bg-light">
              <div className="h2 mb-2 fw-bold" style={{ color: "#dc2626", wordBreak: "break-word", fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>{value}</div>
              <p className="text-muted small mb-0">Full number value</p>
            </div>
            <div className="modal-footer border-top bg-white">
              <button type="button" className="btn btn-outline-secondary" onClick={handleCopy}><i className="fas fa-copy me-2" /> Copy</button>
              <button type="button" className="btn btn-danger text-white fw-semibold" onClick={handleClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Expense Form Modal Component — same structure as Income Form Modal
const ExpenseFormModal = ({
  formData,
  setFormData,
  expenseAccounts,
  cashAccounts,
  suppliers,
  onSubmit,
  onClose,
  submitting = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    if (submitting) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };
  const handleEscapeKey = (e) => { if (e.key === "Escape") handleClose(); };
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) handleClose(); };
  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);
  return (
    <Portal>
      <div className={`modal fade show d-block ${isClosing ? "modal-backdrop-animation exit" : "modal-backdrop-animation"}`} style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={handleBackdropClick} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className={`modal-content border-0 ${isClosing ? "modal-content-animation exit" : "modal-content-animation"}`} style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div className="modal-header border-0 text-white" style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }}>
              <h5 className="modal-title fw-bold"><FaPlus className="me-2" /> Add Expense</h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose} disabled={submitting} aria-label="Close" />
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body bg-light">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Expense Date *</label>
                    <input type="date" className="form-control" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required disabled={submitting} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Expense Account *</label>
                    <select className="form-select" value={formData.expense_account_id} onChange={(e) => setFormData({ ...formData, expense_account_id: e.target.value })} required disabled={submitting}>
                      <option value="">Select Expense Account</option>
                      {expenseAccounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Cash Account *</label>
                    <select className="form-select" value={formData.cash_account_id} onChange={(e) => setFormData({ ...formData, cash_account_id: e.target.value })} required disabled={submitting}>
                      <option value="">Select Cash Account</option>
                      {cashAccounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Supplier (Optional)</label>
                    <select className="form-select" value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} disabled={submitting}>
                      <option value="">Select Supplier (Optional)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Amount *</label>
                    <input type="number" step="0.01" min="0" className="form-control" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required disabled={submitting} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Reference Number</label>
                    <input type="text" className="form-control" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} placeholder="Optional" disabled={submitting} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea className="form-control" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the expense..." disabled={submitting} />
                </div>
              </div>
              <div className="modal-footer border-top bg-white">
                <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-danger text-white fw-semibold" disabled={submitting}>
                  {submitting ? (<><span className="spinner-border spinner-border-sm me-2" role="status" />Recording...</>) : (<><FaPlus className="me-2" /> Record Expense</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Expense View Modal — same UI/structure as Clients/AR Invoice View Modal + Footprint
const ExpenseViewModal = ({ transaction, onClose }) => {
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };
  const handleEscapeKey = (e) => { if (e.key === "Escape") handleClose(); };
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
            <div className="modal-header border-0 text-white" style={{ background: "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)" }}>
              <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)" }}>
                  <FaEye />
            </div>
                <div style={{ minWidth: 0 }}>
                  <div className="fw-bold" style={{ fontSize: "1.05rem", lineHeight: 1.2 }}>Expense Transaction Details</div>
                  <div className="small opacity-75" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {transaction.reference || "—"} • {formatDate(transaction.date)}
                </div>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose} aria-label="Close" />
                </div>
            <div className="modal-body bg-light" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <Footprint
                createdBy={transaction.created_by_name}
                createdAt={transaction.created_at}
                updatedBy={transaction.updated_by_name}
                updatedAt={transaction.updated_at}
              />
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-4">
                  <div className="bg-white border rounded-3 p-3 h-100">
                    <div className="small text-muted fw-semibold mb-1">Total Amount</div>
                    <div className="fw-bold text-danger" style={{ fontSize: "1.25rem" }}>{formatCurrency(transaction.amount)}</div>
                </div>
              </div>
              </div>
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Transaction Information</div>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Date</div>
                    <div className="fw-semibold">{formatDate(transaction.date)}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Reference</div>
                    <div className="fw-semibold">{transaction.reference || "—"}</div>
              </div>
              {transaction.status && (
                    <div className="col-12 col-md-6">
                      <div className="small text-muted fw-semibold">Status</div>
                      <span className={`badge bg-${transaction.status === "paid" ? "success" : "info"}`}>{transaction.status}</span>
                </div>
              )}
            </div>
            </div>
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="fw-semibold mb-2">Parties & Account</div>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Account</div>
                    <div className="fw-semibold">{transaction.account_code} — {transaction.account_name}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="small text-muted fw-semibold">Supplier</div>
                    <div className="fw-semibold">{transaction.supplier_name || "—"}</div>
                  </div>
                </div>
              </div>
              {(transaction.description) && (
                <div className="bg-white border rounded-3 p-3 mb-3">
                  <div className="fw-semibold mb-2">Description</div>
                  <div className="text-muted" style={{ whiteSpace: "pre-wrap" }}>{transaction.description}</div>
                </div>
              )}
            </div>
            <div className="modal-footer border-top bg-white">
              <button type="button" className="btn btn-primary text-white fw-semibold" onClick={handleClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default Expenses;
