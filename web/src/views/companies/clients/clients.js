import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import archiveIcon from '../../../assets/icons/archive.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("CLIENTS JS LOADED");

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const API_URL = `${FAST_API_URL}/clients`;

  console.log("Clients API URL:", API_URL);

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

  // ERROR HANDLING
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

    // AUTH ERROR
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("access_token");
      window.location.href = "/403.html";
      throw new Error("Unauthorized");
    }

    // HANDLE OTHER ERRORS
    if (!response.ok) {
      let errorMsg = "Request failed";

      try {
        const errData = await response.json();

        if (errData.detail) {
          if (Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map(e => e.msg || JSON.stringify(e)).join(", ");
          } else {
            errorMsg = errData.detail;
          }
        } else {
          errorMsg = JSON.stringify(errData);
        }

      } catch {
        errorMsg = response.statusText || "Request failed";
      }

      throw new Error(errorMsg);
    }

    return response;
  }

  async function loadCompanyName() {
    const heading = document.getElementById("companyTitle");
    const url = `${FAST_API_URL}/companies/${COMPANY_ID}`;

    const cached = getFromCache(url);
    if (cached) {
      heading.textContent = `${cached.name}'s Client List`;
      return;
    }

    try {
      const response = await apiFetch(url);
      const company = await response.json();

      saveToCache(url, company);
      heading.textContent = `${company.name}'s Client List`;

    } catch (error) {
      console.error("Failed to load company name:", error);
      heading.textContent = "Client List";
    }
  }

  /* ===============================
     DOM ELEMENTS
  =============================== */
  const tableBody = document.querySelector("tbody");

  const addOverlay = document.getElementById("addClientOverlay");
  const openAddBtn = document.getElementById("openOverlay");
  const closeAddBtn = document.getElementById("closeOverlay");
  const cancelAddBtn = document.getElementById("cancelOverlay");

  const notesOverlay = document.getElementById("clientNotesOverlay");
  const editOverlay = document.getElementById("editClientOverlay");
  const deleteOverlay = document.getElementById("deleteClientOverlay");

  const notesTextarea = notesOverlay.querySelector("textarea");
  const editFirstName = document.getElementById("editFirstName");
  const editLastName = document.getElementById("editLastName");
  const editAddress = document.getElementById("editAddress");
  const editViber = document.getElementById("editViber");

  const searchInput = document.querySelector('input[placeholder="Search name"]');
  const sortSelect = document.querySelector(".form-select");
  const addBtn = document.getElementById("openOverlay");

  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  let selectedClientId = null;
  let rowToDelete = null;
  let allClients = [];
  let currentTab = 'active';
  let isPermanentDelete = false;
  let formIsDirty = false;
  let currentPage = 1;
  let itemsPerPage = 20;
  let currentFilteredData = [];

  /* ===============================
     LIVE INPUT BLOCKING
  =============================== */
  // Strip any character that is not a letter, accent, space, hyphen, or apostrophe
  function blockNonNameChars(el) {
    el.addEventListener('input', () => {
      const before = el.value;
      const after = before
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[^A-Za-zÀ-ÿ\s'\-]/g, '');
      if (before !== after) {
        const pos = el.selectionStart - (before.length - after.length);
        el.value = after;
        try { el.setSelectionRange(Math.max(0, pos), Math.max(0, pos)); } catch {}
      }
    });
  }

  // Strip any non-digit character
  function blockNonDigits(el) {
    el.addEventListener('input', () => {
      const before = el.value;
      const after = before.replace(/\D/g, '');
      if (before !== after) el.value = after;
    });
  }

  // Allow digits and a leading + (for +63 format)
  function blockContactInvalidChars(el) {
    el.addEventListener('input', () => {
      const before = el.value;
      const after = before.replace(/[^\d+]/g, '');
      if (before !== after) el.value = after;
    });
  }

  // Strip emoji and characters not valid in an address
  function blockAddressInvalidChars(el) {
    el.addEventListener('input', () => {
      const before = el.value;
      const after = before
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[^A-Za-z0-9À-ÿ\s,.\-#]/g, '');
      if (before !== after) {
        const pos = el.selectionStart - (before.length - after.length);
        el.value = after;
        try { el.setSelectionRange(Math.max(0, pos), Math.max(0, pos)); } catch {}
      }
    });
  }

  // Strip emoji only (notes allow most characters)
  function blockEmojiOnly(el) {
    el.addEventListener('input', () => {
      const before = el.value;
      const after = before.replace(/\p{Extended_Pictographic}/gu, '');
      if (before !== after) el.value = after;
    });
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
     BOOTSTRAP FIELD ERROR HELPERS
     (same pattern as orders.js)
  =============================== */
  function showFieldError(inputEl, message) {
    clearFieldError(inputEl);
    inputEl.classList.add("is-invalid");

    const wrapper = inputEl.closest(".mb-3") || inputEl.parentElement;
    if (!wrapper) return;

    const feedback = document.createElement("div");
    feedback.className = "invalid-feedback d-block";
    feedback.textContent = message;
    wrapper.appendChild(feedback);
  }

  function clearFieldError(inputEl) {
    inputEl.classList.remove("is-invalid");

    const wrapper = inputEl.closest(".mb-3") || inputEl.parentElement;
    if (!wrapper) return;

    wrapper.querySelectorAll(".invalid-feedback").forEach(el => el.remove());
  }

  function showFormError(formEl, message) {
    clearFormError(formEl);
    const alertEl = document.createElement("div");
    alertEl.className = "alert alert-danger mt-2 form-error-banner";
    alertEl.role = "alert";
    alertEl.textContent = message;
    formEl.prepend(alertEl);
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
     VALIDATION HELPERS
  =============================== */
  function hasEmoji(str) {
    if (!str) return false;
    const cleaned = str.replace(/[0-9A-Za-zÀ-ÿ\s.,\-#'":;!?@&()/\\]/g, "");
    return /[\p{Extended_Pictographic}]/u.test(cleaned);
  }

  //   FIXED: allow spaces and hyphens for compound names like "Raymond Austin"
  function isLettersOnly(str) {
    return /^[A-Za-zÀ-ÿ\s'\-]+$/.test(str) && str.trim().length >= 2;
  }

  function isAlphanumeric(str) {
    return /^[A-Za-z0-9À-ÿ\s,.\-#]+$/.test(str);
  }

  function isNumbersOnly(str) {
    return /^[0-9]+$/.test(str);
  }

  /* ===============================
     SHARED VALIDATION FUNCTION
  =============================== */
  function validateClientFields(firstName, lastName, address, contact, inputs) {
    const [firstInput, lastInput, addressInput, contactInput] = inputs;

    clearFieldError(firstInput);
    clearFieldError(lastInput);
    clearFieldError(addressInput);
    clearFieldError(contactInput);

    let valid = true;

    // FIRST NAME
    if (!firstName) {
      showFieldError(firstInput, "First name is required");
      valid = false;
    } else if (hasEmoji(firstName)) {
      showFieldError(firstInput, "No emoji allowed");
      valid = false;
    } else if (!isLettersOnly(firstName)) {
      showFieldError(firstInput, "Letters only (min. 2 characters)");
      valid = false;
    } else if (firstName.length > 30) {
      showFieldError(firstInput, "First name must not exceed 30 characters");
      valid = false;
    }

    // LAST NAME
    if (!lastName) {
      showFieldError(lastInput, "Last name is required");
      valid = false;
    } else if (hasEmoji(lastName)) {
      showFieldError(lastInput, "No emoji allowed");
      valid = false;
    } else if (!isLettersOnly(lastName)) {
      showFieldError(lastInput, "Letters only (min. 2 characters)");
      valid = false;
    } else if (lastName.length > 30) {
      showFieldError(lastInput, "Last name must not exceed 30 characters");
      valid = false;
    }

    // ADDRESS (optional)
    if (address && hasEmoji(address)) {
      showFieldError(addressInput, "No emoji allowed");
      valid = false;
    } else if (address && address.length > 100) {
      showFieldError(addressInput, "Address must not exceed 100 characters");
      valid = false;
    } else if (address && !isAlphanumeric(address)) {
      showFieldError(addressInput, "Invalid address characters");
      valid = false;
    }

    // CONTACT
    const cleanedContact = contact.replace(/\s/g, "");
    const validContact = /^(\+639\d{9}|09\d{9})$/.test(cleanedContact);
    if (!contact) {
      showFieldError(contactInput, "Contact number is required");
      valid = false;
    } else if (hasEmoji(contact)) {
      showFieldError(contactInput, "No emoji allowed");
      valid = false;
    } else if (!validContact) {
      showFieldError(contactInput, "Must be +639XXXXXXXXX or 09XXXXXXXXX");
      valid = false;
    }

    return valid;
  }

  /* ===============================
     CONTACT CLEANER
  =============================== */
  function cleanContact(contact) {
    contact = contact.replace(/\s/g, "");
    if (contact.startsWith("+63")) {
      contact = "0" + contact.slice(3);
    }
    return contact;
  }

  if (!COMPANY_ID) {
    window.location.href = "../companies.html";
    return;
  }

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
     OPEN / CLOSE ADD OVERLAY
  =============================== */
  openAddBtn.onclick = () => {
    clearAllErrors(document.getElementById("overlay-form"));
    addOverlay.classList.remove("d-none");
    setFormDirty();
  };

  closeAddBtn.onclick = () => {
    clearAllErrors(document.getElementById("overlay-form"));
    setFormClean();
    addOverlay.classList.add("d-none");
  };

  cancelAddBtn.onclick = () => {
    clearAllErrors(document.getElementById("overlay-form"));
    setFormClean();
    addOverlay.classList.add("d-none");
  };

  loadCompanyName();
  loadClients();

  /* ===============================
     ATTACH LIVE BLOCKING
  =============================== */
  const addFirstName = document.getElementById('addFirstName');
  const addLastName  = document.getElementById('addLastName');
  const addViber     = document.getElementById('addViber');
  const addAddress   = document.querySelector('#overlay-form input[maxlength="100"]');

  if (addFirstName) blockNonNameChars(addFirstName);
  if (addLastName)  blockNonNameChars(addLastName);
  if (addViber)     blockContactInvalidChars(addViber);
  if (addAddress)   blockAddressInvalidChars(addAddress);

  blockNonNameChars(editFirstName);
  blockNonNameChars(editLastName);
  blockContactInvalidChars(editViber);
  blockAddressInvalidChars(editAddress);
  blockEmojiOnly(notesTextarea);

  /* ===============================
     TAB SETUP
  =============================== */
  function setTabUI(tab) {
    const activeBtn = document.getElementById('activeTabBtn');
    const archiveBtn = document.getElementById('archiveTabBtn');
    activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
    archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';

    // Update table headers
    const ths = document.querySelectorAll('thead th');
    if (tab === 'archive') {
      if (ths[4]) ths[4].textContent = '-';
      if (ths[5]) ths[5].textContent = 'Restore';
      if (ths[6]) ths[6].textContent = 'Delete';
    } else {
      if (ths[4]) ths[4].textContent = 'Notes';
      if (ths[5]) ths[5].textContent = 'Edit';
      if (ths[6]) ths[6].textContent = 'Archive';
    }

    // Show/hide Add button
    if (addBtn) {
      addBtn.style.display = tab === 'active' ? '' : 'none';
    }
  }

  document.getElementById('activeTabBtn')?.addEventListener('click', () => {
    if (currentTab === 'active') return;
    currentTab = 'active';
    setTabUI('active');
    loadClients();
  });

  document.getElementById('archiveTabBtn')?.addEventListener('click', () => {
    if (currentTab === 'archive') return;
    currentTab = 'archive';
    setTabUI('archive');
    loadClients();
  });

  /* ===============================
     LOAD CLIENTS
  =============================== */
  async function loadClients() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;

    try {
      let url = `${API_URL}?company_id=${COMPANY_ID}`;

      if (currentTab === 'archive') {
        url += `&archived=true`;
      }

      const searchValue = document.querySelector("input[placeholder='Search name']")?.value.trim();
      const sortValue = document.querySelector("select.form-select")?.value;

      if (searchValue) {
        url += `&search=${encodeURIComponent(searchValue)}`;
      }

      if (sortValue) {
        url += `&sort=${sortValue}`;
      }

      const res = await apiFetch(url);

      let clients = [];
      try {
        clients = await res.json();
      } catch {
        clients = [];
      }

      allClients = clients;

      applySearchAndSort();

    } catch (error) {
      console.error("Failed to load clients:", error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-danger text-center">
            Failed to load clients: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  /* ===============================
     RENDER CLIENT ROWS
  =============================== */
  function renderClientRows(clientsArray) {
    tableBody.innerHTML = "";

    if (clientsArray.length === 0) {
      const label = currentTab === 'archive' ? 'archived clients' : 'clients';
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No ${label} found
          </td>
        </tr>
      `;
      return;
    }

    clientsArray.forEach(renderClientRow);
  }

  function renderClientRow(client) {
    const tr = document.createElement("tr");
    tr.dataset.id = client.id;

    if (currentTab === 'archive') {
      tr.innerHTML = `
        <td>${escapeHtml(client.last_name)}</td>
        <td>${escapeHtml(client.first_name)}</td>
        <td>${escapeHtml(client.address)}</td>
        <td>${escapeHtml(client.viber_number) || "-"}</td>
        <td>-</td>
        <td>
          <button class="btn btn-sm btn-warning restore-btn" data-id="${client.id}">
            Restore
          </button>
        </td>
        <td>
          <button class="btn btn-sm btn-danger perm-delete-btn" data-id="${client.id}">
            Delete
          </button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td>${escapeHtml(client.last_name)}</td>
        <td>${escapeHtml(client.first_name)}</td>
        <td>${escapeHtml(client.address)}</td>
        <td>${escapeHtml(client.viber_number) || "-"}</td>
        <td>
          <button class="btn btn-sm btn-outline-dark view-notes">
            View Notes
          </button>
        </td>
        <td>
          <button class="btn btn-sm edit-btn">
            <img src="${pencilIcon}" width="18">
          </button>
        </td>
        <td>
          <button class="btn btn-sm delete-btn">
            <img src="${archiveIcon}" width="18">
          </button>
        </td>
      `;
    }

    tableBody.appendChild(tr);
  }

  /* ===============================
     SORT FUNCTION
  =============================== */
  function sortClients(clientsArray, sortValue) {
    const arr = [...clientsArray];

    if (sortValue === "az") {
      arr.sort((a, b) =>
        a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name)
      );
    } else if (sortValue === "za") {
      arr.sort((a, b) =>
        b.first_name.localeCompare(a.first_name) || b.last_name.localeCompare(a.last_name)
      );
    } else if (sortValue === "recent") {
      arr.sort((a, b) => b.id - a.id);
    } else if (sortValue === "oldest") {
      arr.sort((a, b) => a.id - b.id);
    }

    return arr;
  }

  /* ===============================
     SEARCH & SORT
  =============================== */
  function applySearchAndSort() {
    const query = searchInput.value.toLowerCase().trim();
    const sortValue = sortSelect.value;
    let filtered = allClients.filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(query)
    );
    filtered = sortClients(filtered, sortValue);
    currentFilteredData = filtered;
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (currentPage - 1) * itemsPerPage;
    renderClientRows(currentFilteredData.slice(start, start + itemsPerPage));
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

  searchInput.addEventListener("input", applySearchAndSort);
  sortSelect.addEventListener("change", applySearchAndSort);

  /* ===============================
     ADD CLIENT
  =============================== */
  document.getElementById("overlay-form").onsubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    clearFormError(form);

    const inputs = form.querySelectorAll("input");

    let firstName = inputs[0].value.trim();
    let lastName = inputs[1].value.trim();
    let address = inputs[2].value.trim();
    let contact = inputs[3].value.trim();

    // CLEAN CONTACT BEFORE VALIDATION
    contact = cleanContact(contact);

    if (!validateClientFields(firstName, lastName, address, contact, inputs)) return;

    const payload = {
      first_name: firstName,
      last_name: lastName,
      address: address,
      viber_number: contact,
      company_id: Number(COMPANY_ID)
    };

    const submitBtn = form.querySelector('[type="submit"]');
    const cancelBtn = document.getElementById("cancelOverlay");
    const closeBtn = document.getElementById("closeOverlay");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      submitBtn.textContent = "Adding...";

      await apiFetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setFormClean();
      addOverlay.classList.add("d-none");
      form.reset();
      clearAllErrors(form);
      clearCache();
      loadCompanyName();
      loadClients();

    } catch (error) {
      //   FIXED: Bootstrap inline error instead of alert()
      showFormError(form, error.message || "Failed to add client");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  };

  /* ===============================
     TABLE ACTIONS (VIEW, EDIT, DELETE, RESTORE, PERM DELETE)
  =============================== */
  document.addEventListener("click", async (e) => {

    // RESTORE CLIENT (archive tab) — open confirm overlay
    const restoreBtn = e.target.closest(".restore-btn");
    if (restoreBtn) {
      selectedClientId = restoreBtn.dataset.id;
      const restoreErrEl = document.getElementById("restoreClientError");
      if (restoreErrEl) { restoreErrEl.classList.add("d-none"); restoreErrEl.textContent = ""; }
      document.getElementById("restoreClientOverlay").classList.remove("d-none");
      return;
    }

    // PERMANENT DELETE (archive tab) — open overlay
    const permDeleteBtn = e.target.closest(".perm-delete-btn");
    if (permDeleteBtn) {
      rowToDelete = permDeleteBtn.closest("tr");
      selectedClientId = permDeleteBtn.dataset.id;
      isPermanentDelete = true;
      document.querySelector("#deleteClientOverlay h5").innerHTML =
        "Permanently delete this client?<br>This cannot be undone.";
      deleteOverlay.classList.remove("d-none");
      return;
    }

    const notesBtn = e.target.closest(".view-notes");
    if (notesBtn) {
      const row = notesBtn.closest("tr");
      selectedClientId = row.dataset.id;

      try {
        const response = await apiFetch(`${API_URL}/${selectedClientId}`);
        const client = await response.json();

        notesTextarea.value = client.notes || "";
        // Clear any previous errors on the notes overlay
        const notesForm = notesOverlay.querySelector("form");
        if (notesForm) clearFormError(notesForm);
        notesOverlay.classList.remove("d-none");
      } catch (error) {
        //   FIXED: show page-level banner instead of alert()
        showPageBanner("danger", error.message || "Failed to load client notes");
      }
      return;
    }

    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const row = editBtn.closest("tr");
      selectedClientId = row.dataset.id;

      try {
        const response = await apiFetch(`${API_URL}/${selectedClientId}`);
        const client = await response.json();

        editFirstName.value = client.first_name;
        editLastName.value = client.last_name;
        editAddress.value = client.address || "";
        editViber.value = client.viber_number || "";

        // Clear any previous errors when opening edit overlay
        const editForm = editOverlay.querySelector("form");
        if (editForm) clearAllErrors(editForm);
        editOverlay.classList.remove("d-none");
        setFormDirty();
      } catch (error) {
        //    FIXED: show page-level banner instead of alert()
        showPageBanner("danger", error.message || "Failed to load client data");
      }
      return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      rowToDelete = deleteBtn.closest("tr");
      selectedClientId = rowToDelete.dataset.id;
      isPermanentDelete = false;
      document.querySelector("#deleteClientOverlay h5").innerHTML =
        "Are you sure you want to<br>archive this client?";
      deleteOverlay.classList.remove("d-none");
    }
  });

  /* ===============================
     PAGE-LEVEL BANNER HELPER
     (for errors outside any overlay form)
  =============================== */
  function showPageBanner(type, message) {
    // Remove any existing banners first
    document.querySelectorAll(".page-error-banner").forEach(el => el.remove());

    const banner = document.createElement("div");
    banner.className = `alert alert-${type} alert-dismissible fade show page-error-banner`;
    banner.innerHTML = `${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.querySelector("h2")?.insertAdjacentElement("afterend", banner);
  }

  /* ===============================
     SAVE NOTES
  =============================== */
  notesOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    clearFormError(form);

    const notesValue = notesTextarea.value.trim();

    // EMOJI CHECK
    if (hasEmoji(notesValue)) {
      showFormError(form, "Emoji not allowed in notes");
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    const closeBtn = document.getElementById("closeNotesOverlay");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      closeBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notesValue })
      });

      notesOverlay.classList.add("d-none");
      clearCache();
      loadCompanyName();
      loadClients();

    } catch (error) {
      //  FIXED: Bootstrap inline error instead of alert()
      showFormError(form, error.message || "Failed to save notes");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      closeBtn.disabled = false;
    }
  };

  /* ===============================
     EDIT CLIENT
  =============================== */
  editOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    clearFormError(form);

    let firstName = editFirstName.value.trim();
    let lastName = editLastName.value.trim();
    let address = editAddress.value.trim();
    let contact = editViber.value.trim();

    // CLEAN CONTACT BEFORE VALIDATION
    contact = cleanContact(contact);

    // VALIDATE — stop here if invalid
    const inputs = [editFirstName, editLastName, editAddress, editViber];

    if (!validateClientFields(firstName, lastName, address, contact, inputs)) return;

    // UPDATE FIELD WITH CLEANED VALUE BEFORE SEND
    editViber.value = contact;

    const submitBtn = form.querySelector('[type="submit"]');
    const cancelBtn = document.getElementById("cancelEditOverlay");
    const closeBtn = document.getElementById("closeEditOverlay");
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          address: address,
          viber_number: contact
        })
      });

      setFormClean();
      editOverlay.classList.add("d-none");
      clearCache();
      loadCompanyName();
      loadClients();

    } catch (error) {
      //  FIXED: Bootstrap inline error instead of alert()
      showFormError(form, error.message || "Failed to update client");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  };

  /* ===============================
     DELETE CLIENT
  =============================== */
  document.getElementById("confirmDelete").onclick = async () => {
    const confirmBtn = document.getElementById("confirmDelete");
    const cancelBtn = document.getElementById("cancelDelete");
    const closeBtn = document.getElementById("closeDeleteOverlay");
    const originalText = confirmBtn.textContent;

    // Clear any previous delete error
    const overlay = document.getElementById("deleteClientOverlay");
    overlay.querySelector(".delete-error-banner")?.remove();

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      confirmBtn.textContent = isPermanentDelete ? "Deleting..." : "Archiving...";

      if (isPermanentDelete) {
        await apiFetch(`${API_URL}/${selectedClientId}/permanent`, { method: "DELETE" });
      } else {
        await apiFetch(`${API_URL}/${selectedClientId}`, { method: "DELETE" });
      }

      deleteOverlay.classList.add("d-none");
      clearCache();
      loadClients();

    } catch (error) {
      // inline error inside delete overlay instead of alert()
      let banner = overlay.querySelector(".delete-error-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "alert alert-danger mt-3 delete-error-banner";
        overlay.querySelector(".overlay-content").appendChild(banner);
      }
      banner.textContent = error.message || "Failed to delete client";
    } finally {
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
      isPermanentDelete = false;
    }
  };

  /* ===============================
     CLOSE BUTTONS
  =============================== */
  document.getElementById("closeNotesOverlay").onclick = () => {
    notesOverlay.classList.add("d-none");
    clearFormError(notesOverlay.querySelector("form"));
  };

  document.getElementById("closeEditOverlay").onclick =
  document.getElementById("cancelEditOverlay").onclick = () => {
    setFormClean();
    editOverlay.classList.add("d-none");
    clearAllErrors(editOverlay.querySelector("form"));
  };

  document.getElementById("closeDeleteOverlay").onclick =
  document.getElementById("cancelDelete").onclick = () => {
    deleteOverlay.classList.add("d-none");
    deleteOverlay.querySelector(".delete-error-banner")?.remove();
    isPermanentDelete = false;
    document.querySelector("#deleteClientOverlay h5").innerHTML =
      "Are you sure you want to<br>delete this client?";
  };

  /* ===============================
     RESTORE CLIENT OVERLAY HANDLERS
  =============================== */
  function closeRestoreClientOverlay() {
    document.getElementById("restoreClientOverlay").classList.add("d-none");
    const errEl = document.getElementById("restoreClientError");
    if (errEl) { errEl.classList.add("d-none"); errEl.textContent = ""; }
  }

  document.getElementById("closeRestoreClient").onclick = closeRestoreClientOverlay;
  document.getElementById("cancelRestoreClient").onclick = closeRestoreClientOverlay;

  document.getElementById("confirmRestoreClient").onclick = async () => {
    const confirmBtn = document.getElementById("confirmRestoreClient");
    const cancelBtn = document.getElementById("cancelRestoreClient");
    const closeBtn = document.getElementById("closeRestoreClient");
    const errEl = document.getElementById("restoreClientError");
    const originalText = confirmBtn.textContent;

    if (errEl) errEl.classList.add("d-none");

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      confirmBtn.textContent = "Restoring...";

      await apiFetch(`${API_URL}/${selectedClientId}/restore`, { method: "PATCH" });

      closeRestoreClientOverlay();
      clearCache();
      loadClients();
    } catch (error) {
      if (errEl) {
        errEl.textContent = error.message || "Failed to restore client.";
        errEl.classList.remove("d-none");
      }
    } finally {
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
    }
  };

  const closeRestoreError = () =>
    document.getElementById("restoreErrorOverlay").classList.add("d-none");
  document.getElementById("closeRestoreError").onclick = closeRestoreError;
  document.getElementById("dismissRestoreError").onclick = closeRestoreError;

});