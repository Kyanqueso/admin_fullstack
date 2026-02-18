import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
const COMPANY_ID = localStorage.getItem("activeCompanyId");

let clientsMap = {};
let ordersMap = {};
let paymentSummaries = [];

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

document.addEventListener("DOMContentLoaded", async () => {

  if (!COMPANY_ID) {
    alert("No company selected.");
    window.location.href = "../companies.html";
    return;
  }

  document.getElementById("paymentsTableBody").innerHTML = `
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

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
=============================== */
async function loadPaymentSummaries() {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = `
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  const url = `${FAST_API_URL}/payment-summaries/`;
  let cached = getFromCache(url);

  if (cached) {
    paymentSummaries = cached;
  } else {
    const res = await apiFetch(url);
    paymentSummaries = await res.json();
    saveToCache(url, paymentSummaries);
  }

  renderPaymentRows(paymentSummaries);
}


/* ===============================
   RENDER PAYMENT ROWS
=============================== */
function renderPaymentRows(summaries) {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = "";

  // Only show summaries whose order belongs to this company
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
          <img src="../../../assets/icons/pencil.svg" width="18">
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Re-attach handlers every time rows are re-rendered
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
   ATTACH BUTTON HANDLERS
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
      tableBody.innerHTML = "";

      const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
      const transactions = await res.json();

      const filtered = transactions.filter(
        t => t.payment_summary_id == summaryId
      );

      filtered.forEach((t, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>₱${Number(t.paid_amount).toLocaleString()}</td>
          <td>${new Date(t.payment_date).toLocaleDateString()}</td>
        `;
        tableBody.appendChild(row);
      });

      document.getElementById("transactionHistoryOverlay").classList.remove("d-none");
    });
  });


  /* OPEN EDIT OVERLAY */
  document.querySelectorAll(".edit-payment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {

      const summaryId = btn.dataset.summaryId;
      const summary = paymentSummaries.find(s => s.id == summaryId);
      const order = ordersMap[summary.client_order_id];
      const clientName = clientsMap[order.client_id];
      const totalPrice = Number(order.price) * Number(order.quantity);

      const editOverlay = document.getElementById("editTransactionOverlay");
      editOverlay.dataset.summaryId = summaryId;

      document.getElementById("editCustomerName").innerText = clientName;
      document.getElementById("editTotalPrice").innerText =
        "₱" + totalPrice.toLocaleString();
      document.getElementById("editCurrentBalance").innerText =
        "₱" + Number(summary.remaining_balance).toLocaleString();

      const container = document.getElementById("transactionsContainer");
      container.innerHTML = "";

      const res = await apiFetch(`${FAST_API_URL}/payment-transactions/`);
      const transactions = await res.json();

      const filtered = transactions.filter(
        t => t.payment_summary_id == summaryId
      );

      filtered.forEach(t => {
        const row = document.createElement("div");
        row.classList.add("transaction-row");

        row.innerHTML = `
          <div>
            <label class="form-label">Amount (₱)</label>
            <input type="number" class="form-control" value="${t.paid_amount}">
          </div>

          <div>
            <label class="form-label">Date</label>
            <input type="date" class="form-control" value="${t.payment_date}">
          </div>

          <button type="button"
            class="delete-transaction-btn"
            data-id="${t.id}">
            🗑
          </button>
        `;

        container.appendChild(row);
      });

      editOverlay.classList.remove("d-none");
    });
  });
}


/* ===============================
   OVERLAY CONTROLS
=============================== */
function setupOverlayControls() {

  document.getElementById("closeTransactionOverlay")
    ?.addEventListener("click", () => {
      document.getElementById("transactionHistoryOverlay")
        .classList.add("d-none");
    });

  document.getElementById("closeTransactionBtn")
    ?.addEventListener("click", () => {
      document.getElementById("transactionHistoryOverlay")
        .classList.add("d-none");
    });

  const editOverlay = document.getElementById("editTransactionOverlay");

  document.getElementById("closeEditTransaction")
    ?.addEventListener("click", () => {
      editOverlay.classList.add("d-none");
    });

  document.getElementById("cancelEditTransaction")
    ?.addEventListener("click", () => {
      editOverlay.classList.add("d-none");
    });

  document.getElementById("addTransactionBtn")
    ?.addEventListener("click", () => {

      const container = document.getElementById("transactionsContainer");

      const row = document.createElement("div");
      row.classList.add("transaction-row");

      row.innerHTML = `
        <div>
          <label class="form-label">Amount (₱)</label>
          <input type="number" class="form-control" placeholder="0.00">
        </div>

        <div>
          <label class="form-label">Date</label>
          <input type="date" class="form-control">
        </div>

        <button type="button" class="delete-transaction-btn">🗑</button>
      `;

      container.appendChild(row);
    });

  document.getElementById("transactionsContainer")
    ?.addEventListener("click", async (e) => {

      if (e.target.classList.contains("delete-transaction-btn")) {

        const transactionId = e.target.dataset.id;

        if (transactionId) {
          await apiFetch(`${FAST_API_URL}/payment-transactions/${transactionId}`, {
            method: "DELETE"
          });
        }

        e.target.closest(".transaction-row").remove();
      }
    });

  /* ===============================
     SAVE TRANSACTIONS
  =============================== */
  document.getElementById("saveTransactionsBtn")
    ?.addEventListener("click", async () => {

      const editOverlay = document.getElementById("editTransactionOverlay");
      const summaryId = editOverlay.dataset.summaryId;

      if (!summaryId) return;

      const summary = paymentSummaries.find(s => s.id == summaryId);
      const order = ordersMap[summary.client_order_id];
      const orderTotal = Number(order.price) * Number(order.quantity);

      const rows = document.querySelectorAll(
        "#transactionsContainer .transaction-row"
      );

      let runningTotal = 0;

      for (let i = 0; i < rows.length; i++) {
        const amountInput = rows[i].querySelector("input[type='number']");
        const dateInput = rows[i].querySelector("input[type='date']");
        const amount = parseFloat(amountInput.value);
        const paymentDate = dateInput.value;

        if (!amount || amount <= 0) {
          alert("Payment amount must be greater than 0.");
          return;
        }

        if (!paymentDate) {
          alert("Please select a payment date.");
          return;
        }

        runningTotal += amount;
      }

      if (runningTotal > orderTotal) {
        alert("Total payments exceed order total.");
        return;
      }

      for (let i = 0; i < rows.length; i++) {
        const amountInput = rows[i].querySelector("input[type='number']");
        const dateInput = rows[i].querySelector("input[type='date']");
        const amount = parseFloat(amountInput.value);
        const paymentDate = dateInput.value;

        const response = await apiFetch(`${FAST_API_URL}/payment-transactions/`, {
          method: "POST",
          body: JSON.stringify({
            payment_summary_id: parseInt(summaryId),
            payment_number: i + 1,
            paid_amount: amount,
            payment_date: paymentDate
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.detail || "Payment failed.");
          return;
        }
      }

      clearCache();
      await loadPaymentSummaries();
      editOverlay.classList.add("d-none");
    });
}
