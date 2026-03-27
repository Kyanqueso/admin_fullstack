import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const COMPANY_ID = localStorage.getItem("activeCompanyId");

let clientsMap = {};
let allCompletedOrders = [];

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
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = Array.isArray(errorData.detail)
          ? errorData.detail.map(e => e.msg).join(", ")
          : errorData.detail;
      }
    } catch { /* keep default */ }
    throw new Error(errorMessage);
  }

  return response;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ===============================
   LOAD COMPANY NAME
=============================== */
async function loadCompanyName() {
  const heading = document.getElementById("companyTitle");
  const url = `${FAST_API_URL}/companies/${COMPANY_ID}`;

  const cached = getFromCache(url);
  if (cached) {
    heading.textContent = `${cached.name}'s Completed Orders`;
    return;
  }

  try {
    const response = await apiFetch(url);
    const company = await response.json();
    saveToCache(url, company);
    heading.textContent = `${company.name}'s Completed Orders`;
  } catch (error) {
    console.error("Failed to load company name:", error);
  }
}

/* ===============================
   INIT
=============================== */
document.addEventListener("DOMContentLoaded", async () => {
  if (!COMPANY_ID) {
    alert("No company selected.");
    window.location.href = "../companies.html";
    return;
  }

  loadCompanyName();
  await loadClients();
  await loadCompletedOrders();
  setupSearchAndSort();

  document.getElementById("closeCompletedHistoryOverlay")
    ?.addEventListener("click", closePaymentHistoryOverlay);
  document.getElementById("closeCompletedHistoryBtn")
    ?.addEventListener("click", closePaymentHistoryOverlay);

  // Delete confirm overlay buttons
  document.getElementById("cancelDeleteCompleted")
    ?.addEventListener("click", closeDeleteOverlay);
  document.getElementById("closeDeleteCompleted")
    ?.addEventListener("click", closeDeleteOverlay);
  document.getElementById("confirmDeleteCompleted")
    ?.addEventListener("click", confirmDeleteCompleted);
});

// Re-fetch when browser restores page from bfcache
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    clearCache();
    loadCompletedOrders();
  }
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
   LOAD COMPLETED ORDERS
=============================== */
async function loadCompletedOrders() {
  const tbody = document.getElementById("completedOrdersTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td colspan="17" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  try {
    const res = await apiFetch(`${FAST_API_URL}/completed-orders/`);
    const orders = await res.json();

    allCompletedOrders = orders.filter(
      order => clientsMap[order.client_id] !== undefined
    );

    renderCompletedOrders(allCompletedOrders);
  } catch (err) {
    console.error("Failed to load completed orders", err);
    tbody.innerHTML = `
      <tr><td colspan="17" class="text-danger text-center">
        Failed to load completed orders: ${escapeHtml(err.message)}
      </td></tr>
    `;
  }
}

/* ===============================
   RENDER COMPLETED ORDERS
=============================== */
function renderCompletedOrders(orders) {
  const tbody = document.getElementById("completedOrdersTableBody");
  tbody.innerHTML = "";

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="17" class="text-center text-muted">No completed orders found</td></tr>
    `;
    return;
  }

  orders.forEach(order => {
    const total = (Number(order.price) * order.quantity)
      .toLocaleString('en-PH', { minimumFractionDigits: 2 });

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.original_order_id || order.id}</td>
      <td>${escapeHtml(clientsMap[order.client_id] || String(order.client_id))}</td>
      <td>${escapeHtml(order.model)}</td>
      <td>${Number(order.size).toFixed(1)}</td>
      <td>${escapeHtml(order.material)}</td>
      <td>${escapeHtml(order.color)}</td>
      <td>${escapeHtml(order.heel_type)}</td>
      <td>${escapeHtml(order.heel_size)}</td>
      <td>${escapeHtml(order.mold)}</td>
      <td>${order.has_buckle ? "Yes" : "No"}</td>
      <td>${order.has_slingback ? "Yes" : "No"}</td>
      <td>${order.has_platform ? "Yes" : "No"}</td>
      <td>${order.quantity}</td>
      <td>₱${Number(order.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      <td>₱${total}</td>
      <td>
        <button
          class="btn btn-sm text-white view-completed-history-btn"
          style="background-color: var(--color-primary); white-space: nowrap;"
          data-completed-id="${order.id}"
          data-original-order-id="${order.original_order_id || ''}"
          data-client-name="${escapeHtml(clientsMap[order.client_id] || '')}"
          data-total="${total}"
        >
          👁 History
        </button>
      </td>
      <td>
        <button
          class="btn btn-sm delete-completed-btn"
          data-id="${order.id}"
        >
          <img src="${trashIcon}" width="18">
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  attachHistoryHandlers();
  attachDeleteHandlers();
}

/* ===============================
   PAYMENT HISTORY OVERLAY
=============================== */
async function openPaymentHistoryOverlay(originalOrderId, clientName, totalDisplay) {
  const overlay = document.getElementById("completedPaymentHistoryOverlay");

  document.getElementById("completedHistoryCustomerName").textContent = clientName;
  document.getElementById("completedHistoryTotalPrice").textContent = "₱" + totalDisplay;

  const tableBody = document.getElementById("completedHistoryTransactionsBody");
  tableBody.innerHTML = `
    <tr><td colspan="3" class="text-center">
      <div class="spinner-border spinner-border-sm"></div>
    </td></tr>
  `;

  overlay.classList.remove("d-none");

  try {
    // ─────────────────────────────────────────────────────────────
    // HISTORY LOOKUP FIX:
    // After an order is completed, payment_summaries.client_order_id
    // is SET NULL by Postgres (ondelete="SET NULL"). We can no longer
    // filter summaries by client_order_id == original_order_id.
    //
    // Instead: fetch ALL payment summaries, find the one whose id
    // matches via payment_transactions. We look at all transactions
    // and find the summary whose original client_order_id was
    // original_order_id by fetching all summaries and checking which
    // one has transactions that add up to the expected total.
    //
    // Simpler approach used here: fetch all transactions, then fetch
    // all summaries, find the summary where client_order_id is NULL
    // (completed) and whose transactions match. But that's ambiguous.
    //
    // CORRECT approach: the backend needs a dedicated endpoint.
    // We added GET /payment-summaries/by-order/{original_order_id}
    // which queries payment_summaries filtering by the original
    // client_order_id BEFORE it was nulled — but we stored it in
    // completed_orders.original_order_id for exactly this reason.
    //
    // Since the summary row itself no longer has client_order_id,
    // we use a direct transaction lookup by summary — fetching all
    // summaries and finding by original_order_id stored in summary.
    // But wait — after SET NULL the summary has no order reference.
    //
    // ACTUAL SOLUTION: store original_order_id ON the PaymentSummary
    // as well so it can be queried. We do this in the service below.
    // ─────────────────────────────────────────────────────────────

    if (!originalOrderId) {
      tableBody.innerHTML = `
        <tr><td colspan="3" class="text-center text-muted">No history reference available</td></tr>
      `;
      return;
    }

    // Fetch transactions via the dedicated endpoint
    const txRes = await apiFetch(
      `${FAST_API_URL}/payment-transactions/by-order/${originalOrderId}`
    );
    const transactions = await txRes.json();

    tableBody.innerHTML = "";

    if (transactions.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="3" class="text-center text-muted">No transaction history found</td></tr>
      `;
      return;
    }

    transactions.forEach((t, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>₱${Number(t.paid_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td>${new Date(t.payment_date + 'T00:00:00').toLocaleDateString()}</td>
      `;
      tableBody.appendChild(row);
    });

  } catch (err) {
    console.error("Failed to load payment history:", err);
    tableBody.innerHTML = `
      <tr><td colspan="3" class="text-danger text-center">
        Failed to load history: ${escapeHtml(err.message)}
      </td></tr>
    `;
  }
}

function closePaymentHistoryOverlay() {
  document.getElementById("completedPaymentHistoryOverlay").classList.add("d-none");
}

function attachHistoryHandlers() {
  document.querySelectorAll(".view-completed-history-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const originalOrderId = btn.dataset.originalOrderId;
      const clientName = btn.dataset.clientName;
      const total = btn.dataset.total;
      openPaymentHistoryOverlay(originalOrderId, clientName, total);
    });
  });
}

/* ===============================
   DELETE COMPLETED ORDER
=============================== */
let selectedCompletedId = null;

function attachDeleteHandlers() {
  document.querySelectorAll(".delete-completed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedCompletedId = btn.dataset.id;
      document.getElementById("deleteCompletedOverlay").classList.remove("d-none");
    });
  });
}

function closeDeleteOverlay() {
  document.getElementById("deleteCompletedOverlay").classList.add("d-none");
  selectedCompletedId = null;
}

async function confirmDeleteCompleted() {
  if (!selectedCompletedId) return;

  const confirmBtn = document.getElementById("confirmDeleteCompleted");
  const cancelBtn = document.getElementById("cancelDeleteCompleted");
  const closeBtn = document.getElementById("closeDeleteCompleted");
  const originalText = confirmBtn.textContent;

  try {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    confirmBtn.textContent = "Deleting...";

    await apiFetch(`${FAST_API_URL}/completed-orders/${selectedCompletedId}`, {
      method: "DELETE"
    });

    closeDeleteOverlay();
    clearCache();
    await loadCompletedOrders();

  } catch (err) {
    console.error("Failed to delete completed order:", err);
    // Show error inside overlay
    let banner = document.querySelector(".delete-completed-error");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "alert alert-danger mt-3 delete-completed-error";
      document.querySelector("#deleteCompletedOverlay .overlay-content").appendChild(banner);
    }
    banner.textContent = err.message;
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
  }
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

    let result = allCompletedOrders.filter(order => {
      const clientName = (clientsMap[order.client_id] || "").toLowerCase();
      return clientName.includes(query);
    });

    if (sortValue === "az") {
      result.sort((a, b) =>
        (clientsMap[a.client_id] || "").localeCompare(clientsMap[b.client_id] || "")
      );
    } else if (sortValue === "za") {
      result.sort((a, b) =>
        (clientsMap[b.client_id] || "").localeCompare(clientsMap[a.client_id] || "")
      );
    } else if (sortValue === "recent") {
      result.sort((a, b) => b.id - a.id);
    } else if (sortValue === "oldest") {
      result.sort((a, b) => a.id - b.id);
    }

    renderCompletedOrders(result);
  }

  searchInput?.addEventListener("input", applySearchAndSort);
  sortSelect?.addEventListener("change", applySearchAndSort);
}