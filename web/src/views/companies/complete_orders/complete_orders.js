import { getFromCache, saveToCache } from '../../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
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
});

// Re-fetch when browser restores this page from bfcache (Back/Forward buttons),
// because DOMContentLoaded does NOT re-fire in that case.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadCompletedOrders();
  }
});


/* =========================
   LOAD CLIENTS
========================= */
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


/* =========================
   LOAD COMPLETED ORDERS
========================= */
async function loadCompletedOrders() {
  const tbody = document.getElementById("completedOrdersTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td colspan="15" class="text-center"><div class="spinner-border"></div></td></tr>
  `;

  try {
    // Always fetch fresh — completed status changes when transactions are added/deleted
    const res = await apiFetch(`${FAST_API_URL}/client-orders/?completed=true`);
    const orders = await res.json();

    // Only keep orders belonging to this company's clients
    allCompletedOrders = orders.filter(
      order => clientsMap[order.client_id] !== undefined
    );

    renderCompletedOrders(allCompletedOrders);

  } catch (err) {
    console.error("Failed to load completed orders", err);
    document.getElementById("completedOrdersTableBody").innerHTML = `
      <tr><td colspan="15" class="text-danger text-center">Failed to load completed orders</td></tr>
    `;
  }
}


/* =========================
   RENDER COMPLETED ORDERS
========================= */
function renderCompletedOrders(orders) {
  const tbody = document.getElementById("completedOrdersTableBody");
  tbody.innerHTML = "";

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="15" class="text-center text-muted">No completed orders found</td></tr>
    `;
    return;
  }

  orders.forEach(order => {
    const total = (
      Number(order.price) * order.quantity
    ).toLocaleString('en-PH', { minimumFractionDigits: 2 });

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${clientsMap[order.client_id] || order.client_id}</td>
      <td>${order.model}</td>
      <td>${order.size}</td>
      <td>${order.material}</td>
      <td>${order.color}</td>
      <td>${order.heel_type}</td>
      <td>${order.heel_size}</td>
      <td>${order.mold}</td>
      <td>${order.has_buckle ? "Yes" : "No"}</td>
      <td>${order.has_slingback ? "Yes" : "No"}</td>
      <td>${order.has_platform ? "Yes" : "No"}</td>
      <td>${order.quantity}</td>
      <td>₱${Number(order.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      <td>₱${total}</td>
    `;

    tbody.appendChild(row);
  });
}


/* =========================
   SEARCH & SORT
========================= */
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

    if (sortValue === "name" || sortValue === "alpha") {
      result.sort((a, b) =>
        (clientsMap[a.client_id] || "").localeCompare(clientsMap[b.client_id] || "")
      );
    } else if (sortValue === "recent") {
      result.sort((a, b) => b.id - a.id);
    }

    renderCompletedOrders(result);
  }

  searchInput?.addEventListener("input", applySearchAndSort);
  sortSelect?.addEventListener("change", applySearchAndSort);
}
