import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import { getFromCache, saveToCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const COMPANY_ID = localStorage.getItem("activeCompanyId");

let clientsMap = {};
let ordersMap = {};
let paymentSummaries = [];
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
   TAB SETUP
=============================== */
function setTabUI(tab) {
  const activeBtn = document.getElementById('activeTabBtn');
  const archiveBtn = document.getElementById('archiveTabBtn');
  activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
  archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
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

  // Tab wiring
  document.getElementById('activeTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'active') return;
    currentTab = 'active';
    setTabUI('active');
    await loadClients();
    await loadOrders();
    await loadPaymentSummaries();
  });

  document.getElementById('archiveTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'archive') return;
    currentTab = 'archive';
    setTabUI('archive');
    await loadClients(true);
    await loadOrders();
    await loadPaymentSummaries();
  });
});


/* ===============================
   LOAD CLIENTS
=============================== */
async function loadClients(archived = false) {
  if (archived) {
    // For archive tab: load both active AND archived clients for name display
    try {
      const [res1, res2] = await Promise.all([
        apiFetch(`${FAST_API_URL}/clients/?company_id=${COMPANY_ID}`),
        apiFetch(`${FAST_API_URL}/clients/?company_id=${COMPANY_ID}&archived=true`)
      ]);
      const [active, archivedClients] = await Promise.all([res1.json(), res2.json()]);
      clientsMap = {};
      [...active, ...archivedClients].forEach(client => {
        clientsMap[client.id] = `${client.first_name} ${client.last_name}`;
      });
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  } else {
    // Active tab: load only active clients for this company
    const url = `${FAST_API_URL}/clients/?company_id=${COMPANY_ID}`;
    let clients = getFromCache(url);

    if (!clients) {
      const res = await apiFetch(url);
      clients = await res.json();
      saveToCache(url, clients);
    }

    clientsMap = {};
    clients.forEach(client => {
      clientsMap[client.id] = `${client.first_name} ${client.last_name}`;
    });
  }
}


/* ===============================
   LOAD ORDERS
=============================== */
async function loadOrders() {
  let url;
  if (currentTab === 'archive') {
    url = `${FAST_API_URL}/client-orders/?archived=true&completed=false`;
  } else {
    url = `${FAST_API_URL}/client-orders/?completed=false`;
  }

  const cached = currentTab === 'active' ? getFromCache(url) : null;
  let orders = cached;

  if (!orders) {
    const res = await apiFetch(url);
    orders = await res.json();
    if (currentTab === 'active') saveToCache(url, orders);
  }

  ordersMap = {};
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

  let summariesUrl = `${FAST_API_URL}/payment-summaries/`;
  if (currentTab === 'archive') {
    summariesUrl = `${FAST_API_URL}/payment-summaries/?archived=true`;
  }

  const res = await apiFetch(summariesUrl);
  paymentSummaries = await res.json();

  // Also refresh ordersMap so stale deleted orders don't persist
  let ordersUrl;
  if (currentTab === 'archive') {
    ordersUrl = `${FAST_API_URL}/client-orders/?archived=true&completed=false`;
  } else {
    ordersUrl = `${FAST_API_URL}/client-orders/?completed=false`;
  }
  const ordersRes = await apiFetch(ordersUrl);
  const freshOrders = await ordersRes.json();
  ordersMap = {};
  freshOrders
    .filter(order => clientsMap[order.client_id] !== undefined)
    .forEach(order => {
      ordersMap[order.id] = order;
    });

  renderPaymentRows(paymentSummaries);
}


/* ===============================
   RENDER PAYMENT ROWS
=============================== */
function renderPaymentRows(summaries) {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = "";

  // filter out summaries whose order has already been completed (deleted from ordersMap)
  const visible = summaries.filter(s => ordersMap[s.client_order_id]);

  if (visible.length === 0) {
    const label = currentTab === 'archive' ? 'archived payments' : 'payments';
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-muted">No ${label} found</td></tr>
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
      summary.remaining_balance == 0 && order.dateCompleted
        ? new Date(order.dateCompleted).toLocaleDateString()
        : "-";

    const row = document.createElement("tr");

    if (currentTab === 'archive') {
      // Archive tab: show view button only, no edit button
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
        <td>-</td>
      `;
    } else {
      // Active tab: show view + edit buttons
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
    }

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

      // guard — order may have been completed and removed from ordersMap
      const order = ordersMap[summary.client_order_id];
      if (!order) {
        await loadPaymentSummaries();
        showOrderCompletedBanner();
        return;
      }

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


  /* OPEN EDIT OVERLAY (active tab only) */
  document.querySelectorAll(".edit-payment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const summaryId = btn.dataset.summaryId;
      const summary = paymentSummaries.find(s => s.id == summaryId);

      // guard — if order was just completed and removed, refresh instead of opening edit
      if (!ordersMap[summary?.client_order_id]) {
        await loadPaymentSummaries();
        showOrderCompletedBanner();
        return;
      }

      openEditOverlay(summaryId);
    });
  });
}


// helper banner shown when an order was completed between renders
function showOrderCompletedBanner() {
  const existing = document.querySelector(".order-completed-banner");
  if (existing) return;

  const banner = document.createElement("div");
  banner.className = "alert alert-success alert-dismissible fade show mx-0 mt-2 order-completed-banner";
  banner.innerHTML = `Order has been completed and moved to Completed Orders.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.querySelector("h2").insertAdjacentElement("afterend", banner);
}


/* ===============================
   OPEN EDIT OVERLAY
=============================== */
async function openEditOverlay(summaryId) {
  const summary = paymentSummaries.find(s => s.id == summaryId);
  if (!summary) return;

  const order = ordersMap[summary.client_order_id];

  // guard — order may have been completed already
  if (!order) {
    await loadPaymentSummaries();
    showOrderCompletedBanner();
    return;
  }

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

        // if order was completed by this deletion (edge case), close overlay
        if (!fresh || !ordersMap[fresh.client_order_id]) {
          editOverlay.classList.add("d-none");
          showOrderCompletedBanner();
          return;
        }

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

      // guard — if order is already gone, abort and refresh
      if (!ordersMap[summary.client_order_id]) {
        editOverlay.classList.add("d-none");
        await loadPaymentSummaries();
        showOrderCompletedBanner();
        return;
      }

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

        const response = await apiFetch(`${FAST_API_URL}/payment-transactions/`, {
          method: "POST",
          body: JSON.stringify({
            payment_summary_id: parseInt(summaryId),
            paid_amount: amount,
            payment_date: paymentDate
          })
        });

        if (!response.ok) {
          let message = "Failed to save payment.";

          try {
            const text = await response.text();

            try {
              const json = JSON.parse(text);
              message = json.detail || message;
            } catch {
              message = text;
            }

          } catch {}

          showEditError(message);
          amountInput.focus();
          return;
        }
      }

        // refresh table and close overlay; order may now be in completed_orders
        await loadPaymentSummaries();
        editOverlay.classList.add("d-none");

      } catch (err) {
        console.error("Failed to save transactions:", err);

        let message = "Failed to save transactions. Please try again.";

        if (err?.message) {
          message = err.message;
        }

        showEditError(message);
      } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        closeBtn.disabled = false;
        addBtn.disabled = false;
      }
    });
}