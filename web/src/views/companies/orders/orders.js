import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import archiveIcon from '../../../assets/icons/archive.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

window.addEventListener('pageshow', () => {
    if (!localStorage.getItem('access_token')) window.location.href = '/403.html';
});

document.addEventListener("DOMContentLoaded", async () => {

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const ORDERS_URL = `${FAST_API_URL}/client-orders`;
  const CLIENTS_URL = `${FAST_API_URL}/clients`;
  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  if (!COMPANY_ID) {
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
      window.location.href = "/403.html";
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
      window.location.href = "/403.html";
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
  const addOrderBtn = document.getElementById("openOverlay");

  let selectedOrderId = null;
  let allOrders = [];
  let clientMap = {};
  let currentTab = 'active';
  let isPermanentDelete = false;
  let formIsDirty = false;
  let currentPage = 1;
  let itemsPerPage = 20;
  let currentFilteredData = [];

  /* ===============================
     REFRESH WARNING
  =============================== */
  const refreshWarningOverlay = document.getElementById('refresh-warning-overlay');
  function showRefreshWarning() { refreshWarningOverlay.classList.remove('d-none'); }
  function hideRefreshWarning() { refreshWarningOverlay.classList.add('d-none'); }
  document.getElementById('refresh-stay').addEventListener('click', hideRefreshWarning);
  document.getElementById('refresh-leave').addEventListener('click', () => {
    setFormClean();
    hideRefreshWarning();
    location.reload();
  });
  function handleBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
  window.addEventListener('keydown', (e) => {
    if (!formIsDirty) return;
    const isReload = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r';
    const isHardReload = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r';
    if (!isReload && !isHardReload) return;
    e.preventDefault();
    showRefreshWarning();
  }, true);
  function setFormDirty() { formIsDirty = true; window.addEventListener('beforeunload', handleBeforeUnload); }
  function setFormClean() { formIsDirty = false; window.removeEventListener('beforeunload', handleBeforeUnload); }

  /* ===============================
     VALIDATION HELPERS
  =============================== */
  const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

  function blockEmoji(inputEl) {
    inputEl.addEventListener("input", () => {
      const before = inputEl.value;
      const after = before.replace(/\p{Extended_Pictographic}/gu, "").replace(/[^\w\s\-'&.,#/()]/gu, "");
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

  // Size inputs: allow digits, one decimal, one leading minus; clamp to -1..12; step 0.5
  ["addSize", "editSize"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      let val = el.value.replace(/[^0-9.-]/g, "");

      // Allow only ONE minus at start
      if (val.includes("-")) {
        val = "-" + val.replace(/-/g, "");
      }

      // Allow only ONE decimal
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }

      // Skip while typing incomplete decimals (e.g. "10.", "-0.")
      if (!val.endsWith(".")) {
        let num = parseFloat(val);

        if (!isNaN(num)) {
          // Clamp to range -1..12
          num = Math.max(-1, Math.min(12, num));

          // Snap to nearest 0.5
          num = Math.round(num * 2) / 2;

          val = num.toString();
        }
      }

      el.value = val;
    });
  });

  // Quantity and Price: only allow digits and decimal
  ["addQuantity", "editQuantity"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      el.value = el.value.replace(/[^0-9]/g, "").slice(0, 5);
    });
  });

  ["addPrice", "editPrice"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      let val = el.value.replace(/[^0-9.]/g, "");

      const dotIndex = val.indexOf(".");
      if (dotIndex !== -1) {
        const intPart = val.slice(0, dotIndex).slice(0, 7);
        const decPart = val.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
        val = intPart + "." + decPart;
      } else {
        val = val.slice(0, 7);
      }

      // Cap at 1,000,000
      const num = parseFloat(val);
      if (!isNaN(num) && num > 1000000) val = "1000000";

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
      const customerSearchEl = document.getElementById("addCustomerSearch");
      const customerHiddenEl = document.getElementById("addCustomerId");
      if (!customerHiddenEl.value) {
        showFieldError(customerSearchEl, "Please select a customer from the list.");
        valid = false;
      } else {
        clearFieldError(customerSearchEl);
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
    } else if (styleVal.length > 50) {
      showFieldError(styleEl, "Style must not exceed 50 characters.");
      valid = false;
    } else {
      clearFieldError(styleEl);
    }

    const sizeEl = document.getElementById(isAdd ? "addSize" : "editSize");
    const sizeRaw = sizeEl.value.trim();
    const sizeNum = parseFloat(sizeRaw);

    if (!sizeRaw || isNaN(sizeNum)) {
      showFieldError(sizeEl, "Size is required.");
      valid = false;

    } else if (sizeNum < -1 || sizeNum > 12) {
      showFieldError(sizeEl, "Size must be between -1 and 12.");
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
    } else if (colorVal.length > 32) {
      showFieldError(colorEl, "Color must not exceed 32 characters.");
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

    // Heel Size
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
    if (!priceRaw || isNaN(priceNum) || priceNum < 1) {
      showFieldError(priceEl, "Price must be ₱1.00 or greater.");
      valid = false;
    } else if ((priceRaw.split(".")[1] || "").length > 2) {
      showFieldError(priceEl, "Price cannot have more than 2 decimal places.");
      valid = false;
    } else if (priceNum > 1000000) {
      showFieldError(priceEl, "Price cannot exceed ₱1,000,000.00.");
      valid = false;
    } else {
      clearFieldError(priceEl);
    }

    return valid;
  }

  /* ===============================
     TAB SETUP
  =============================== */
  function setTabUI(tab) {
    const activeBtn = document.getElementById('activeTabBtn');
    const archiveBtn = document.getElementById('archiveTabBtn');
    activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
    archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';

    // Update table headers for last 2 columns
    const ths = document.querySelectorAll('thead th');
    if (tab === 'archive') {
      if (ths[16]) ths[16].textContent = 'Restore';
      if (ths[17]) ths[17].textContent = 'Delete';
    } else {
      if (ths[16]) ths[16].textContent = 'Edit';
      if (ths[17]) ths[17].textContent = 'Archive';
    }

    // Show/hide Add button
    if (addOrderBtn) {
      addOrderBtn.style.display = tab === 'active' ? '' : 'none';
    }
  }

  document.getElementById('activeTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'active') return;
    currentTab = 'active';
    setTabUI('active');
    await loadOrders();
  });

  document.getElementById('archiveTabBtn')?.addEventListener('click', async () => {
    if (currentTab === 'archive') return;
    currentTab = 'archive';
    setTabUI('archive');
    await loadOrders();
  });

  /* ===============================
     LOAD CLIENTS (for dropdowns & name display)
     — clientMap includes active + archived for name lookup
     — dropdowns only get active clients
  =============================== */
  async function loadCompanyClients() {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        apiFetch(`${CLIENTS_URL}?company_id=${COMPANY_ID}`),
        apiFetch(`${CLIENTS_URL}?company_id=${COMPANY_ID}&archived=true`)
      ]);
      const activeClients = await activeRes.json();
      const archivedClients = await archivedRes.json();

      clientMap = {};
      [...activeClients, ...archivedClients].forEach(c => {
        clientMap[c.id] = `${c.first_name} ${c.last_name}`;
      });

      populateClientDropdowns(activeClients);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }

  let activeClientsList = [];

  function populateClientDropdowns(clients) {
    activeClientsList = clients;

    // Edit select (standard — disabled anyway)
    const editSelect = document.getElementById("editCustomerId");
    if (editSelect) {
      editSelect.innerHTML = `<option value="" selected disabled hidden>Select Customer</option>`;
      clients.forEach(client => {
        const opt = document.createElement("option");
        opt.value = client.id;
        opt.textContent = `${client.first_name} ${client.last_name}`;
        editSelect.appendChild(opt);
      });
    }

    // Add customer: searchable dropdown
    const searchInput = document.getElementById("addCustomerSearch");
    const dropdown = document.getElementById("addCustomerDropdown");
    const hiddenInput = document.getElementById("addCustomerId");
    if (!searchInput || !dropdown || !hiddenInput) return;

    function renderDropdown(filtered) {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="px-3 py-2 text-muted" style="font-size:0.9rem;">No customers found</div>`;
      } else {
        filtered.forEach(client => {
          const item = document.createElement("div");
          item.className = "px-3 py-2";
          item.style.cssText = "cursor:pointer;font-size:0.95rem;";
          item.textContent = `${client.first_name} ${client.last_name}`;
          item.addEventListener("mouseenter", () => item.style.background = "#f0f0f0");
          item.addEventListener("mouseleave", () => item.style.background = "");
          item.addEventListener("mousedown", () => {
            hiddenInput.value = client.id;
            searchInput.value = `${client.first_name} ${client.last_name}`;
            clearFieldError(searchInput);
            dropdown.style.display = "none";
          });
          dropdown.appendChild(item);
        });
      }
      dropdown.style.display = "block";
    }

    searchInput.addEventListener("input", () => {
      hiddenInput.value = "";
      const term = searchInput.value.toLowerCase();
      if (!term) { dropdown.style.display = "none"; return; }
      const filtered = activeClientsList.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(term)
      );
      renderDropdown(filtered);
    });

    searchInput.addEventListener("focus", () => {
      if (searchInput.value && activeClientsList.length) {
        const term = searchInput.value.toLowerCase();
        renderDropdown(activeClientsList.filter(c =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(term)
        ));
      }
    });

    document.addEventListener("click", e => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    }, { capture: true });
  }

  /* ===============================
     LOAD ORDERS
  =============================== */
  async function loadOrders() {
    tableBody.innerHTML = `
      <tr><td colspan="17" class="text-center"><div class="spinner-border"></div></td></tr>
    `;

    try {
      let url;
      if (currentTab === 'archive') {
        url = `${ORDERS_URL}?archived=true&completed=false`;
      } else {
        url = `${ORDERS_URL}?completed=false`;
      }

      const response = await apiFetch(url);
      const orders = await response.json();

      // Filter to only this company's orders (clientMap covers active + archived clients of this company)
      allOrders = orders.filter(order => clientMap[order.client_id] !== undefined);
      applySearchAndSort();

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
      const label = currentTab === 'archive' ? 'archived orders' : 'orders';
      tableBody.innerHTML = `
        <tr><td colspan="17" class="text-center text-muted">No ${label} found</td></tr>
      `;
      return;
    }

    data.forEach(order => {
      const row = document.createElement("tr");

      const total = (Number(order.price) * order.quantity)
        .toLocaleString('en-PH', { minimumFractionDigits: 2 });

      let actionCells;
      if (currentTab === 'archive') {
        actionCells = `
          <td>
            <button class="btn btn-sm btn-warning restore-order-btn" data-id="${order.id}">Restore</button>
          </td>
          <td>
            <button class="btn btn-sm btn-danger perm-delete-order-btn" data-id="${order.id}">Delete</button>
          </td>
        `;
      } else {
        actionCells = `
          <td>
            <button class="btn btn-sm edit-order-btn" data-id="${order.id}">
              <img src="${pencilIcon}" width="18">
            </button>
          </td>
          <td>
            <button class="btn btn-sm delete-btn" data-id="${order.id}">
              <img src="${archiveIcon}" width="18">
            </button>
          </td>
        `;
      }

      row.innerHTML = `
        <td>${order.id}</td>
        <td>${escapeHtml(clientMap[order.client_id] || String(order.client_id))}</td>
        <td>${order.order_date ? new Date(order.order_date).toLocaleDateString('en-PH') : '—'}</td>
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

      tableBody.appendChild(row);
    });
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  function applySearchAndSort() {
    const term = (document.getElementById("searchOrders")?.value || "").toLowerCase().trim();
    const sortValue = document.getElementById("sortOrders")?.value || "";

    let result = allOrders.filter(order =>
      (clientMap[order.client_id] || "").toLowerCase().includes(term)
    );

    if (sortValue === "az") {
      result.sort((a, b) => (clientMap[a.client_id] || "").localeCompare(clientMap[b.client_id] || ""));
    } else if (sortValue === "za") {
      result.sort((a, b) => (clientMap[b.client_id] || "").localeCompare(clientMap[a.client_id] || ""));
    } else if (sortValue === "recent") {
      result.sort((a, b) => b.id - a.id);
    } else if (sortValue === "oldest") {
      result.sort((a, b) => a.id - b.id);
    } else if (sortValue === "newest-date") {
      result.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    } else if (sortValue === "oldest-date") {
      result.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
    }

    currentFilteredData = result;
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (currentPage - 1) * itemsPerPage;
    renderOrders(currentFilteredData.slice(start, start + itemsPerPage));
    renderPagination(currentFilteredData.length);
  }

  function renderPagination(total) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    function pageRange(curr, tot) {
      if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
      if (curr <= 4) return [1, 2, 3, 4, 5, '...', tot];
      if (curr >= tot - 3) return [1, '...', tot - 4, tot - 3, tot - 2, tot - 1, tot];
      return [1, '...', curr - 1, curr, curr + 1, '...', tot];
    }

    const btns = pageRange(currentPage, totalPages).map(p =>
      p === '...'
        ? `<span class="px-1 align-self-center text-muted">…</span>`
        : `<button class="btn btn-sm ${p === currentPage ? 'btn-dark' : 'btn-outline-secondary'} page-btn" data-page="${p}">${p}</button>`
    ).join('');

    const opts = [20, 50, 100].map(n =>
      `<option value="${n}"${n === itemsPerPage ? ' selected' : ''}>${n} per page</option>`
    ).join('');

    container.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mt-3 mb-2 flex-wrap gap-2">
        <select class="form-select form-select-sm" id="per-page-select" style="width:auto;">${opts}</select>
        <div class="d-flex align-items-center gap-1 flex-wrap">
          <button class="btn btn-sm btn-outline-secondary" id="prev-page-btn"${currentPage === 1 ? ' disabled' : ''}>‹</button>
          ${btns}
          <button class="btn btn-sm btn-outline-secondary" id="next-page-btn"${currentPage === totalPages ? ' disabled' : ''}>›</button>
        </div>
        <small class="text-muted">${total} total</small>
      </div>
    `;

    document.getElementById('per-page-select').addEventListener('change', e => {
      itemsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderPage();
    });
    document.getElementById('prev-page-btn').addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(); }
    });
    document.getElementById('next-page-btn').addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(); }
    });
    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderPage();
      });
    });
  }

  document.getElementById("searchOrders")?.addEventListener("input", applySearchAndSort);
  document.getElementById("sortOrders")?.addEventListener("change", applySearchAndSort);

  /* ===============================
     ADD ORDER
  =============================== */
  document.getElementById("openOverlay")?.addEventListener("click", () => {
    const form = document.getElementById("addOrderForm");
    clearAllErrors(form);
    addOverlay.classList.remove("d-none");
    setFormDirty();
  });

  function resetAddCustomerSearch() {
    const s = document.getElementById("addCustomerSearch");
    const h = document.getElementById("addCustomerId");
    const d = document.getElementById("addCustomerDropdown");
    if (s) s.value = "";
    if (h) h.value = "";
    if (d) d.style.display = "none";
  }

  document.getElementById("closeAddOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("addOrderForm"));
    resetAddCustomerSearch();
    setFormClean();
    addOverlay.classList.add("d-none");
  });

  document.getElementById("cancelAddOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("addOrderForm"));
    resetAddCustomerSearch();
    setFormClean();
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

      setFormClean();
      addOverlay.classList.add("d-none");
      form.reset();
      resetAddCustomerSearch();
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
     CLICK DELEGATION
  =============================== */
  document.addEventListener("click", async (e) => {

    /* RESTORE ORDER (archive tab) — open confirm overlay */
    const restoreBtn = e.target.closest(".restore-order-btn");
    if (restoreBtn) {
      selectedOrderId = restoreBtn.dataset.id;
      const errEl = document.getElementById("restoreOrderError");
      if (errEl) { errEl.classList.add("d-none"); errEl.textContent = ""; }
      document.getElementById("restoreOrderOverlay").classList.remove("d-none");
      return;
    }

    /* PERMANENT DELETE (archive tab) */
    const permDeleteBtn = e.target.closest(".perm-delete-order-btn");
    if (permDeleteBtn) {
      selectedOrderId = permDeleteBtn.dataset.id;
      isPermanentDelete = true;
      document.querySelector("#deleteOrderOverlay h5").innerHTML =
        "Permanently delete this order?<br>This cannot be undone.";
      deleteOverlay.classList.remove("d-none");
      return;
    }

    /* EDIT BUTTON (active tab) */
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
        setFormDirty();

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

      return;
    }

    /* SOFT DELETE (active tab) */
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      selectedOrderId = deleteBtn.dataset.id;
      isPermanentDelete = false;
      document.querySelector("#deleteOrderOverlay h5").textContent =
        "Are you sure you want to archive this order?";
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

      setFormClean();
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
    setFormClean();
    editOverlay.classList.add("d-none");
  });

  document.getElementById("cancelEditOrder")?.addEventListener("click", () => {
    clearAllErrors(document.getElementById("editOrderForm"));
    setFormClean();
    editOverlay.classList.add("d-none");
  });

  document.getElementById("closeDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
    isPermanentDelete = false;
  });

  document.getElementById("cancelDeleteOrder")?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
    isPermanentDelete = false;
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
      confirmBtn.textContent = isPermanentDelete ? "Deleting..." : "Archiving...";

      const url = isPermanentDelete
        ? `${ORDERS_URL}/${selectedOrderId}/permanent`
        : `${ORDERS_URL}/${selectedOrderId}`;

      await apiFetch(url, { method: "DELETE" });

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
      isPermanentDelete = false;
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
     RESTORE ORDER OVERLAY
  =============================== */
  function closeRestoreOrderOverlay() {
    document.getElementById("restoreOrderOverlay").classList.add("d-none");
    const errEl = document.getElementById("restoreOrderError");
    if (errEl) { errEl.classList.add("d-none"); errEl.textContent = ""; }
  }

  document.getElementById("closeRestoreOrder")?.addEventListener("click", closeRestoreOrderOverlay);
  document.getElementById("cancelRestoreOrder")?.addEventListener("click", closeRestoreOrderOverlay);

  document.getElementById("confirmRestoreOrder")?.addEventListener("click", async () => {
    if (!selectedOrderId) return;
    const confirmBtn = document.getElementById("confirmRestoreOrder");
    const cancelBtn = document.getElementById("cancelRestoreOrder");
    const closeBtn = document.getElementById("closeRestoreOrder");
    const errEl = document.getElementById("restoreOrderError");
    const originalText = confirmBtn.textContent;

    if (errEl) errEl.classList.add("d-none");

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      confirmBtn.textContent = "Restoring...";

      await apiFetch(`${ORDERS_URL}/${selectedOrderId}/restore`, { method: "PATCH" });

      closeRestoreOrderOverlay();
      selectedOrderId = null;
      clearCache();
      await loadOrders();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || "Failed to restore order.";
        errEl.classList.remove("d-none");
      }
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