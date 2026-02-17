const API_BASE = "http://127.0.0.1:8000";

let clientsMap = {};
let ordersMap = {};
let paymentSummaries = [];

document.addEventListener("DOMContentLoaded", async () => {

  await loadClients();
  await loadOrders();
  await loadPaymentSummaries();

  setupOverlayControls();
});


/* ===============================
   LOAD CLIENTS
=============================== */
async function loadClients() {
  const res = await fetch(`${API_BASE}/clients/`);
  const clients = await res.json();

  clients.forEach(client => {
    clientsMap[client.id] = `${client.first_name} ${client.last_name}`;
  });
}


/* ===============================
   LOAD ORDERS
=============================== */
async function loadOrders() {
  const res = await fetch(`${API_BASE}/client-orders/`);
  const orders = await res.json();

  orders.forEach(order => {
    ordersMap[order.id] = order;
  });
}


/* ===============================
   LOAD PAYMENT SUMMARIES
=============================== */
async function loadPaymentSummaries() {

  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = "";

  const res = await fetch(`${API_BASE}/payment-summaries/`);
  paymentSummaries = await res.json();

  paymentSummaries.forEach(summary => {

    const order = ordersMap[summary.client_order_id];
    if (!order) return;

    const clientName = clientsMap[order.client_id];
    const totalAmount = Number(order.price) * Number(order.quantity);

    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString()
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

  attachDynamicHandlers();
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

      const res = await fetch(`${API_BASE}/payment-transactions/`);
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

      const res = await fetch(`${API_BASE}/payment-transactions/`);
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
          await fetch(`${API_BASE}/payment-transactions/${transactionId}`, {
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

        // ❌ Empty validation
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

      // ❌ Prevent overpayment
      if (runningTotal > orderTotal) {
        alert("Total payments exceed order total.");
        return;
      }

      // If validation passes, send to backend
      for (let i = 0; i < rows.length; i++) {

        const amountInput = rows[i].querySelector("input[type='number']");
        const dateInput = rows[i].querySelector("input[type='date']");

        const amount = parseFloat(amountInput.value);
        const paymentDate = dateInput.value;

        const response = await fetch(`${API_BASE}/payment-transactions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_summary_id: parseInt(summaryId),
            payment_number: i + 1,
            paid_amount: amount,
            payment_date: paymentDate
          })
        });

        // 🔥 THIS IS THE IMPORTANT ADDITION
        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.detail || "Payment failed.");
          return; // STOP execution immediately
        }
      }

      await loadPaymentSummaries();
      editOverlay.classList.add("d-none");
    });
}
