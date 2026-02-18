import pencilIcon from '../../../assets/icons/pencil.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {
const API_BASE = "http://127.0.0.1:8000";
let clientsMap = {};
let ordersData = [];


document.addEventListener("DOMContentLoaded", async () => {

  const searchInput = document.getElementById("searchOrders");

  searchInput?.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();

    const filtered = ordersData.filter(order => {
      const clientName = (clientsMap[order.client_id] || "").toLowerCase();
      return clientName.includes(term);
    });

    renderOrders(filtered);
  });

  const sortSelect = document.getElementById("sortOrders");

  sortSelect?.addEventListener("change", () => {
    const value = sortSelect.value;
    let sorted = [...ordersData];

    switch (value) {

      case "az":
        sorted.sort((a, b) => {
          const nameA = (clientsMap[a.client_id] || "").toLowerCase();
          const nameB = (clientsMap[b.client_id] || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;

      case "za":
        sorted.sort((a, b) => {
          const nameA = (clientsMap[a.client_id] || "").toLowerCase();
          const nameB = (clientsMap[b.client_id] || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
        break;

      case "recent":
        sorted.sort((a, b) => b.id - a.id);
        break;

      case "oldest":
        sorted.sort((a, b) => a.id - b.id);
        break;

      case "orderid":
        sorted.sort((a, b) => a.id - b.id);
        break;
    }

    renderOrders(sorted);
  });

  /* =========================
     EDIT ORDER SUBMIT (PATCH)
  ========================= */
  const editForm = document.getElementById("editOrderForm");

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const overlay = document.getElementById("editOrderOverlay");
    const orderId = overlay.dataset.orderId;

    if (!orderId) {
      alert("Order ID missing");
      return;
    }

    const updateData = {
      model: document.getElementById("editModel").value,
      size: document.getElementById("editSize").value,
      material: document.getElementById("editMaterial").value,
      color: document.getElementById("editColor").value,
      heel_type: document.getElementById("editHeelType").value,
      heel_size: document.getElementById("editHeelSize").value,
      mold: document.getElementById("editMold").value,
      quantity: parseInt(document.getElementById("editQuantity").value),
      price: document.getElementById("editPrice").value,

      has_buckle: document.querySelector("input[name='editBuckle']:checked").value === "true",
      has_slingback: document.querySelector("input[name='editSlingback']:checked").value === "true",
      has_platform: document.querySelector("input[name='editPlatform']:checked").value === "true"
    };

    try {
      const res = await fetch(`${API_BASE}/client-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        overlay.classList.add("d-none");
        await loadOrders();
      } else {
        const err = await res.json();
        console.error(err);
        alert(await res.text());
      }

    } catch (error) {
      console.error("PATCH error:", error);
    }
  });


  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
  const ORDERS_URL = `${FAST_API_URL}/client-orders`;
  const CLIENTS_URL = `${FAST_API_URL}/clients`;

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

  const addOverlay = document.getElementById("addOrderOverlay");
  const editOverlay = document.getElementById("editOrderOverlay");
  const deleteOverlay = document.getElementById("deleteOrderOverlay");

  let selectedOrderId = null;
  let allOrders = [];
  let companyClients = [];
  // Map client_id -> { first_name, last_name }
  let clientMap = {};

  /* ===============================
     LOAD CLIENTS (for dropdowns & name display)
  =============================== */
  async function loadCompanyClients() {
    try {
      let allClients = getFromCache(CLIENTS_URL);
      if (!allClients) {
        const response = await apiFetch(CLIENTS_URL);
        allClients = await response.json();
        saveToCache(CLIENTS_URL, allClients);
      }
      companyClients = allClients.filter(
        c => String(c.company_id) === String(COMPANY_ID)
      );
      clientMap = {};
      companyClients.forEach(c => {
        clientMap[c.id] = c;
      });
      populateClientDropdowns();
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }

  function populateClientDropdowns() {
    const selects = document.querySelectorAll("#addOrderOverlay select:first-of-type, #editOrderOverlay select:first-of-type");
    selects.forEach(select => {
      // Keep the first placeholder option
      const placeholder = select.querySelector("option[disabled]");
      select.innerHTML = '';
      if (placeholder) select.appendChild(placeholder);

      companyClients.forEach(client => {
        const opt = document.createElement("option");
        opt.value = client.id;
        opt.textContent = `${client.first_name} ${client.last_name}`;
        select.appendChild(opt);
      });
    });
  }

  /* ===============================
     LOAD ORDERS
  =============================== */
  async function loadOrders() {
    const cached = getFromCache(ORDERS_URL);
    if (cached) {
      allOrders = cached.filter(order => clientMap[order.client_id]);
      renderOrders(allOrders);
      return;
    }

    tableBody.innerHTML = `
      <tr><td colspan="17" class="text-center"><div class="spinner-border"></div></td></tr>
    `;

    try {
      const response = await apiFetch(ORDERS_URL);
      const orders = await response.json();

  closeEditBtn?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  // DELETE
  document.getElementById("closeDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });
  document.getElementById("cancelDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

  /* ===============================
     TABLE CLICK: EDIT & DELETE
  =============================== */
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-order-btn");
    if (editBtn) {
      const orderId = editBtn.dataset.id;
      selectedOrderId = orderId;

  closeDeleteBtn?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

    const form = e.target;
    const selects = form.querySelectorAll("select");
    const inputs = form.querySelectorAll("input.form-control");

    const clientId = selects[0].value;
    if (!clientId) {
      alert("Please select a customer");
      return;
    }

    const payload = {
      client_id: Number(clientId),
      model: inputs[0].value.trim(),
      size: Number(inputs[1].value) || 0,
      material: selects[1].value || inputs[0].value.trim(),
      color: inputs[2].value.trim(),
      heel_type: selects[2].value || "",
      heel_size: Number(inputs[3].value) || 0,
      mold: selects[3].value || "",
      has_buckle: getRadioValue(form, "addBuckle"),
      has_slingback: getRadioValue(form, "addSling"),
      has_platform: getRadioValue(form, "addPlatform"),
      quantity: Number(inputs[4].value) || 1,
      price: Number(inputs[5].value) || 0,
    };

    try {
      await apiFetch(ORDERS_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      addOverlay.classList.add("d-none");
      form.reset();
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to add order:", err);
      alert("Failed to add order");
    }
  };

  /* ===============================
     EDIT ORDER (form submit)
  =============================== */
  editOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const selects = form.querySelectorAll("select");
    const inputs = form.querySelectorAll("input.form-control");

    const payload = {
      client_id: Number(selects[0].value),
      model: inputs[0].value.trim(),
      size: Number(inputs[1].value) || 0,
      material: selects[1].value || "",
      color: inputs[2].value.trim(),
      heel_type: selects[2].value || "",
      heel_size: Number(inputs[3].value) || 0,
      mold: selects[3].value || "",
      has_buckle: getRadioValue(form, "buckle"),
      has_slingback: getRadioValue(form, "slingback"),
      has_platform: getRadioValue(form, "platform"),
    };

    try {
      await apiFetch(`${ORDERS_URL}/${selectedOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      editOverlay.classList.add("d-none");
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to update order:", err);
      alert("Failed to update order");
    }
  };

  /* ===============================
     DELETE ORDER
  =============================== */
  document.getElementById("confirmDeleteOrder").onclick = async () => {
    try {
      await apiFetch(`${ORDERS_URL}/${selectedOrderId}`, {
        method: "DELETE"
      });

      deleteOverlay.classList.add("d-none");
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to delete order:", err);
      alert("Failed to delete order");
    }
  };

  /* ===============================
     INIT
  =============================== */
  (async () => {
    await loadCompanyClients();
    await loadOrders();
  })();

  /* =========================
     ADD ORDER SUBMIT
  ========================= */
  const addForm = document.getElementById("addOrderForm");

  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const orderData = {
      client_id: parseInt(document.getElementById("addCustomerId").value),

      model: document.getElementById("addStyle").value,
      size: document.getElementById("addSize").value,
      material: document.getElementById("addMaterial").value,
      color: document.getElementById("addColor").value,

      mold: document.getElementById("addMoldType").value,
      heel_type: document.getElementById("addHeelType").value,
      heel_size: document.getElementById("addHeelSize").value,

      has_buckle: document.querySelector("input[name='addBuckle']:checked")?.nextElementSibling.innerText === "Yes",
      has_slingback: document.querySelector("input[name='addSling']:checked")?.nextElementSibling.innerText === "Yes",
      has_platform: document.querySelector("input[name='addPlatform']:checked")?.nextElementSibling.innerText === "Yes",

      quantity: parseInt(document.getElementById("addQuantity").value),
      price: document.getElementById("addPrice").value
    };

    try {
      const res = await fetch(`${API_BASE}/client-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        addOverlay.classList.add("d-none");
        addForm.reset();
        loadOrders();
      } else {
        alert("Failed to create order");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while creating order");
    }
  });

  // Load initial data
  await loadClientsForDropdown();
  await loadOrders();
});


/* =========================
   LOAD ORDERS
========================= */
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/client-orders/?completed=false`);
    ordersData = await res.json();
    renderOrders(ordersData);

  } catch (err) {
    console.error(err);
    alert("Failed to load orders");
  }
}

function renderOrders(data) {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = "";

  data.forEach(order => {
    const row = document.createElement("tr");

    const total = (Number(order.price) * order.quantity)
      .toLocaleString('en-PH', { minimumFractionDigits: 2 });

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
      <td>
        <button class="btn btn-sm edit-order-btn" data-id="${order.id}">
          <img src="../../../assets/icons/pencil.svg" width="18">
        </button>
      </td>
      <td>
        <button class="btn btn-sm delete-btn" data-id="${order.id}">
          <img src="../../../assets/icons/trashcan-black.svg" width="18">
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  attachDeleteHandlers();
  attachEditHandlers();
}

/* =========================
   LOAD CLIENTS FOR DROPDOWN
========================= */
async function loadClientsForDropdown() {
  const addSelect = document.getElementById("addCustomerId");
  const editSelect = document.getElementById("editCustomerId");

  try {
    const res = await fetch(`${API_BASE}/clients/`);
    const clients = await res.json();

    // Clear map before refilling
    clientsMap = {};

    clients.forEach(client => {
      clientsMap[client.id] = `${client.first_name} ${client.last_name}`;
    });

    if (addSelect) {
      addSelect.innerHTML = `<option value="" selected disabled hidden>Select Customer</option>`;
      clients.forEach(client => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = clientsMap[client.id];
        addSelect.appendChild(option);
      });
    }

    if (editSelect) {
      editSelect.innerHTML = `<option value="" selected disabled hidden>Select Customer</option>`;
      clients.forEach(client => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = clientsMap[client.id];
        editSelect.appendChild(option);
      });
    }

  } catch (err) {
    console.error("Failed to load clients", err);
  }
}


/* =========================
   DELETE ORDER
========================= */
let deleteOrderId = null;

function attachDeleteHandlers() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteOrderId = btn.dataset.id;
      document.getElementById("deleteOrderOverlay").classList.remove("d-none");
    });
  });
}

document.getElementById("confirmDeleteOrder")?.addEventListener("click", async () => {
  if (!deleteOrderId) return;

  try {
    await fetch(`${API_BASE}/client-orders/${deleteOrderId}`, {
      method: "DELETE"
    });

    document.getElementById("deleteOrderOverlay").classList.add("d-none");
    loadOrders();
  } catch (err) {
    console.error(err);
    alert("Failed to delete order");
  }
});

/* =========================
   EDIT HANDLER (overlay open only)
========================= */
function attachEditHandlers() {
  document.querySelectorAll(".edit-order-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const orderId = btn.dataset.id;

      try {
        const res = await fetch(`${API_BASE}/client-orders/${orderId}`);
        const order = await res.json();

        // Fill form fields
        document.getElementById("editCustomerId").value = order.client_id;
        document.getElementById("editCustomerId").disabled = true;

        document.getElementById("editModel").value = order.model;
        document.getElementById("editSize").value = order.size;
        document.getElementById("editMaterial").value = order.material;
        document.getElementById("editColor").value = order.color;
        document.getElementById("editHeelType").value = order.heel_type;
        document.getElementById("editHeelSize").value = order.heel_size;
        document.getElementById("editMold").value = order.mold;
        document.getElementById("editQuantity").value = order.quantity;
        document.getElementById("editPrice").value = order.price;

        const buckleValue = order.has_buckle ? "true" : "false";
        const slingValue = order.has_slingback ? "true" : "false";
        const platformValue = order.has_platform ? "true" : "false";

        const buckleRadio = document.querySelector(`input[name="editBuckle"][value="${buckleValue}"]`);
        const slingRadio = document.querySelector(`input[name="editSlingback"][value="${slingValue}"]`);
        const platformRadio = document.querySelector(`input[name="editPlatform"][value="${platformValue}"]`);

        if (buckleRadio) buckleRadio.checked = true;
        if (slingRadio) slingRadio.checked = true;
        if (platformRadio) platformRadio.checked = true;

        // Store order ID for update
        document.getElementById("editOrderOverlay").dataset.orderId = orderId;

        document.getElementById("editOrderOverlay").classList.remove("d-none");

      } catch (err) {
        console.error("Failed to load order for edit", err);
      }
    });
  });
}

