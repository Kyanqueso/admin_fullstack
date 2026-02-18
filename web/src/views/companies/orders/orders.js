import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", async () => {

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

  async function loadCompanyName() {
    const heading = document.getElementById("companyTitle");
    const url = `${FAST_API_URL}/companies/${COMPANY_ID}`;

    const cached = getFromCache(url);
    if (cached) {
      heading.textContent = `${cached.name}'s Client Order List`;
      return;
    }

    try {
      const response = await apiFetch(url);
      const company = await response.json();
      saveToCache(url, company);
      heading.textContent = `${company.name}'s Client Order List`;
    } catch (error) {
      console.error("Failed to load company name:", error);
    }
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
  const tableBody = document.getElementById("ordersTableBody");
  const addOverlay = document.getElementById("addOrderOverlay");
  const editOverlay = document.getElementById("editOrderOverlay");
  const deleteOverlay = document.getElementById("deleteOrderOverlay");

  let selectedOrderId = null;
  let allOrders = [];
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

      const companyClients = allClients.filter(
        c => String(c.company_id) === String(COMPANY_ID)
      );

      clientMap = {};
      companyClients.forEach(c => {
        clientMap[c.id] = `${c.first_name} ${c.last_name}`;
      });

      populateClientDropdowns(companyClients);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }

  function populateClientDropdowns(clients) {
    const addSelect = document.getElementById("addCustomerId");
    const editSelect = document.getElementById("editCustomerId");

    [addSelect, editSelect].forEach(select => {
      if (!select) return;
      select.innerHTML = `<option value="" selected disabled hidden>Select Customer</option>`;
      clients.forEach(client => {
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
  function renderOrders(data) {
    tableBody.innerHTML = "";

    if (data.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="17" class="text-center text-muted">No orders found</td></tr>
      `;
      return;
    }

    data.forEach(order => {
      const row = document.createElement("tr");

      const total = (Number(order.price) * order.quantity)
        .toLocaleString('en-PH', { minimumFractionDigits: 2 });

      row.innerHTML = `
        <td>${order.id}</td>
        <td>${escapeHtml(clientMap[order.client_id] || String(order.client_id))}</td>
        <td>${escapeHtml(order.model)}</td>
        <td>${order.size}</td>
        <td>${escapeHtml(order.material)}</td>
        <td>${escapeHtml(order.color)}</td>
        <td>${escapeHtml(order.heel_type)}</td>
        <td>${order.heel_size}</td>
        <td>${escapeHtml(order.mold)}</td>
        <td>${order.has_buckle ? "Yes" : "No"}</td>
        <td>${order.has_slingback ? "Yes" : "No"}</td>
        <td>${order.has_platform ? "Yes" : "No"}</td>
        <td>${order.quantity}</td>
        <td>₱${Number(order.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td>₱${total}</td>
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

      tableBody.appendChild(row);
    });
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  document.getElementById("searchOrders")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allOrders.filter(order =>
      (clientMap[order.client_id] || "").toLowerCase().includes(term)
    );
    renderOrders(filtered);
  });

  document.getElementById("sortOrders")?.addEventListener("change", (e) => {
    const value = e.target.value;
    let sorted = [...allOrders];

    switch (value) {
      case "az":
        sorted.sort((a, b) =>
          (clientMap[a.client_id] || "").localeCompare(clientMap[b.client_id] || "")
        );
        break;
      case "za":
        sorted.sort((a, b) =>
          (clientMap[b.client_id] || "").localeCompare(clientMap[a.client_id] || "")
        );
        break;
      case "recent":
        sorted.sort((a, b) => b.id - a.id);
        break;
      case "oldest":
      case "orderid":
        sorted.sort((a, b) => a.id - b.id);
        break;
    }

    renderOrders(sorted);
  });

  /* ===============================
     ADD ORDER
  =============================== */
  document.getElementById("openOverlay")?.addEventListener("click", () => {
    addOverlay.classList.remove("d-none");
  });

  document.getElementById("closeAddOrder")?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  document.getElementById("cancelAddOrder")?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  document.getElementById("addOrderForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientId = document.getElementById("addCustomerId").value;
    if (!clientId) {
      alert("Please select a customer");
      return;
    }

    const payload = {
      client_id: Number(clientId),
      model: document.getElementById("addStyle").value.trim(),
      size: Number(document.getElementById("addSize").value) || 0,
      material: document.getElementById("addMaterial").value,
      color: document.getElementById("addColor").value.trim(),
      heel_type: document.getElementById("addHeelType").value,
      heel_size: Number(document.getElementById("addHeelSize").value) || 0,
      mold: document.getElementById("addMoldType").value,
      has_buckle: document.querySelector("input[name='addBuckle']:checked")?.value === "true",
      has_slingback: document.querySelector("input[name='addSling']:checked")?.value === "true",
      has_platform: document.querySelector("input[name='addPlatform']:checked")?.value === "true",
      quantity: Number(document.getElementById("addQuantity").value) || 1,
      price: Number(document.getElementById("addPrice").value) || 0,
    };

    const submitBtn = e.target.querySelector('[type="submit"]');
    const cancelBtn = document.getElementById("cancelAddOrder");
    const closeBtn = document.getElementById("closeAddOrder");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      submitBtn.textContent = "Adding...";

      await apiFetch(ORDERS_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      addOverlay.classList.add("d-none");
      e.target.reset();
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to add order:", err);
      alert("Failed to add order");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  });

  /* ===============================
     EDIT ORDER (open overlay on row button click)
  =============================== */
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-order-btn");
    if (editBtn) {
      const orderId = editBtn.dataset.id;
      selectedOrderId = orderId;

      try {
        const res = await apiFetch(`${ORDERS_URL}/${orderId}`);
        const order = await res.json();

        document.getElementById("editCustomerId").value = order.client_id;
        document.getElementById("editModel").value = order.model;
        document.getElementById("editSize").value = order.size;
        document.getElementById("editMaterial").value = order.material;
        document.getElementById("editColor").value = order.color;
        document.getElementById("editHeelType").value = order.heel_type;
        document.getElementById("editHeelSize").value = order.heel_size;
        document.getElementById("editMold").value = order.mold;
        document.getElementById("editQuantity").value = order.quantity;
        document.getElementById("editPrice").value = order.price;

        const buckleVal = order.has_buckle ? "true" : "false";
        const slingVal = order.has_slingback ? "true" : "false";
        const platformVal = order.has_platform ? "true" : "false";

        const buckleRadio = document.querySelector(`input[name="editBuckle"][value="${buckleVal}"]`);
        const slingRadio = document.querySelector(`input[name="editSlingback"][value="${slingVal}"]`);
        const platformRadio = document.querySelector(`input[name="editPlatform"][value="${platformVal}"]`);

        if (buckleRadio) buckleRadio.checked = true;
        if (slingRadio) slingRadio.checked = true;
        if (platformRadio) platformRadio.checked = true;

        editOverlay.classList.remove("d-none");
      } catch (err) {
        console.error("Failed to load order for edit", err);
      }
      return;
    }

    /* DELETE BUTTON - open overlay */
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      selectedOrderId = deleteBtn.dataset.id;
      deleteOverlay.classList.remove("d-none");
    }
  });

  /* ===============================
     EDIT ORDER (form submit)
  =============================== */
  document.getElementById("editOrderForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      model: document.getElementById("editModel").value.trim(),
      size: Number(document.getElementById("editSize").value) || 0,
      material: document.getElementById("editMaterial").value,
      color: document.getElementById("editColor").value.trim(),
      heel_type: document.getElementById("editHeelType").value,
      heel_size: Number(document.getElementById("editHeelSize").value) || 0,
      mold: document.getElementById("editMold").value,
      has_buckle: document.querySelector("input[name='editBuckle']:checked")?.value === "true",
      has_slingback: document.querySelector("input[name='editSlingback']:checked")?.value === "true",
      has_platform: document.querySelector("input[name='editPlatform']:checked")?.value === "true",
      quantity: parseInt(document.getElementById("editQuantity").value),
      price: Number(document.getElementById("editPrice").value),
    };

    const submitBtn = e.target.querySelector('[type="submit"]');
    const cancelBtn = document.getElementById("cancelEditOrder");
    const closeBtn = document.getElementById("closeEditOrder");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      submitBtn.textContent = "Saving...";

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
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  });

  /* ===============================
     EDIT / DELETE OVERLAY CLOSE BUTTONS
  =============================== */
  document.getElementById("closeEditOrder")?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  document.getElementById("cancelEditOrder")?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  document.getElementById("closeDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

  document.getElementById("cancelDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

  /* ===============================
     DELETE ORDER
  =============================== */
  document.getElementById("confirmDeleteOrder")?.addEventListener("click", async () => {
    if (!selectedOrderId) return;

    const confirmBtn = document.getElementById("confirmDeleteOrder");
    const cancelBtn = document.getElementById("cancelDeleteOrder");
    const closeBtn = document.getElementById("closeDeleteOrder");
    const originalText = confirmBtn.textContent;

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      confirmBtn.textContent = "Deleting...";

      await apiFetch(`${ORDERS_URL}/${selectedOrderId}`, {
        method: "DELETE"
      });

      deleteOverlay.classList.add("d-none");
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to delete order:", err);
      alert("Failed to delete order");
    } finally {
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  });

  /* ===============================
     INIT
  =============================== */
  loadCompanyName();
  await loadCompanyClients();
  await loadOrders();
});
