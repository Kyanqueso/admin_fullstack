import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const COMPANY_ID = localStorage.getItem("activeCompanyId");

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
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Sets balance text and applies red (owed) or light-green (cleared) colour to the span
function renderBalance(spanEl, amount) {
  spanEl.textContent = formatCurrency(amount);
  const isPaid = Number(amount) === 0;
  spanEl.className = isPaid ? 'text-balance-paid' : 'text-balance-owed';
}

let clientsMap = {};
let ordersMap = {};
let paymentSummaries = [];
let formIsDirty = false;
let currentTab = 'active';


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

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData.detail) {
        errorMsg = Array.isArray(errData.detail)
          ? errData.detail.map(e => e.msg || JSON.stringify(e)).join(", ")
          : errData.detail;
      }
    } catch { /* non-JSON body */ }
    throw new Error(errorMsg);
  }

  return response;
}


/* ===============================
   LOAD COMPANY NAME
=============================== */
async function loadCompanyName() {
  const heading = document.getElementById("companyTitle");
  const url = `${FAST_API_URL}/companies/${COMPANY_ID}`;

  const cached = getFromCache(url);
  if (cached) {
    heading.textContent = `${cached.name}'s Client Payment List`;
    return;
  }

  try {
    const response = await apiFetch(url);
    const company = await response.json();
    saveToCache(url, company);
    heading.textContent = `${company.name}'s Client Payment List`;
  } catch (error) {
    console.error("Failed to load company name:", error);
  }
}


/* ===============================
   INIT
=============================== */
function setTabUI(tab) {
  const activeBtn = document.getElementById('activeTabBtn');
  const archiveBtn = document.getElementById('archiveTabBtn');
  activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
  archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
}

async function switchTab(tab) {
  if (currentTab === tab) return;
  currentTab = tab;
  setTabUI(tab);
  clearCache();
  await loadOrders(tab === 'archive');
  await loadPaymentSummaries();
}

document.addEventListener("DOMContentLoaded", async () => {

  if (!COMPANY_ID) {
    window.location.href = "../companies.html";
    return;
  }

  document.getElementById("paymentsTableBody").innerHTML = `
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  loadCompanyName();
  await loadClients();
  await loadOrders(false);
  await loadPaymentSummaries();
  setTabUI('active');

  document.getElementById('activeTabBtn')?.addEventListener('click', () => switchTab('active'));
  document.getElementById('archiveTabBtn')?.addEventListener('click', () => switchTab('archive'));

  setupSearchAndSort();
  setupOverlayControls();
});


/* ===============================
   LOAD CLIENTS
   Always loads both active and archived so name lookups work on both tabs
=============================== */
async function loadClients() {
  try {
    const [res1, res2] = await Promise.all([
      apiFetch(`${FAST_API_URL}/clients/?company_id=${COMPANY_ID}`),
      apiFetch(`${FAST_API_URL}/clients/?company_id=${COMPANY_ID}&archived=true`)
    ]);
    const [active, archived] = await Promise.all([res1.json(), res2.json()]);
    clientsMap = {};
    [...active, ...archived].forEach(c => {
      clientsMap[c.id] = `${c.first_name} ${c.last_name}`;
    });
  } catch (err) {
    console.error("Failed to load clients:", err);
  }
}


/* ===============================
   LOAD ORDERS
=============================== */
async function loadOrders(archived = false) {
  ordersMap = {};
  const url = `${FAST_API_URL}/client-orders/?archived=${archived}`;
  let orders = getFromCache(url);

  try {
    if (!orders) {
      const res = await apiFetch(url);
      orders = await res.json();
      saveToCache(url, orders);
    }

    orders
      .filter(order => clientsMap[order.client_id] !== undefined)
      .forEach(order => {
        ordersMap[order.id] = order;
      });
  } catch (err) {
    console.error("Failed to load orders:", err);
  }
}


/* ===============================
   LOAD PAYMENT SUMMARIES
=============================== */
async function loadPaymentSummaries() {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = `
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  try {
    const archived = currentTab === 'archive';
    const res = await apiFetch(`${FAST_API_URL}/payment-summaries/?archived=${archived}`);
    paymentSummaries = await res.json();
    renderPaymentRows(paymentSummaries);
  } catch (err) {
    console.error("Failed to load payment summaries:", err);
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-danger">Failed to load payments. Please refresh.</td></tr>
    `;
  }
}


/* ===============================
   RENDER PAYMENT ROWS
=============================== */
function renderPaymentRows(summaries) {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = "";

  const visible = summaries.filter(s => ordersMap[s.client_order_id]);

  const isArchive = currentTab === 'archive';

  if (visible.length === 0) {
    const label = isArchive ? 'archived payments' : 'payments';
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-muted">No ${label} found</td></tr>
    `;
    return;
  }

  // Update table header for archive tab
  const ths = document.querySelectorAll('thead th');
  if (isArchive) {
    if (ths[6]) ths[6].textContent = 'Transaction History';
    if (ths[7]) ths[7].textContent = '';
  } else {
    if (ths[6]) ths[6].textContent = 'Transaction History';
    if (ths[7]) ths[7].textContent = 'Edit';
  }

  visible.forEach(summary => {
    const order = ordersMap[summary.client_order_id];
    const clientName = escapeHtml(clientsMap[order.client_id] || "-");
    const totalAmount = Number(order.price) * Number(order.quantity);

    const orderDate = order.order_date
      ? new Date(order.order_date).toLocaleDateString()
      : "-";

    const balanceClearedDate =
      summary.remaining_balance == 0 && order.dateCompleted
        ? new Date(order.dateCompleted).toLocaleDateString()
        : "-";

    const actionCell = isArchive
      ? `<td>
          <button class="btn btn-sm text-white view-transaction-btn"
            data-summary-id="${summary.id}"
            style="background-color: var(--color-primary);">
            👁 View
          </button>
        </td>
        <td></td>`
      : `<td>
          <button class="btn btn-sm text-white view-transaction-btn"
            data-summary-id="${summary.id}"
            style="background-color: var(--color-primary);">
            👁 View
          </button>
        </td>
        <td>
          <button class="btn btn-sm edit-payment-btn"
            data-summary-id="${summary.id}">
            <img src="${pencilIcon}" width="18">
          </button>
        </td>`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${clientName}</td>
      <td>${formatCurrency(totalAmount)}</td>
      <td>${orderDate}</td>
      <td class="${summary.remaining_balance > 0 ? 'text-balance-owed' : 'text-balance-paid'}">
        ${formatCurrency(summary.remaining_balance)}
      </td>
      <td>${balanceClearedDate}</td>
      ${actionCell}
    `;

    tbody.appendChild(row);
  });

  attachDynamicHandlers();
}


/* ===============================
   SEARCH & SORT
=============================== */
function setupSearchAndSort() {
  const searchInput = document.querySelector('input[placeholder="Search name"]');
  const sortSelect = document.querySelector('.form-select');

  function applySearchAndSort() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const sortValue = sortSelect?.value || "";

    let result = paymentSummaries.filter(s => {
      const order = ordersMap[s.client_order_id];
      if (!order) return false;
      const clientName = (clientsMap[order.client_id] || "").toLowerCase();
      return clientName.includes(query);
    });

    if (sortValue === "az") {
      result.sort((a, b) => {
        const nameA = clientsMap[ordersMap[a.client_order_id]?.client_id] || "";
        const nameB = clientsMap[ordersMap[b.client_order_id]?.client_id] || "";
        return nameA.localeCompare(nameB);
      });
    } else if (sortValue === "za") {
      result.sort((a, b) => {
        const nameA = clientsMap[ordersMap[a.client_order_id]?.client_id] || "";
        const nameB = clientsMap[ordersMap[b.client_order_id]?.client_id] || "";
        return nameB.localeCompare(nameA);
      });
    } else if (sortValue === "recent") {
      result.sort((a, b) =>
        (ordersMap[b.client_order_id]?.id || 0) - (ordersMap[a.client_order_id]?.id || 0)
      );
    } else if (sortValue === "oldest") {
      result.sort((a, b) =>
        (ordersMap[a.client_order_id]?.id || 0) - (ordersMap[b.client_order_id]?.id || 0)
      );
    }

    renderPaymentRows(result);
  }

  searchInput?.addEventListener("input", applySearchAndSort);
  sortSelect?.addEventListener("change", applySearchAndSort);
}


/* ===============================
   INLINE ERROR HELPERS
=============================== */
function showEditError(msg) {
  const el = document.getElementById("editErrorMsg");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("d-none");
}

function clearEditError() {
  const el = document.getElementById("editErrorMsg");
  if (!el) return;
  el.textContent = "";
  el.classList.add("d-none");
}


/* ===============================
   ATTACH TABLE BUTTON HANDLERS
=============================== */
function attachDynamicHandlers() {

  /* VIEW TRANSACTION HISTORY */
  document.querySelectorAll(".view-transaction-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const summaryId = btn.dataset.summaryId;
      const summary = paymentSummaries.find(s => s.id == summaryId);
      const order = ordersMap[summary.client_order_id];
      const clientName = clientsMap[order.client_id];
      const totalPrice = Number(order.price) * Number(order.quantity);

      document.getElementById("historyCustomerName").innerText = clientName;
      document.getElementById("historyTotalPrice").innerText = formatCurrency(totalPrice);
      renderBalance(document.getElementById("historyBalance"), summary.remaining_balance);

      const tableBody = document.getElementById("historyTransactionsBody");
      tableBody.innerHTML = `
        <tr><td colspan="3" class="text-center">
          <div class="spinner-border spinner-border-sm"></div>
        </td></tr>
      `;

      document.getElementById("transactionHistoryOverlay").classList.remove("d-none");

      try {
        const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
        const transactions = await res.json();
        const filtered = transactions.filter(t => t.payment_summary_id == summaryId);

        tableBody.innerHTML = "";

        if (filtered.length === 0) {
          tableBody.innerHTML = `
            <tr><td colspan="3" class="text-center text-muted">No transactions yet</td></tr>
          `;
          return;
        }

        filtered.forEach((t, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatCurrency(t.paid_amount)}</td>
            <td>${new Date(t.payment_date + 'T00:00:00').toLocaleDateString()}</td>
          `;
          tableBody.appendChild(row);
        });
      } catch (err) {
        tableBody.innerHTML = `
          <tr><td colspan="3" class="text-danger text-center">
            Failed to load transactions: ${escapeHtml(err.message)}
          </td></tr>
        `;
      }
    });
  });

  /* OPEN EDIT OVERLAY */
  document.querySelectorAll(".edit-payment-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditOverlay(btn.dataset.summaryId));
  });
}


/* ===============================
   OPEN EDIT OVERLAY
=============================== */
async function openEditOverlay(summaryId) {
  const summary = paymentSummaries.find(s => s.id == summaryId);
  if (!summary) return;

  const order = ordersMap[summary.client_order_id];
  if (!order) return;
  const clientName = clientsMap[order.client_id];
  const totalPrice = Number(order.price) * Number(order.quantity);

  const editOverlay = document.getElementById("editTransactionOverlay");
  editOverlay.dataset.summaryId = summaryId;

  document.getElementById("editCustomerName").innerText = clientName;
  document.getElementById("editTotalPrice").innerText = formatCurrency(totalPrice);
  renderBalance(document.getElementById("editCurrentBalance"), summary.remaining_balance);

  clearEditError();

  const container = document.getElementById("transactionsContainer");
  container.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm"></div>
    </div>
  `;

  editOverlay.classList.remove("d-none");
  setFormDirty();

  try {
    const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
    const transactions = await res.json();
    const filtered = transactions.filter(t => t.payment_summary_id == summaryId);

    container.innerHTML = "";

    if (filtered.length === 0) {
      container.innerHTML = `
        <p class="text-muted text-center small mb-0">
          No transactions yet. Click "+ Add Transaction" to add one.
        </p>
      `;
    } else {
      filtered.forEach(t => container.appendChild(buildExistingRow(t)));
    }
  } catch (err) {
    console.error("Failed to load transactions:", err);
    container.innerHTML = `
      <p class="text-danger text-center small mb-0">
        Failed to load transactions. Please close and try again.
      </p>
    `;
  }

  // Sync button state after existing rows are rendered
  const addBtn = document.getElementById("addTransactionBtn");
  if (addBtn) {
    const atLimit = container.querySelectorAll(".transaction-row").length >= 3;
    addBtn.disabled = atLimit;
    addBtn.title = atLimit ? "Maximum 3 transactions allowed" : "";
  }
}


/* ===============================
   BUILD EXISTING (EDITABLE) ROW
   ✅ FIXED: inputs are now editable — removed readonly
=============================== */
function buildExistingRow(t) {
  const row = document.createElement("div");
  row.classList.add("transaction-row", "transaction-row-existing");
  row.dataset.transactionId = t.id;

  const today = new Date().toISOString().split("T")[0];

  row.innerHTML = `
    <div>
      <label class="form-label">Amount (₱)</label>
      <input type="text" inputmode="decimal" class="form-control existing-amount"
        value="${t.paid_amount}"
        placeholder="0.00">
    </div>
    <div>
      <label class="form-label">Date</label>
      <input type="date" class="form-control existing-date"
        value="${t.payment_date}"
        max="${today}">
    </div>
    <button type="button" class="delete-transaction-btn" data-id="${t.id}">🗑</button>
  `;

  // Enforce max 2 decimal places
  const amountInput = row.querySelector(".existing-amount");
  amountInput.addEventListener("input", () => {
    let val = amountInput.value.replace(/[^0-9.]/g, "");
    const parts = val.split(".");
    if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 2) val = parts[0] + "." + parts[1].slice(0, 2);
    amountInput.value = val;
  });

  return row;
}


/* ===============================
   REFRESH WARNING HELPERS
=============================== */
function handleBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
function setFormDirty() { formIsDirty = true; window.addEventListener('beforeunload', handleBeforeUnload); }
function setFormClean() { formIsDirty = false; window.removeEventListener('beforeunload', handleBeforeUnload); }

/* ===============================
   OVERLAY CONTROLS
=============================== */
function setupOverlayControls() {

  /* ---- Refresh warning ---- */
  const refreshWarningOverlay = document.getElementById('refresh-warning-overlay');
  function showRefreshWarning() { refreshWarningOverlay.classList.remove('d-none'); }
  function hideRefreshWarning() { refreshWarningOverlay.classList.add('d-none'); }
  document.getElementById('refresh-stay').addEventListener('click', hideRefreshWarning);
  document.getElementById('refresh-leave').addEventListener('click', () => {
    setFormClean();
    hideRefreshWarning();
    location.reload();
  });
  window.addEventListener('keydown', (e) => {
    if (!formIsDirty) return;
    const isReload = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r';
    const isHardReload = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r';
    if (!isReload && !isHardReload) return;
    e.preventDefault();
    showRefreshWarning();
  }, true);

  /* ---- History overlay ---- */
  document.getElementById("closeTransactionOverlay")
    ?.addEventListener("click", () => {
      document.getElementById("transactionHistoryOverlay").classList.add("d-none");
    });

  document.getElementById("closeTransactionBtn")
    ?.addEventListener("click", () => {
      document.getElementById("transactionHistoryOverlay").classList.add("d-none");
    });

  /* ---- Edit overlay ---- */
  const editOverlay = document.getElementById("editTransactionOverlay");

  function closeEdit() {
    setFormClean();
    editOverlay.classList.add("d-none");
    clearEditError();
  }

  document.getElementById("closeEditTransaction")?.addEventListener("click", closeEdit);
  document.getElementById("cancelEditTransaction")?.addEventListener("click", closeEdit);

  /* ---- Transaction count helper ---- */
  function countTransactionRows() {
    return document.querySelectorAll("#transactionsContainer .transaction-row").length;
  }

  function updateAddBtnState() {
    const addBtn = document.getElementById("addTransactionBtn");
    if (!addBtn) return;
    const atLimit = countTransactionRows() >= 3;
    addBtn.disabled = atLimit;
    addBtn.title = atLimit ? "Maximum 3 transactions allowed" : "";
  }

  /* ---- Add new transaction row ---- */
  document.getElementById("addTransactionBtn")?.addEventListener("click", () => {
    clearEditError();
    if (countTransactionRows() >= 3) {
      showEditError("Maximum 3 transactions allowed.");
      return;
    }

    const container = document.getElementById("transactionsContainer");
    const emptyMsg = container.querySelector("p.text-muted");
    if (emptyMsg) emptyMsg.remove();

    const today = new Date().toISOString().split("T")[0];

    const row = document.createElement("div");
    row.classList.add("transaction-row", "transaction-row-new");

    row.innerHTML = `
      <div>
        <label class="form-label">Amount (₱)</label>
        <input type="text" inputmode="decimal" class="form-control new-amount"
          placeholder="0.00">
      </div>
      <div>
        <label class="form-label">Date</label>
        <input type="date" class="form-control" value="${today}" max="${today}">
      </div>
      <button type="button" class="delete-transaction-btn">🗑</button>
    `;

    const amountInput = row.querySelector(".new-amount");
    const dateInput = row.querySelector("input[type='date']");

    amountInput.addEventListener("input", () => {
      let val = amountInput.value.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
      if (parts.length === 2 && parts[1].length > 2) val = parts[0] + "." + parts[1].slice(0, 2);
      amountInput.value = val;
    });

    dateInput.addEventListener("change", () => {
      const val = dateInput.value;
      if (!val) return;
      const year = parseInt(val.split("-")[0], 10);
      if (year > 9999 || val > today) dateInput.value = today;
    });

    container.appendChild(row);
    updateAddBtnState();
    amountInput.focus();
  });


  /* ---- Delete button (event delegation) ---- */
  document.getElementById("transactionsContainer")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".delete-transaction-btn");
      if (!btn) return;

      clearEditError();
      const transactionId = btn.dataset.id;

      if (transactionId) {
        btn.disabled = true;
        btn.textContent = "⏳";

        try {
          await apiFetch(
            `${FAST_API_URL}/payment-transactions/${transactionId}`,
            { method: "DELETE" }
          );
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "🗑";
          showEditError(err.message || "Failed to delete transaction. Please try again.");
          return;
        }

        btn.closest(".transaction-row").remove();
        await loadPaymentSummaries();

        const summaryId = editOverlay.dataset.summaryId;
        const fresh = paymentSummaries.find(s => s.id == summaryId);
        if (fresh) {
          renderBalance(document.getElementById("editCurrentBalance"), fresh.remaining_balance);
        }

        const container = document.getElementById("transactionsContainer");
        if (!container.querySelector(".transaction-row")) {
          container.innerHTML = `
            <p class="text-muted text-center small mb-0">
              No transactions yet. Click "+ Add Transaction" to add one.
            </p>
          `;
        }
        updateAddBtnState();
      } else {
        btn.closest(".transaction-row").remove();
        updateAddBtnState();
      }
    });


  /* ---- Save transactions ---- */
  document.getElementById("saveTransactionsBtn")
    ?.addEventListener("click", async () => {
      clearEditError();

      const summaryId = editOverlay.dataset.summaryId;
      if (!summaryId) return;

      const summary = paymentSummaries.find(s => s.id == summaryId);
      if (!summary) return;

      const today = new Date().toISOString().split("T")[0];

      const existingRows = Array.from(
        document.querySelectorAll("#transactionsContainer .transaction-row-existing")
      );
      const newRows = Array.from(
        document.querySelectorAll("#transactionsContainer .transaction-row-new")
      );

      if (existingRows.length === 0 && newRows.length === 0) {
        showEditError("No transactions to save.");
        return;
      }

      // Validate a single amount+date pair; returns true if valid
      function validateRow(amountInput, dateInput) {
        const amount = parseFloat(amountInput.value);
        const paymentDate = dateInput.value;

        if (!amountInput.value || isNaN(amount) || amount <= 0) {
          showEditError("Payment amount must be greater than ₱0.");
          amountInput.focus();
          return false;
        }
        if (amount < 0.01) {
          showEditError("Payment amount must be at least ₱0.01.");
          amountInput.focus();
          return false;
        }
        const dec = amountInput.value.split(".")[1] || "";
        if (dec.length > 2) {
          showEditError("Amount cannot have more than 2 decimal places.");
          amountInput.focus();
          return false;
        }
        if (!paymentDate) {
          showEditError("Please select a payment date.");
          dateInput.focus();
          return false;
        }
        if (paymentDate > today) {
          showEditError("Payment date cannot be in the future.");
          dateInput.focus();
          return false;
        }
        const year = parseInt(paymentDate.split("-")[0], 10);
        if (year < 2000 || year > 9999) {
          showEditError("Please enter a valid payment date.");
          dateInput.focus();
          return false;
        }
        return true;
      }

      for (const row of existingRows) {
        if (!validateRow(row.querySelector(".existing-amount"), row.querySelector(".existing-date"))) return;
      }
      for (const row of newRows) {
        const amountInput = row.querySelector(".new-amount");
        const dateInput = row.querySelector("input[type='date']");
        if (!validateRow(amountInput, dateInput)) return;
      }

      // Overpayment check: sum of ALL rows (existing edits + new) must not exceed order total
      const order = ordersMap[summary.client_order_id];
      const orderTotal = Math.round(Number(order.price) * Number(order.quantity) * 100) / 100;

      let existingTotal = 0;
      for (const row of existingRows) {
        existingTotal += parseFloat(row.querySelector(".existing-amount").value);
      }
      let newTotal = 0;
      for (const row of newRows) {
        newTotal += parseFloat(row.querySelector(".new-amount").value);
      }
      const grandTotal = Math.round((existingTotal + newTotal) * 100) / 100;

      if (grandTotal > orderTotal + 0.009) {
        showEditError(
          `Total payments (${formatCurrency(grandTotal)}) would exceed the order total (${formatCurrency(orderTotal)}).`
        );
        return;
      }

      const totalRowCount = existingRows.length + newRows.length;
      if (totalRowCount >= 3 && grandTotal < orderTotal - 0.009) {
        showEditError(
          `The 3rd (final) payment must fully settle the balance. ` +
          `Remaining unpaid: ${formatCurrency(orderTotal - grandTotal)}.`
        );
        return;
      }

      const saveBtn = document.getElementById("saveTransactionsBtn");
      const cancelBtn = document.getElementById("cancelEditTransaction");
      const closeBtn = document.getElementById("closeEditTransaction");
      const addBtn = document.getElementById("addTransactionBtn");
      const originalText = saveBtn.textContent;

      try {
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        closeBtn.disabled = true;
        addBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        // PATCH existing edited transactions
        for (const row of existingRows) {
          const transactionId = row.dataset.transactionId;
          const amount = Math.round(parseFloat(row.querySelector(".existing-amount").value) * 100) / 100;
          const paymentDate = row.querySelector(".existing-date").value;

          await apiFetch(
            `${FAST_API_URL}/payment-transactions/${transactionId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ paid_amount: amount, payment_date: paymentDate })
            }
          );
        }

        // POST new transactions — let backend auto-assign payment_number
        for (const row of newRows) {
          const amount = Math.round(parseFloat(row.querySelector(".new-amount").value) * 100) / 100;
          const paymentDate = row.querySelector("input[type='date']").value;

          await apiFetch(`${FAST_API_URL}/payment-transactions/`, {
            method: "POST",
            body: JSON.stringify({
              payment_summary_id: parseInt(summaryId),
              paid_amount: amount,
              payment_date: paymentDate
            })
          });
        }

        await loadPaymentSummaries();
        setFormClean();
        editOverlay.classList.add("d-none");

      } catch (err) {
        console.error("Failed to save transactions:", err);
        showEditError(err.message || "Failed to save transactions. Please try again.");
      } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        closeBtn.disabled = false;
        addBtn.disabled = false;
      }
    });
}