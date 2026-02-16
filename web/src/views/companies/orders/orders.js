import pencilIcon from '../../../assets/icons/pencil.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {

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

      saveToCache(ORDERS_URL, orders);

      // Filter orders to only those belonging to this company's clients
      allOrders = orders.filter(order => clientMap[order.client_id]);
      renderOrders(allOrders);
    } catch (err) {
      console.error("Failed to load orders:", err);
      tableBody.innerHTML = `
        <tr><td colspan="17" class="text-danger text-center">Failed to load orders</td></tr>
      `;
    }
  }

  /* ===============================
     RENDER ORDERS
  =============================== */
  function renderOrders(ordersArray) {
    tableBody.innerHTML = "";

    if (ordersArray.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="17" class="text-center text-muted">No orders found</td></tr>
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
      tr.dataset.id = order.id;
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
        <td>
          <button class="btn btn-sm edit-order-btn" data-id="${order.id}">
            <img src="${pencilIcon}" width="18">
          </button>
        </td>
        <td>
          <button class="btn btn-sm delete-btn" data-id="${order.id}">
            <img src="${trashIcon}" width="18">
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  function getFilteredOrders() {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = allOrders.filter(order => {
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
     FORM HELPERS
  =============================== */
  function getRadioValue(form, name) {
    const radios = form.querySelectorAll(`input[name="${name}"]`);
    // First radio = Yes, second = No
    return radios[0]?.checked ? true : false;
  }

  function setRadioValue(form, name, value) {
    const radios = form.querySelectorAll(`input[name="${name}"]`);
    if (radios.length >= 2) {
      radios[0].checked = !!value;
      radios[1].checked = !value;
    }
  }

  /* ===============================
     OVERLAY OPEN/CLOSE
  =============================== */
  // ADD
  document.querySelector(".add-order-btn")?.addEventListener("click", () => {
    addOverlay.classList.remove("d-none");
  });
  document.getElementById("closeAddOrder")?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });
  document.getElementById("cancelAddOrder")?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  // EDIT
  document.getElementById("closeEditOrder")?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });
  document.getElementById("cancelEditOrder")?.addEventListener("click", () => {
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

      try {
        const response = await apiFetch(`${ORDERS_URL}/${orderId}`);
        const order = await response.json();

        const form = editOverlay.querySelector("form");
        const selects = form.querySelectorAll("select");
        const inputs = form.querySelectorAll("input.form-control");

        // Customer select
        selects[0].value = order.client_id;
        // Style
        inputs[0].value = order.model || "";
        // Size
        inputs[1].value = order.size || "";
        // Material select
        selects[1].value = order.material || "";
        // Color
        inputs[2].value = order.color || "";
        // Heel type select
        selects[2].value = order.heel_type || "";
        // Heel size
        inputs[3].value = order.heel_size || "";
        // Mold select
        selects[3].value = order.mold || "";

        setRadioValue(form, "buckle", order.has_buckle);
        setRadioValue(form, "slingback", order.has_slingback);
        setRadioValue(form, "platform", order.has_platform);

        editOverlay.classList.remove("d-none");
      } catch (err) {
        console.error("Failed to load order:", err);
        alert("Failed to load order details");
      }
      return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      selectedOrderId = deleteBtn.dataset.id;
      deleteOverlay.classList.remove("d-none");
    }
  });

  /* ===============================
     ADD ORDER (form submit)
  =============================== */
  addOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

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

});
