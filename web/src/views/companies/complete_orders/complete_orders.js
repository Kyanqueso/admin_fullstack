document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
  const ORDERS_URL = `${FAST_API_URL}/client-orders`;
  const CLIENTS_URL = `${FAST_API_URL}/clients`;
  const PAYMENT_SUMMARIES_URL = `${FAST_API_URL}/payment-summaries`;

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

  /* ===============================
     DOM ELEMENTS
  =============================== */
  const tableBody = document.querySelector("tbody");
  const searchInput = document.querySelector('input[placeholder="Search name"]');
  const sortSelect = document.querySelector(".form-select");

  let allCompletedOrders = [];
  let clientMap = {};

  /* ===============================
     LOAD DATA
  =============================== */
  async function loadData() {
    tableBody.innerHTML = `
      <tr><td colspan="15" class="text-center"><div class="spinner-border"></div></td></tr>
    `;

    try {
      const [clientsRes, ordersRes, summariesRes] = await Promise.all([
        apiFetch(CLIENTS_URL),
        apiFetch(ORDERS_URL),
        apiFetch(PAYMENT_SUMMARIES_URL)
      ]);

      const allClients = await clientsRes.json();
      const allOrders = await ordersRes.json();
      const allSummaries = await summariesRes.json();

      // Build client map (filtered by company)
      const companyClients = allClients.filter(
        c => String(c.company_id) === String(COMPANY_ID)
      );
      clientMap = {};
      companyClients.forEach(c => { clientMap[c.id] = c; });

      // Build a set of order IDs that are fully paid (remaining_balance == 0)
      const completedOrderIds = new Set();
      allSummaries.forEach(s => {
        if (Number(s.remaining_balance) === 0) {
          completedOrderIds.add(s.client_order_id);
        }
      });

      // Filter: orders for this company's clients AND fully paid
      allCompletedOrders = allOrders.filter(order =>
        clientMap[order.client_id] && completedOrderIds.has(order.id)
      );

      renderOrders(allCompletedOrders);
    } catch (err) {
      console.error("Failed to load completed orders:", err);
      tableBody.innerHTML = `
        <tr><td colspan="15" class="text-danger text-center">Failed to load completed orders</td></tr>
      `;
    }
  }

  /* ===============================
     RENDER
  =============================== */
  function renderOrders(ordersArray) {
    tableBody.innerHTML = "";

    if (ordersArray.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="15" class="text-center text-muted">No completed orders found</td></tr>
      `;
      return;
    }

    ordersArray.forEach(order => {
      const client = clientMap[order.client_id];
      const clientName = client
        ? `${client.first_name} ${client.last_name}`
        : "Unknown";
      const total = (order.quantity * order.price).toFixed(2);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(String(order.id))}</td>
        <td>${escapeHtml(clientName)}</td>
        <td>${escapeHtml(order.model)}</td>
        <td>${escapeHtml(String(order.size))}</td>
        <td>${escapeHtml(order.material)}</td>
        <td>${escapeHtml(order.color)}</td>
        <td>${escapeHtml(order.heel_type)}</td>
        <td>${escapeHtml(String(order.heel_size))}</td>
        <td>${escapeHtml(order.mold)}</td>
        <td>${order.has_buckle ? "Yes" : "No"}</td>
        <td>${order.has_slingback ? "Yes" : "No"}</td>
        <td>${order.has_platform ? "Yes" : "No"}</td>
        <td>${escapeHtml(String(order.quantity))}</td>
        <td>${escapeHtml(String(order.price))}</td>
        <td>${escapeHtml(total)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  function getFilteredOrders() {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = allCompletedOrders.filter(order => {
      const client = clientMap[order.client_id];
      const name = client ? `${client.first_name} ${client.last_name}` : "";
      return name.toLowerCase().includes(query) || order.model.toLowerCase().includes(query);
    });
    return sortOrders(filtered, sortSelect.value);
  }

  function sortOrders(ordersArray, sortValue) {
    const arr = [...ordersArray];
    if (sortValue === "name") {
      arr.sort((a, b) => {
        const nameA = clientMap[a.client_id] ? `${clientMap[a.client_id].first_name} ${clientMap[a.client_id].last_name}` : "";
        const nameB = clientMap[b.client_id] ? `${clientMap[b.client_id].first_name} ${clientMap[b.client_id].last_name}` : "";
        return nameA.localeCompare(nameB);
      });
    } else if (sortValue === "recent") {
      arr.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    } else if (sortValue === "alpha") {
      arr.sort((a, b) => a.model.localeCompare(b.model));
    }
    return arr;
  }

  searchInput.addEventListener("input", () => renderOrders(getFilteredOrders()));
  sortSelect.addEventListener("change", () => renderOrders(getFilteredOrders()));

  /* ===============================
     INIT
  =============================== */
  loadData();

});
