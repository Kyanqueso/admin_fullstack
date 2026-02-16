import pencilIcon from '../../../assets/icons/pencil.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
  const CLIENTS_URL = `${FAST_API_URL}/clients`;
  const ORDERS_URL = `${FAST_API_URL}/client-orders`;
  const SUMMARIES_URL = `${FAST_API_URL}/payment-summaries`;
  const TRANSACTIONS_URL = `${FAST_API_URL}/payment-transactions`;

  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  if (!COMPANY_ID) {
    alert("No company selected.");
    window.location.href = "../companies.html";
    return;
  }

  /* ===============================
     AUTH HELPERS
  =============================== */
  function getAccessToken() {
    const token = localStorage.getItem("access_token");
    if (!token || token === "null" || token === "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "../../auth/index.html";
      throw new Error("Missing access token");
    }
    return token;
  }

  async function apiFetch(url, options = {}) {
    const token = getAccessToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("access_token");
      window.location.href = "../../auth/index.html";
      throw new Error("Unauthorized");
    }

    return response;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '\u20B1' + num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /* ===============================
     DOM ELEMENTS
  =============================== */
  const tableBody = document.querySelector("tbody");
  const searchInput = document.querySelector('input[placeholder="Search name"]');
  const sortSelect = document.querySelector(".form-select");

  const historyOverlay = document.getElementById("transactionHistoryOverlay");
  const editOverlay = document.getElementById("editTransactionOverlay");
  const transactionsContainer = document.getElementById("transactionsContainer");

  let clientMap = {};
  let orderMap = {};
  let allPaymentRows = [];
  let currentEditSummaryId = null;
  let originalTransactions = [];

  /* ===============================
     LOAD DATA
  =============================== */
  async function loadData() {
    // Try to serve everything from cache (no spinner)
    const cachedClients = getFromCache(CLIENTS_URL);
    const cachedOrders = getFromCache(ORDERS_URL);
    const cachedSummaries = getFromCache(SUMMARIES_URL);
    const cachedTransactions = getFromCache(TRANSACTIONS_URL);
    const allCached = cachedClients && cachedOrders && cachedSummaries && cachedTransactions;

    if (!allCached) {
      tableBody.innerHTML = `
        <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
      `;
    }

    try {
      let allClients, allOrders, allSummaries, allTransactions;

      if (allCached) {
        allClients = cachedClients;
        allOrders = cachedOrders;
        allSummaries = cachedSummaries;
        allTransactions = cachedTransactions;
      } else {
        const [clientsRes, ordersRes, summariesRes, transactionsRes] = await Promise.all([
          apiFetch(CLIENTS_URL),
          apiFetch(ORDERS_URL),
          apiFetch(SUMMARIES_URL),
          apiFetch(TRANSACTIONS_URL)
        ]);

        allClients = await clientsRes.json();
        allOrders = await ordersRes.json();
        allSummaries = await summariesRes.json();
        allTransactions = await transactionsRes.json();

        saveToCache(CLIENTS_URL, allClients);
        saveToCache(ORDERS_URL, allOrders);
        saveToCache(SUMMARIES_URL, allSummaries);
        saveToCache(TRANSACTIONS_URL, allTransactions);
      }

      // Build client map (filtered by company)
      const companyClients = allClients.filter(
        c => String(c.company_id) === String(COMPANY_ID)
      );
      clientMap = {};
      companyClients.forEach(c => { clientMap[c.id] = c; });

      // Build order map
      orderMap = {};
      allOrders.forEach(o => { orderMap[o.id] = o; });

      // Group transactions by summary_id
      const transactionsBySummary = {};
      allTransactions.forEach(t => {
        if (!transactionsBySummary[t.payment_summary_id]) {
          transactionsBySummary[t.payment_summary_id] = [];
        }
        transactionsBySummary[t.payment_summary_id].push(t);
      });

      // Build enriched payment rows
      allPaymentRows = [];
      allSummaries.forEach(summary => {
        const order = orderMap[summary.client_order_id];
        if (!order) return;
        const client = clientMap[order.client_id];
        if (!client) return; // not in this company

        const transactions = transactionsBySummary[summary.id] || [];
        const totalAmount = Number(order.price) * Number(order.quantity);

        // If fully paid, find the latest transaction date
        let balanceClearedDate = null;
        if (Number(summary.remaining_balance) === 0 && transactions.length > 0) {
          const sorted = [...transactions].sort(
            (a, b) => new Date(b.payment_date) - new Date(a.payment_date)
          );
          balanceClearedDate = sorted[0].payment_date;
        }

        allPaymentRows.push({
          summaryId: summary.id,
          orderId: order.id,
          clientName: `${client.first_name} ${client.last_name}`,
          totalAmount,
          orderDate: order.order_date,
          balance: Number(summary.remaining_balance),
          balanceClearedDate,
          transactions
        });
      });

      renderTable(allPaymentRows);
    } catch (err) {
      console.error("Failed to load payment data:", err);
      tableBody.innerHTML = `
        <tr><td colspan="8" class="text-danger text-center">Failed to load payment data</td></tr>
      `;
    }
  }

  /* ===============================
     RENDER MAIN TABLE
  =============================== */
  function renderTable(rows) {
    tableBody.innerHTML = "";

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="8" class="text-center text-muted">No payment records found</td></tr>
      `;
      return;
    }

    rows.forEach(row => {
      const tr = document.createElement("tr");
      const balanceClass = row.balance > 0 ? "text-danger" : "text-success";

      tr.innerHTML = `
        <td>${escapeHtml(String(row.orderId))}</td>
        <td>${escapeHtml(row.clientName)}</td>
        <td>${formatCurrency(row.totalAmount)}</td>
        <td>${formatDate(row.orderDate)}</td>
        <td class="${balanceClass}">${formatCurrency(row.balance)}</td>
        <td>${row.balanceClearedDate ? formatDate(row.balanceClearedDate) : "-"}</td>
        <td>
          <button class="btn btn-sm text-white view-transaction-btn"
                  style="background-color: var(--color-primary);"
                  data-summary-id="${row.summaryId}">
            View History
          </button>
        </td>
        <td>
          <button class="btn btn-sm edit-payment-btn" data-summary-id="${row.summaryId}">
            <img src="${pencilIcon}" width="20" height="20">
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  function getFilteredRows() {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = allPaymentRows.filter(row =>
      row.clientName.toLowerCase().includes(query)
    );
    return sortRows(filtered, sortSelect.value);
  }

  function sortRows(rows, sortValue) {
    const arr = [...rows];
    if (sortValue === "name" || sortValue === "alpha") {
      arr.sort((a, b) => a.clientName.localeCompare(b.clientName));
    } else if (sortValue === "recent") {
      arr.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    }
    return arr;
  }

  searchInput.addEventListener("input", () => renderTable(getFilteredRows()));
  sortSelect.addEventListener("change", () => renderTable(getFilteredRows()));

  /* ===============================
     VIEW TRANSACTION HISTORY
  =============================== */
  function openHistoryOverlay(summaryId) {
    const row = allPaymentRows.find(r => r.summaryId === Number(summaryId));
    if (!row) return;

    document.getElementById("historyCustomerName").textContent = row.clientName;
    document.getElementById("historyTotalPrice").textContent = formatCurrency(row.totalAmount);

    const balanceEl = document.getElementById("historyBalance");
    balanceEl.textContent = formatCurrency(row.balance);
    balanceEl.style.color = row.balance > 0 ? "#D03038" : "#0a8f3c";

    const tbody = document.getElementById("historyTransactionBody");
    tbody.innerHTML = "";

    if (row.transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No transactions yet</td></tr>`;
    } else {
      const sorted = [...row.transactions].sort((a, b) => a.payment_number - b.payment_number);
      sorted.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.payment_number}</td>
          <td>${formatCurrency(t.paid_amount)}</td>
          <td>${formatDate(t.payment_date)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    historyOverlay.classList.remove("d-none");
  }

  /* ===============================
     EDIT TRANSACTION OVERLAY
  =============================== */
  function openEditOverlay(summaryId) {
    const row = allPaymentRows.find(r => r.summaryId === Number(summaryId));
    if (!row) return;

    currentEditSummaryId = row.summaryId;
    originalTransactions = [...row.transactions];

    document.getElementById("editCustomerName").textContent = row.clientName;
    document.getElementById("editTotalPrice").textContent = formatCurrency(row.totalAmount);

    const balanceEl = document.getElementById("editBalance");
    balanceEl.textContent = formatCurrency(row.balance);
    balanceEl.style.color = row.balance > 0 ? "#D03038" : "#0a8f3c";

    transactionsContainer.innerHTML = "";
    const sorted = [...row.transactions].sort((a, b) => a.payment_number - b.payment_number);
    sorted.forEach(t => {
      addTransactionRow(t.id, t.paid_amount, t.payment_date, t.payment_number);
    });

    editOverlay.classList.remove("d-none");
  }

  function addTransactionRow(transactionId = null, amount = "", date = "", paymentNumber = null) {
    const row = document.createElement("div");
    row.classList.add("transaction-row");
    if (transactionId) row.dataset.transactionId = transactionId;
    if (paymentNumber) row.dataset.paymentNumber = paymentNumber;

    let dateValue = "";
    if (date) {
      // API returns dates as "YYYY-MM-DD" which matches input[type=date]
      dateValue = String(date).split('T')[0];
    } else if (!transactionId) {
      // New row: default to today
      dateValue = getTodayString();
    }

    row.innerHTML = `
      <div>
        <label class="form-label">Amount (\u20B1)</label>
        <input type="number" class="form-control" value="${amount}" placeholder="0.00" step="0.01">
      </div>
      <div>
        <label class="form-label">Date</label>
        <input type="date" class="form-control" value="${dateValue}">
      </div>
      <button type="button" class="delete-transaction-btn">\uD83D\uDDD1</button>
    `;

    transactionsContainer.appendChild(row);
  }

  /* ===============================
     SAVE TRANSACTION CHANGES
  =============================== */
  async function saveTransactionChanges() {
    const rows = transactionsContainer.querySelectorAll(".transaction-row");
    const currentRows = [];

    rows.forEach(row => {
      const inputs = row.querySelectorAll("input");
      const amount = parseFloat(inputs[0].value) || 0;
      const date = inputs[1].value || getTodayString();

      if (amount <= 0) return; // skip empty/zero rows

      currentRows.push({
        transactionId: row.dataset.transactionId ? Number(row.dataset.transactionId) : null,
        paymentNumber: row.dataset.paymentNumber ? Number(row.dataset.paymentNumber) : null,
        amount,
        date
      });
    });

    // Determine what changed
    const currentIds = new Set(
      currentRows.filter(r => r.transactionId).map(r => r.transactionId)
    );

    const toDelete = originalTransactions.filter(t => !currentIds.has(t.id));
    const toCreate = currentRows.filter(r => !r.transactionId);
    const toUpdate = currentRows.filter(r => {
      if (!r.transactionId) return false;
      const orig = originalTransactions.find(t => t.id === r.transactionId);
      if (!orig) return false;
      return Number(orig.paid_amount) !== r.amount || orig.payment_date !== r.date;
    });

    const saveBtn = document.getElementById("saveTransactionBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      // Delete removed transactions
      for (const t of toDelete) {
        await apiFetch(`${TRANSACTIONS_URL}/${t.id}`, { method: "DELETE" });
      }

      // Update changed transactions
      for (const r of toUpdate) {
        await apiFetch(`${TRANSACTIONS_URL}/${r.transactionId}`, {
          method: "PATCH",
          body: JSON.stringify({
            paid_amount: r.amount,
            payment_date: r.date
          })
        });
      }

      // Create new transactions with auto-assigned payment_number
      let maxPaymentNumber = 0;
      currentRows.forEach(r => {
        if (r.paymentNumber && r.paymentNumber > maxPaymentNumber) {
          maxPaymentNumber = r.paymentNumber;
        }
      });
      // Also check originals in case all existing were deleted
      originalTransactions.forEach(t => {
        if (t.payment_number > maxPaymentNumber) {
          maxPaymentNumber = t.payment_number;
        }
      });

      for (const r of toCreate) {
        maxPaymentNumber++;
        await apiFetch(TRANSACTIONS_URL, {
          method: "POST",
          body: JSON.stringify({
            payment_summary_id: currentEditSummaryId,
            payment_number: maxPaymentNumber,
            paid_amount: r.amount,
            payment_date: r.date
          })
        });
      }

      editOverlay.classList.add("d-none");
      clearCache();
      await loadData();
    } catch (err) {
      console.error("Failed to save transactions:", err);
      alert("Failed to save transaction changes");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }

  /* ===============================
     EVENT LISTENERS
  =============================== */
  // Delegate clicks for dynamic table buttons
  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".view-transaction-btn");
    if (viewBtn) {
      openHistoryOverlay(viewBtn.dataset.summaryId);
      return;
    }

    const editBtn = e.target.closest(".edit-payment-btn");
    if (editBtn) {
      openEditOverlay(editBtn.dataset.summaryId);
      return;
    }
  });

  // Transaction history overlay - close
  document.getElementById("closeTransactionOverlay").addEventListener("click", () => {
    historyOverlay.classList.add("d-none");
  });
  document.getElementById("closeTransactionBtn").addEventListener("click", () => {
    historyOverlay.classList.add("d-none");
  });

  // Edit overlay - close
  document.getElementById("closeEditTransaction").addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });
  document.getElementById("cancelEditTransaction").addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  // Add transaction row
  document.getElementById("addTransactionBtn").addEventListener("click", () => {
    addTransactionRow();
  });

  // Delete transaction row (event delegation)
  transactionsContainer.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-transaction-btn");
    if (deleteBtn) {
      deleteBtn.closest(".transaction-row").remove();
    }
  });

  // Save changes
  document.getElementById("saveTransactionBtn").addEventListener("click", saveTransactionChanges);

  /* ===============================
     INIT
  =============================== */
  loadData();

});
