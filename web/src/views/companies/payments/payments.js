import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
const COMPANY_ID = localStorage.getItem("activeCompanyId");

let clientsMap = {};
let ordersMap = {};
let paymentSummaries = [];
let maxPaymentNumber = 0; // tracks highest payment_number for the open summary


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
  await loadOrders();
  await loadPaymentSummaries();

  setupSearchAndSort();
  setupOverlayControls();
});


/* ===============================
   LOAD CLIENTS
=============================== */
async function loadClients() {
  const url = `${FAST_API_URL}/clients/`;
  let clients = getFromCache(url);

  if (!clients) {
    const res = await apiFetch(url);
    clients = await res.json();
    saveToCache(url, clients);
  }

  clients
    .filter(c => String(c.company_id) === String(COMPANY_ID))
    .forEach(client => {
      clientsMap[client.id] = `${client.first_name} ${client.last_name}`;
    });
}


/* ===============================
   LOAD ORDERS
=============================== */
async function loadOrders() {
  const url = `${FAST_API_URL}/client-orders/`;
  let orders = getFromCache(url);

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
}


/* ===============================
   LOAD PAYMENT SUMMARIES
   Always fetches fresh — no cache
=============================== */
async function loadPaymentSummaries() {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = `
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  const res = await apiFetch(`${FAST_API_URL}/payment-summaries/`);
  paymentSummaries = await res.json();

  renderPaymentRows(paymentSummaries);
}


/* ===============================
   RENDER PAYMENT ROWS
=============================== */
function renderPaymentRows(summaries) {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = "";

  const visible = summaries.filter(s => ordersMap[s.client_order_id]);

  if (visible.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-muted">No payments found</td></tr>
    `;
    return;
  }

  visible.forEach(summary => {
    const order = ordersMap[summary.client_order_id];
    const clientName = clientsMap[order.client_id] || "-";
    const totalAmount = Number(order.price) * Number(order.quantity);

    const orderDate = order.order_date
      ? new Date(order.order_date).toLocaleDateString()
      : "-";

    const balanceClearedDate =
      summary.remaining_balance == 0
        ? new Date().toLocaleDateString()
        : "-";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${clientName}</td>
      <td>₱${totalAmount.toLocaleString()}</td>
      <td>${orderDate}</td>
      <td class="${summary.remaining_balance > 0 ? 'text-danger' : 'text-success'}">
        ₱${Number(summary.remaining_balance).toLocaleString()}
      </td>
      <td>${balanceClearedDate}</td>
      <td>
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
      </td>
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

    if (sortValue === "name" || sortValue === "alpha") {
      result.sort((a, b) => {
        const nameA = clientsMap[ordersMap[a.client_order_id]?.client_id] || "";
        const nameB = clientsMap[ordersMap[b.client_order_id]?.client_id] || "";
        return nameA.localeCompare(nameB);
      });
    } else if (sortValue === "recent") {
      result.sort((a, b) =>
        (ordersMap[b.client_order_id]?.id || 0) - (ordersMap[a.client_order_id]?.id || 0)
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
      document.getElementById("historyTotalPrice").innerText =
        "₱" + totalPrice.toLocaleString();
      document.getElementById("historyBalance").innerText =
        "₱" + Number(summary.remaining_balance).toLocaleString();

      const tableBody = document.getElementById("historyTransactionsBody");
      tableBody.innerHTML = `
        <tr><td colspan="3" class="text-center">
          <div class="spinner-border spinner-border-sm"></div>
        </td></tr>
      `;

      document.getElementById("transactionHistoryOverlay").classList.remove("d-none");

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
          <td>₱${Number(t.paid_amount).toLocaleString()}</td>
          <td>${new Date(t.payment_date).toLocaleDateString()}</td>
        `;
        tableBody.appendChild(row);
      });
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
  const clientName = clientsMap[order.client_id];
  const totalPrice = Number(order.price) * Number(order.quantity);

  const editOverlay = document.getElementById("editTransactionOverlay");
  editOverlay.dataset.summaryId = summaryId;

  document.getElementById("editCustomerName").innerText = clientName;
  document.getElementById("editTotalPrice").innerText = "₱" + totalPrice.toLocaleString();
  document.getElementById("editCurrentBalance").innerText =
    "₱" + Number(summary.remaining_balance).toLocaleString();

  clearEditError();

  const container = document.getElementById("transactionsContainer");
  container.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm"></div>
    </div>
  `;

  editOverlay.classList.remove("d-none");

  // Fetch transactions for this summary
  const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
  const transactions = await res.json();
  const filtered = transactions.filter(t => t.payment_summary_id == summaryId);

  // Track highest payment_number to avoid conflicts when adding new ones
  maxPaymentNumber = filtered.reduce((max, t) => Math.max(max, t.payment_number ?? 0), 0);

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
}


/* ===============================
   BUILD EXISTING (READ-ONLY) ROW
=============================== */
function buildExistingRow(t) {
  const row = document.createElement("div");
  row.classList.add("transaction-row");
  row.dataset.transactionId = t.id;

  row.innerHTML = `
    <div>
      <label class="form-label">Amount (₱)</label>
      <input type="number" class="form-control" value="${t.paid_amount}" readonly tabindex="-1">
    </div>
    <div>
      <label class="form-label">Date</label>
      <input type="date" class="form-control" value="${t.payment_date}" readonly tabindex="-1">
    </div>
    <button type="button" class="delete-transaction-btn" data-id="${t.id}">🗑</button>
  `;

  return row;
}


/* ===============================
   OVERLAY CONTROLS
=============================== */
function setupOverlayControls() {

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
    editOverlay.classList.add("d-none");
    clearEditError();
  }

  document.getElementById("closeEditTransaction")?.addEventListener("click", closeEdit);
  document.getElementById("cancelEditTransaction")?.addEventListener("click", closeEdit);


  /* ---- Add new transaction row ---- */
  document.getElementById("addTransactionBtn")?.addEventListener("click", () => {
    clearEditError();

    const container = document.getElementById("transactionsContainer");

    // Remove the empty-state message if present
    const emptyMsg = container.querySelector("p.text-muted");
    if (emptyMsg) emptyMsg.remove();

    const row = document.createElement("div");
    row.classList.add("transaction-row", "transaction-row-new");

    row.innerHTML = `
      <div>
        <label class="form-label">Amount (₱)</label>
        <input type="number" class="form-control" placeholder="0.00" min="0.01" step="0.01">
      </div>
      <div>
        <label class="form-label">Date</label>
        <input type="date" class="form-control">
      </div>
      <button type="button" class="delete-transaction-btn">🗑</button>
    `;

    container.appendChild(row);
    row.querySelector("input[type='number']").focus();
  });


  /* ---- Delete button (event delegation) ---- */
  document.getElementById("transactionsContainer")
    ?.addEventListener("click", async (e) => {

      const btn = e.target.closest(".delete-transaction-btn");
      if (!btn) return;

      clearEditError();

      const transactionId = btn.dataset.id;

      if (transactionId) {
        // Existing transaction — delete from backend
        btn.disabled = true;
        btn.textContent = "⏳";

        const res = await apiFetch(
          `${FAST_API_URL}/payment-transactions/${transactionId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          btn.disabled = false;
          btn.textContent = "🗑";
          showEditError("Failed to delete transaction. Please try again.");
          return;
        }

        btn.closest(".transaction-row").remove();

        // Refresh summaries and update balance display
        await loadPaymentSummaries();

        const summaryId = editOverlay.dataset.summaryId;
        const fresh = paymentSummaries.find(s => s.id == summaryId);
        if (fresh) {
          document.getElementById("editCurrentBalance").innerText =
            "₱" + Number(fresh.remaining_balance).toLocaleString();
        }

        // Show empty state if no rows remain
        const container = document.getElementById("transactionsContainer");
        if (!container.querySelector(".transaction-row")) {
          container.innerHTML = `
            <p class="text-muted text-center small mb-0">
              No transactions yet. Click "+ Add Transaction" to add one.
            </p>
          `;
        }

      } else {
        // New (unsaved) row — just remove from DOM
        btn.closest(".transaction-row").remove();
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

      const newRows = Array.from(
        document.querySelectorAll("#transactionsContainer .transaction-row-new")
      );

      if (newRows.length === 0) {
        showEditError("No new transactions to save.");
        return;
      }

      // Validate all new rows
      let newTotal = 0;
      for (const row of newRows) {
        const amountInput = row.querySelector("input[type='number']");
        const dateInput = row.querySelector("input[type='date']");
        const amount = parseFloat(amountInput.value);
        const paymentDate = dateInput.value;

        if (!amount || amount <= 0) {
          showEditError("Payment amount must be greater than 0.");
          amountInput.focus();
          return;
        }

        if (!paymentDate) {
          showEditError("Please select a payment date.");
          dateInput.focus();
          return;
        }

        newTotal += amount;
      }

      if (newTotal > Number(summary.remaining_balance)) {
        showEditError(
          `Total new payments (₱${newTotal.toLocaleString()}) exceed the ` +
          `remaining balance (₱${Number(summary.remaining_balance).toLocaleString()}).`
        );
        newRows[newRows.length - 1].querySelector("input[type='number']").focus();
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

        for (let i = 0; i < newRows.length; i++) {
          const amountInput = newRows[i].querySelector("input[type='number']");
          const dateInput = newRows[i].querySelector("input[type='date']");
          const amount = parseFloat(amountInput.value);
          const paymentDate = dateInput.value;

          // Use maxPaymentNumber to avoid collisions with existing records
          const response = await apiFetch(`${FAST_API_URL}/payment-transactions/`, {
            method: "POST",
            body: JSON.stringify({
              payment_summary_id: parseInt(summaryId),
              payment_number: maxPaymentNumber + i + 1,
              paid_amount: amount,
              payment_date: paymentDate
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            showEditError(errorData.detail || "Failed to save payment.");
            amountInput.focus();
            return;
          }
        }

        // Success — refresh table and close overlay
        await loadPaymentSummaries();
        editOverlay.classList.add("d-none");

      } catch (err) {
        console.error("Failed to save transactions:", err);
        showEditError("Failed to save transactions. Please try again.");
      } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        closeBtn.disabled = false;
        addBtn.disabled = false;
      }
    });
}
