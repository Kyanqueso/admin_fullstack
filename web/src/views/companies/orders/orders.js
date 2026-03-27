import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", async () => {

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
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

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(e => e.msg).join(", ");
          } else {
            errorMessage = errorData.detail;
          }
        }
      } catch {
        // Response body was not JSON; keep default message
      }
      throw new Error(errorMessage);
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
     VALIDATION HELPERS
  =============================== */
  const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}]/u;

  function blockEmoji(inputEl) {
    inputEl.addEventListener("input", () => {
      const before = inputEl.value;
      const after = before.replace(EMOJI_REGEX, "").replace(/[^\w\s\-'&.,#/()]/gu, "");
      if (before !== after) {
        const cursor = inputEl.selectionStart - (before.length - after.length);
        inputEl.value = after;
        inputEl.setSelectionRange(cursor, cursor);
      }
    });
  }

  // Attach emoji blocking to all free-text inputs
  ["addStyle", "addColor", "addHeelSize", "editModel", "editColor", "editHeelSize"].forEach(id => {
    const el = document.getElementById(id);
    if (el) blockEmoji(el);
  });

  // Size inputs: only allow digits and one decimal point
  ["addSize", "editSize"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      // Keep only digits and at most one decimal
      let val = el.value.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
      el.value = val;
    });
  });

  // Quantity and Price: only allow digits and decimal
  ["addQuantity", "addPrice", "editQuantity", "editPrice"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      let val = el.value.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
      el.value = val;
    });
  });

  /* ===============================
     BOOTSTRAP FIELD ERROR HELPERS
  =============================== */
  function showFieldError(inputEl, message) {
    clearFieldError(inputEl);
    inputEl.classList.add("is-invalid");
    const feedback = document.createElement("div");
    feedback.className = "invalid-feedback";
    feedback.textContent = message;
    inputEl.parentNode.appendChild(feedback);
  }

  function clearFieldError(inputEl) {
    inputEl.classList.remove("is-invalid");
    const existing = inputEl.parentNode.querySelector(".invalid-feedback");
    if (existing) existing.remove();
  }

  function showFormError(formEl, message) {
    clearFormError(formEl);
    const alert = document.createElement("div");
    alert.className = "alert alert-danger mt-2 form-error-banner";
    alert.role = "alert";
    alert.textContent = message;
    formEl.prepend(alert);
  }

  function clearFormError(formEl) {
    const existing = formEl.querySelector(".form-error-banner");
    if (existing) existing.remove();
  }

  function clearAllErrors(formEl) {
    clearFormError(formEl);
    formEl.querySelectorAll(".is-invalid").forEach(el => clearFieldError(el));
  }

  /* ===============================
     VALIDATE ORDER FORM
     Returns true if valid, false + shows errors if not
  =============================== */
  function validateOrderForm(prefix) {
    const isAdd = prefix === "add";
    let valid = true;

    // Customer (add only — edit is disabled)
    if (isAdd) {
      const customerEl = document.getElementById("addCustomerId");
      if (!customerEl.value) {
        showFieldError(customerEl, "Please select a customer.");
        valid = false;
      } else {
        clearFieldError(customerEl);
      }
    }

    // Style / Model
    const styleId = isAdd ? "addStyle" : "editModel";
    const styleEl = document.getElementById(styleId);
    const styleVal = styleEl.value.trim();
    if (!styleVal) {
      showFieldError(styleEl, "Style cannot be empty.");
      valid = false;
    } else if (EMOJI_REGEX.test(styleVal)) {
      showFieldError(styleEl, "Style must not contain emojis.");
      valid = false;
    } else if (styleVal.length > 64) {
      showFieldError(styleEl, "Style must not exceed 64 characters.");
      valid = false;
    } else {
      clearFieldError(styleEl);
    }

    // MODIFIED — added max limit check
    const sizeEl = document.getElementById(isAdd ? "addSize" : "editSize");
    const sizeRaw = sizeEl.value.trim();
    const sizeNum = parseFloat(sizeRaw);

    if (!sizeRaw || isNaN(sizeNum) || sizeNum <= 0) {
      showFieldError(sizeEl, "Size must be a positive number.");
      valid = false;

    } else if (sizeNum > 99.99) { // ✅ ADDED
      showFieldError(sizeEl, "Size is too large.");
      valid = false;

    } else if ((sizeNum * 10) % 5 !== 0) {
      showFieldError(sizeEl, "Size must end in .0 or .5 (e.g. 5.0, 5.5).");
      valid = false;

    } else {
      clearFieldError(sizeEl);
    }

    // Material
    const materialEl = document.getElementById(isAdd ? "addMaterial" : "editMaterial");
    if (!materialEl.value) {
      showFieldError(materialEl, "Please select a material.");
      valid = false;
    } else {
      clearFieldError(materialEl);
    }

    // Color
    const colorEl = document.getElementById(isAdd ? "addColor" : "editColor");
    const colorVal = colorEl.value.trim();
    if (!colorVal) {
      showFieldError(colorEl, "Color cannot be empty.");
      valid = false;
    } else if (EMOJI_REGEX.test(colorVal)) {
      showFieldError(colorEl, "Color must not contain emojis.");
      valid = false;
    } else {
      clearFieldError(colorEl);
    }

    // Heel Type
    const heelTypeEl = document.getElementById(isAdd ? "addHeelType" : "editHeelType");
    if (!heelTypeEl.value) {
      showFieldError(heelTypeEl, "Please select a heel type.");
      valid = false;
    } else {
      clearFieldError(heelTypeEl);
    }

    // Heel Size — must be numeric, ≥ 0, in .5 increments
    // MODIFIED
    const heelSizeEl = document.getElementById(isAdd ? "addHeelSize" : "editHeelSize");

    if (!heelSizeEl.value) {
      showFieldError(heelSizeEl, "Please select a heel size.");
      valid = false;
    } else {
      clearFieldError(heelSizeEl);
    }

    // Mold Type
    const moldEl = document.getElementById(isAdd ? "addMoldType" : "editMold");
    if (!moldEl.value) {
      showFieldError(moldEl, "Please select a mold type.");
      valid = false;
    } else {
      clearFieldError(moldEl);
    }

    // Quantity
    const qtyEl = document.getElementById(isAdd ? "addQuantity" : "editQuantity");
    const qtyRaw = qtyEl.value.trim();
    const qtyNum = parseInt(qtyRaw, 10);
    if (!qtyRaw || isNaN(qtyNum) || qtyNum <= 0) {
      showFieldError(qtyEl, "Quantity must be a positive whole number.");
      valid = false;
    } else if (!Number.isInteger(Number(qtyRaw))) {
      showFieldError(qtyEl, "Quantity must be a whole number.");
      valid = false;
    } else {
      clearFieldError(qtyEl);
    }

    // Price
    const priceEl = document.getElementById(isAdd ? "addPrice" : "editPrice");
    const priceRaw = priceEl.value.trim();
    const priceNum = parseFloat(priceRaw);
    if (!priceRaw || isNaN(priceNum) || priceNum <= 0) {
      showFieldError(priceEl, "Price must be a positive number.");
      valid = false;
    } else {
      clearFieldError(priceEl);
    }

    return valid;
  }

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
        <tr><td colspan="17" class="text-danger text-center">Failed to load orders: ${escapeHtml(err.message)}</td></tr>
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
    const form = document.getElementById("addOrderForm");
    clearAllErrors(form);
    addOverlay.classList.remove("d-none");
  });

  document.getElementById("closeAddOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("addOrderForm"));
    addOverlay.classList.add("d-none");
  });

  document.getElementById("cancelAddOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("addOrderForm"));
    addOverlay.classList.add("d-none");
  });

  document.getElementById("addOrderForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    clearFormError(form);

    if (!validateOrderForm("add")) return;

    const payload = {
      client_id: Number(document.getElementById("addCustomerId").value),
      model: document.getElementById("addStyle").value.trim(),
      size: parseFloat(document.getElementById("addSize").value),
      material: document.getElementById("addMaterial").value,
      color: document.getElementById("addColor").value.trim(),
      heel_type: document.getElementById("addHeelType").value,
      heel_size: document.getElementById("addHeelSize").value,
      mold: document.getElementById("addMoldType").value,
      has_buckle: document.querySelector("input[name='addBuckle']:checked")?.value === "true",
      has_slingback: document.querySelector("input[name='addSling']:checked")?.value === "true",
      has_platform: document.querySelector("input[name='addPlatform']:checked")?.value === "true",
      quantity: parseInt(document.getElementById("addQuantity").value, 10),
      price: parseFloat(document.getElementById("addPrice").value),
    };

    const submitBtn = form.querySelector('[type="submit"]');
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
      form.reset();
      clearAllErrors(form);
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to add order:", err);
      showFormError(form, err.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  });

  /* ===============================
     EDIT ORDER (open overlay)
  =============================== */
document.addEventListener("click", async (e) => {

  /* ================= EDIT BUTTON ================= */
  const editBtn = e.target.closest(".edit-order-btn");
  if (editBtn) {
    const orderId = editBtn.dataset.id;
    selectedOrderId = orderId;

    try {
      const res = await apiFetch(`${ORDERS_URL}/${orderId}`);
      const order = await res.json();

      document.getElementById("editCustomerId").value = order.client_id;
      document.getElementById("editModel").value = order.model;
      document.getElementById("editSize").value = Number(order.size).toFixed(1);
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

      clearAllErrors(document.getElementById("editOrderForm"));
      editOverlay.classList.remove("d-none");

    } catch (err) {
      console.error("Failed to load order for edit:", err);

      if (err.message.toLowerCase().includes("not found")) {
        clearCache();
        await loadOrders();

        const banner = document.createElement("div");
        banner.className = "alert alert-success alert-dismissible fade show mx-0 mt-2";
        banner.innerHTML = `Order already completed.
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.querySelector("h2").insertAdjacentElement("afterend", banner);

        return;
      }

      const banner = document.createElement("div");
      banner.className = "alert alert-danger alert-dismissible fade show mx-0 mt-2";
      banner.innerHTML = `Failed to load order: ${escapeHtml(err.message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
      document.querySelector("h2").insertAdjacentElement("afterend", banner);
    }

    return; // ✅ IMPORTANT FIX
  }

  /* ================= DELETE BUTTON ================= */
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    selectedOrderId = deleteBtn.dataset.id;
    deleteOverlay.classList.remove("d-none");
    return;
  }

});
  /* ===============================
     EDIT ORDER (form submit)
  =============================== */
  document.getElementById("editOrderForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    clearFormError(form);

    if (!validateOrderForm("edit")) return;

    const payload = {
      model: document.getElementById("editModel").value.trim(),
      size: parseFloat(document.getElementById("editSize").value),
      material: document.getElementById("editMaterial").value,
      color: document.getElementById("editColor").value.trim(),
      heel_type: document.getElementById("editHeelType").value,
      heel_size: document.getElementById("editHeelSize").value,
      mold: document.getElementById("editMold").value,
      has_buckle: document.querySelector("input[name='editBuckle']:checked")?.value === "true",
      has_slingback: document.querySelector("input[name='editSlingback']:checked")?.value === "true",
      has_platform: document.querySelector("input[name='editPlatform']:checked")?.value === "true",
      quantity: parseInt(document.getElementById("editQuantity").value, 10),
      price: parseFloat(document.getElementById("editPrice").value),
    };

    const submitBtn = form.querySelector('[type="submit"]');
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
      clearAllErrors(form);
      clearCache();
      await loadOrders();
    } catch (err) {
      console.error("Failed to update order:", err);
      showFormError(form, err.message);
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
    clearAllErrors(document.getElementById("editOrderForm"));
    editOverlay.classList.add("d-none");
  });

  document.getElementById("cancelEditOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("editOrderForm"));
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
      // Show error inside the delete overlay itself
      const overlay = document.getElementById("deleteOrderOverlay");
      let banner = overlay.querySelector(".delete-error-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "alert alert-danger mt-3 delete-error-banner";
        overlay.querySelector(".overlay-content").appendChild(banner);
      }
      banner.textContent = err.message;
    } finally {
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  });

  // Clear delete error when overlay is closed
  ["closeDeleteOrder", "cancelDeleteOrder"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => {
      const banner = document.querySelector(".delete-error-banner");
      if (banner) banner.remove();
    });
  });

  /* ===============================
     INIT
  =============================== */
  loadCompanyName();
  await loadCompanyClients();
  await loadOrders();
});