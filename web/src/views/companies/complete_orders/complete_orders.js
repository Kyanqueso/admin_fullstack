import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const COMPANY_ID = localStorage.getItem("activeCompanyId");

let clientsMap = {};
let summariesByOrderId = {};
let allOrders = [];
let currentTab = 'active';
let selectedOrderId = null;
let isPermanentDelete = false;

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
    let msg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) msg = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(", ") : data.detail;
    } catch {}
    throw new Error(msg);
  }
  return response;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function loadCompanyName() {
  const heading = document.getElementById("companyTitle");
  const url = `${FAST_API_URL}/companies/${COMPANY_ID}`;
  const cached = getFromCache(url);
  if (cached) { heading.textContent = `${cached.name}'s Completed Orders`; return; }
  try {
    const response = await apiFetch(url);
    const company = await response.json();
    saveToCache(url, company);
    heading.textContent = `${company.name}'s Completed Orders`;
  } catch (err) {
    console.error("Failed to load company name:", err);
  }
}

async function loadClients() {
  // Load both active and archived clients for name lookup
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

async function loadSummaries() {
  // Build a map of orderId -> summary for active (non-archived) summaries
  try {
    const res = await apiFetch(`${FAST_API_URL}/payment-summaries/`);
    const summaries = await res.json();
    summariesByOrderId = {};
    summaries.forEach(s => {
      if (s.client_order_id) summariesByOrderId[s.client_order_id] = s;
    });
  } catch (err) {
    console.error("Failed to load summaries:", err);
  }
}

async function loadOrders() {
  const tbody = document.getElementById("completedOrdersTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="17" class="text-center"><div class="spinner-border"></div></td></tr>`;

  try {
    let url;
    if (currentTab === 'active') {
      url = `${FAST_API_URL}/client-orders/?completed=true`;
    } else {
      url = `${FAST_API_URL}/client-orders/?archived=true&completed=true`;
    }

    const res = await apiFetch(url);
    const orders = await res.json();
    allOrders = orders.filter(o => clientsMap[o.client_id] !== undefined);
    renderOrders(allOrders);
  } catch (err) {
    console.error("Failed to load orders:", err);
    tbody.innerHTML = `<tr><td colspan="17" class="text-danger text-center">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function setTabUI(tab) {
  const activeBtn = document.getElementById('activeTabBtn');
  const archiveBtn = document.getElementById('archiveTabBtn');
  activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
  archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';

  // Update table headers
  const ths = document.querySelectorAll('thead th');
  if (tab === 'archive') {
    if (ths[15]) ths[15].textContent = 'Restore';
    if (ths[16]) ths[16].textContent = 'Delete';
  } else {
    if (ths[15]) ths[15].textContent = 'Payment History';
    if (ths[16]) ths[16].textContent = '';
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById("completedOrdersTableBody");
  tbody.innerHTML = "";

  if (orders.length === 0) {
    const label = currentTab === 'archive' ? 'archived' : 'completed';
    tbody.innerHTML = `<tr><td colspan="17" class="text-center text-muted">No ${label} orders found</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const total = (Number(order.price) * order.quantity)
      .toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const clientName = escapeHtml(clientsMap[order.client_id] || String(order.client_id));

    let actionCells;
    if (currentTab === 'archive') {
      actionCells = `
        <td>
          <button class="btn btn-sm btn-warning restore-order-btn" data-id="${order.id}">Restore</button>
        </td>
        <td>
          <button class="btn btn-sm btn-danger perm-delete-order-btn" data-id="${order.id}">Delete</button>
        </td>`;
    } else {
      const summary = summariesByOrderId[order.id];
      actionCells = `
        <td>
          <button class="btn btn-sm text-white view-history-btn"
            style="background-color: var(--color-primary); white-space: nowrap;"
            data-order-id="${order.id}"
            data-client-name="${clientName}"
            data-total="${total}"
            ${summary ? `data-summary-id="${summary.id}"` : ''}
          >
            👁 History
          </button>
        </td>
        <td>
          <button class="btn btn-sm archive-order-btn" data-id="${order.id}" title="Archive">
            <img src="${trashIcon}" width="18">
          </button>
        </td>`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${clientName}</td>
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
      ${actionCells}
    `;
    tbody.appendChild(row);
  });
}

async function openPaymentHistory(summaryId, clientName, totalDisplay) {
  const overlay = document.getElementById("completedPaymentHistoryOverlay");
  document.getElementById("completedHistoryCustomerName").textContent = clientName;
  document.getElementById("completedHistoryTotalPrice").textContent = "₱" + totalDisplay;

  const tableBody = document.getElementById("completedHistoryTransactionsBody");
  tableBody.innerHTML = `<tr><td colspan="3" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
  overlay.classList.remove("d-none");

  try {
    const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
    const transactions = await res.json();
    const filtered = transactions.filter(t => t.payment_summary_id == summaryId);

    tableBody.innerHTML = "";
    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No transactions found</td></tr>`;
      return;
    }
    filtered.forEach((t, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>₱${Number(t.paid_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td>${new Date(t.payment_date + 'T00:00:00').toLocaleDateString()}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!COMPANY_ID) {
    window.location.href = "../companies.html";
    return;
  }

  loadCompanyName();
  await loadClients();
  await loadSummaries();
  await loadOrders();
  setTabUI('active');

  // Tab buttons
  document.getElementById('activeTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'active') return;
    currentTab = 'active';
    setTabUI('active');
    await loadSummaries();
    await loadOrders();
  });

  document.getElementById('archiveTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'archive') return;
    currentTab = 'archive';
    setTabUI('archive');
    await loadOrders();
  });

  // Payment history overlay close
  document.getElementById("closeCompletedHistoryOverlay")?.addEventListener("click", () => {
    document.getElementById("completedPaymentHistoryOverlay").classList.add("d-none");
  });
  document.getElementById("closeCompletedHistoryBtn")?.addEventListener("click", () => {
    document.getElementById("completedPaymentHistoryOverlay").classList.add("d-none");
  });

  // Table button delegation
  document.getElementById("completedOrdersTableBody")?.addEventListener("click", async (e) => {
    // View history
    const historyBtn = e.target.closest(".view-history-btn");
    if (historyBtn) {
      const summaryId = historyBtn.dataset.summaryId;
      if (!summaryId) {
        const errEl = document.getElementById('historyErrorMsg');
        if (errEl) {
          errEl.textContent = "No payment summary found for this order.";
          errEl.classList.remove('d-none');
        }
        document.getElementById("completedPaymentHistoryOverlay").classList.remove("d-none");
        document.getElementById("completedHistoryCustomerName").textContent = historyBtn.dataset.clientName || "";
        document.getElementById("completedHistoryTotalPrice").textContent = "";
        document.getElementById("completedHistoryTransactionsBody").innerHTML = "";
        return;
      }
      const errEl = document.getElementById('historyErrorMsg');
      if (errEl) errEl.classList.add('d-none');
      await openPaymentHistory(summaryId, historyBtn.dataset.clientName, historyBtn.dataset.total);
      return;
    }

    // Archive (soft delete) from active tab
    const archiveBtn = e.target.closest(".archive-order-btn");
    if (archiveBtn) {
      selectedOrderId = archiveBtn.dataset.id;
      isPermanentDelete = false;
      document.querySelector("#deleteCompletedOverlay h5").innerHTML =
        "Archive this order?<br><small class='text-muted'>It can be restored from the Archive tab.</small>";
      document.getElementById("deleteCompletedOverlay")?.classList.remove("d-none");
      return;
    }

    // Restore from archive tab
    const restoreBtn = e.target.closest(".restore-order-btn");
    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      try {
        restoreBtn.disabled = true;
        restoreBtn.textContent = "Restoring...";
        await apiFetch(`${FAST_API_URL}/client-orders/${id}/restore`, { method: "PATCH" });
        clearCache();
        await loadOrders();
      } catch (err) {
        restoreBtn.disabled = false;
        restoreBtn.textContent = "Restore";
        const banner = document.getElementById('page-error-banner');
        const msg = document.getElementById('page-error-msg');
        if (banner && msg) {
          msg.textContent = `Failed to restore: ${err.message}`;
          banner.classList.remove('d-none');
        }
      }
      return;
    }

    // Permanent delete from archive tab
    const permBtn = e.target.closest(".perm-delete-order-btn");
    if (permBtn) {
      selectedOrderId = permBtn.dataset.id;
      isPermanentDelete = true;
      document.querySelector("#deleteCompletedOverlay h5").innerHTML =
        "Permanently delete this order?<br><small class='text-muted'>This cannot be undone.</small>";
      document.getElementById("deleteCompletedOverlay")?.classList.remove("d-none");
      return;
    }
  });

  // Delete confirm overlay
  document.getElementById("confirmDeleteCompleted")?.addEventListener("click", async () => {
    if (!selectedOrderId) return;
    const confirmBtn = document.getElementById("confirmDeleteCompleted");
    const cancelBtn = document.getElementById("cancelDeleteCompleted");
    const closeBtn = document.getElementById("closeDeleteCompleted");
    const originalText = confirmBtn.textContent;

    const errEl = document.getElementById('deleteCompletedError');
    if (errEl) errEl.classList.add('d-none');

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      if (closeBtn) closeBtn.disabled = true;
      confirmBtn.textContent = isPermanentDelete ? "Deleting..." : "Archiving...";

      const url = isPermanentDelete
        ? `${FAST_API_URL}/client-orders/${selectedOrderId}/permanent`
        : `${FAST_API_URL}/client-orders/${selectedOrderId}`;

      await apiFetch(url, { method: "DELETE" });
      document.getElementById("deleteCompletedOverlay")?.classList.add("d-none");
      clearCache();
      if (currentTab === 'active') await loadSummaries();
      await loadOrders();
    } catch (err) {
      const errEl = document.getElementById('deleteCompletedError');
      if (errEl) {
        errEl.textContent = `Failed: ${err.message}`;
        errEl.classList.remove('d-none');
      }
    } finally {
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      if (closeBtn) closeBtn.disabled = false;
      selectedOrderId = null;
      isPermanentDelete = false;
    }
  });

  ["cancelDeleteCompleted", "closeDeleteCompleted"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => {
      document.getElementById("deleteCompletedOverlay")?.classList.add("d-none");
      const errEl = document.getElementById('deleteCompletedError');
      if (errEl) errEl.classList.add('d-none');
      selectedOrderId = null;
      isPermanentDelete = false;
    });
  });

  // Search & Sort
  const searchInput = document.querySelector('input[placeholder="Search name"]');
  const sortSelect = document.querySelector('.form-select');

  function applySearchAndSort() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const sortValue = sortSelect?.value || "";
    let result = allOrders.filter(o => (clientsMap[o.client_id] || "").toLowerCase().includes(query));
    if (sortValue === "az") result.sort((a, b) => (clientsMap[a.client_id] || "").localeCompare(clientsMap[b.client_id] || ""));
    else if (sortValue === "za") result.sort((a, b) => (clientsMap[b.client_id] || "").localeCompare(clientsMap[a.client_id] || ""));
    else if (sortValue === "recent") result.sort((a, b) => b.id - a.id);
    else if (sortValue === "oldest") result.sort((a, b) => a.id - b.id);
    renderOrders(result);
  }

  searchInput?.addEventListener("input", applySearchAndSort);
  sortSelect?.addEventListener("change", applySearchAndSort);
});