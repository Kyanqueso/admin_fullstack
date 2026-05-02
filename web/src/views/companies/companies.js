import { clearCache } from '../../js/apiCache.js';
import archiveIcon from '../../assets/icons/archive.svg';

/* ===============================
   CONFIG
=============================== */
const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

/* ===============================
   LOGOUT
=============================== */
const logoutOverlay = document.getElementById('logout-overlay');
document.getElementById('logout-btn').addEventListener('click', () => logoutOverlay.classList.remove('d-none'));
document.getElementById('logout-overlay-close').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-no').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-yes').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "/src/views/auth/index.html";
});

console.log("Companies API URL:", FAST_API_URL);
if (!FAST_API_URL) {
  console.error("VITE_BACKEND_URL is not defined!");
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

/* ===============================
   DOM ELEMENTS
=============================== */
const grid = document.getElementById("companyGrid");
const loader = document.getElementById("dashboard-loader");
const searchInput = document.querySelector('input[placeholder="Search companies"]');
const sortSelect = document.querySelector(".form-select");

/* Overlays */
const addOverlay = document.getElementById("addCompanyOverlay");
const editOverlay = document.getElementById("editCompanyOverlay");
const deleteOverlay = document.getElementById("deleteCompanyOverlay");

/* Forms */
const addForm = document.getElementById("addCompanyForm");
const editForm = document.getElementById("editCompanyForm");

/* Inputs */
const addNameInput = document.getElementById("addCompanyName");
const editNameInput = document.getElementById("editCompanyName");

let selectedCompanyId = null;
let allCompanies = [];
let currentTab = 'active';
let isPermanentDelete = false;
let formIsDirty = false;
let currentPage = 1;
let itemsPerPage = 20;
let currentFilteredData = [];

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
   INPUT VALIDATION
=============================== */

// Matches emoji ranges (mirrors the Python schema)
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}]/u;

// Only letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods
const VALID_NAME_REGEX = /^[A-Za-z0-9\s\-'&.]+$/;

function validateCompanyName(name) {
  const trimmed = (name || "").trim();

  if (!trimmed) {
    throw new Error("Company name cannot be empty.");
  }

  if (trimmed.length < 2) {
    throw new Error("Company name must be at least 2 characters.");
  }

  if (trimmed.length > 50) {
    throw new Error("Company name must not exceed 50 characters.");
  }

  if (EMOJI_REGEX.test(trimmed)) {
    throw new Error("Company name must not contain emojis or symbols.");
  }

  if (!VALID_NAME_REGEX.test(trimmed)) {
    throw new Error(
      "Company name may only contain letters, numbers, spaces, hyphens (-), apostrophes ('), ampersands (&), and periods (.)."
    );
  }

  return trimmed;
}

/* ===============================
   LIVE INPUT GUARD — block emoji/invalid chars as the user types
=============================== */
function blockInvalidChars(e) {
  // Strip emojis and disallowed characters in real-time
  const before = e.target.value;
  const after = before
    .replace(EMOJI_REGEX, "")
    .replace(/[^A-Za-z0-9\s\-'&.]/g, "");
  if (before !== after) {
    const cursor = e.target.selectionStart - (before.length - after.length);
    e.target.value = after;
    e.target.setSelectionRange(cursor, cursor);
  }
}

addNameInput.addEventListener("input", blockInvalidChars);
editNameInput.addEventListener("input", blockInvalidChars);

/* ===============================
   SHOW FIELD ERROR
=============================== */
function showFieldError(inputEl, message) {
  clearFieldError(inputEl);

  inputEl.classList.add("is-invalid");

  const wrapper = inputEl.closest(".mb-3");
  if (!wrapper) return;

  const feedback = document.createElement("div");
  feedback.className = "invalid-feedback d-block";
  feedback.textContent = message;

  wrapper.appendChild(feedback);
}

function clearFieldError(inputEl) {
  inputEl.classList.remove("is-invalid");

  const wrapper = inputEl.closest(".mb-3");

  if (!wrapper) return;

  const existing = wrapper.querySelectorAll(".invalid-feedback");
  existing.forEach(el => {
    if (el && typeof el.remove === "function") {
      el.remove();
    }
  });
}

/* ===============================
   API HELPERS
=============================== */
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
      // Response body was not JSON; keep the default message
    }
    throw new Error(errorMessage);
  }

  return response;
}

/* ===============================
   LOAD COMPANIES
=============================== */
async function loadCompanies() {
  const archived = currentTab === 'archive';
  const url = `${FAST_API_URL}/companies/?archived=${archived}`;

  loader.classList.remove("d-none");
  grid.innerHTML = "";

  try {
    const res = await apiFetch(url);
    const companies = await res.json();

    allCompanies = companies;
    loader.classList.add("d-none");
    applySearchAndSort();

  } catch (error) {
    console.error("Failed to load companies:", error);
    loader.classList.add("d-none");
    grid.innerHTML = `
      <div class="col-12 text-danger text-center">
        Failed to load companies: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

/* ===============================
   RENDER COMPANIES
=============================== */
function renderCompanies(companiesArray) {
  grid.innerHTML = "";

  if (companiesArray.length === 0) {
    const emptyMsg = currentTab === 'archive'
      ? 'No archived companies found'
      : 'No companies found';

    grid.innerHTML = `
      <div class="col-12 d-flex flex-column align-items-center justify-content-center text-center" style="min-height: 250px;">
        <p class="text-muted mb-3">${emptyMsg}</p>
        ${currentTab === 'active' ? `
        <div id="addCompanyCard"
             class="border border-2 d-flex justify-content-center align-items-center"
             style="width: 180px; height: 120px; cursor:pointer; border-radius:12px;">
          <span class="fs-1 fw-bold">+</span>
        </div>
        ` : ''}
      </div>
    `;
    return;
  }

  companiesArray.forEach(renderCompanyCard);

  if (currentTab === 'active') {
    renderAddCompanyCard();
  }
}

function renderCompanyCard(company) {
  const col = document.createElement("div");
  col.className = "col";

  if (currentTab === 'archive') {
    col.innerHTML = `
      <div class="company-card card h-100 position-relative py-4"
           data-company-id="${company.id}">

        <div class="position-absolute top-0 end-0 p-1 d-flex gap-2">
          <button class="btn btn-sm btn-warning restore-company" data-id="${company.id}">Restore</button>
          <button class="btn btn-sm btn-danger perm-delete-company" data-id="${company.id}">Delete</button>
        </div>

        <div class="card-body d-flex justify-content-center align-items-center text-center">
          <strong class="fs-3 company-name">${escapeHtml(company.name)}</strong>
        </div>
      </div>
    `;
  } else {
    col.innerHTML = `
      <div class="company-card card h-100 position-relative py-4"
           data-company-id="${company.id}"
           style="cursor:pointer;">

        <div class="position-absolute top-0 end-0 p-1 d-flex gap-2">
          <button class="btn btn-sm btn-success edit-company" data-id="${company.id}">✎</button>
          <button class="btn btn-sm btn-danger delete-company" data-id="${company.id}"><img src="${archiveIcon}" width="18" style="filter: brightness(0) invert(1);"></button>
        </div>

        <div class="card-body d-flex justify-content-center align-items-center text-center">
          <strong class="fs-3 company-name">${escapeHtml(company.name)}</strong>
        </div>
      </div>
    `;
  }

  grid.appendChild(col);
}

function renderAddCompanyCard() {
  const col = document.createElement("div");
  col.className = "col";

  col.innerHTML = `
    <div id="addCompanyCard"
         class="card h-100 border border-2 d-flex justify-content-center align-items-center py-4"
         style="cursor:pointer;">
      <span class="fs-1 fw-bold">+</span>
    </div>
  `;

  grid.appendChild(col);
}

/* ===============================
   TAB SETUP
=============================== */
function setTabUI(tab) {
  const activeBtn = document.getElementById('activeTabBtn');
  const archiveBtn = document.getElementById('archiveTabBtn');
  activeBtn.className = tab === 'active' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
  archiveBtn.className = tab === 'archive' ? 'btn btn-dark btn-sm' : 'btn btn-outline-secondary btn-sm';
}

document.getElementById('activeTabBtn')?.addEventListener('click', () => {
  if (currentTab === 'active') return;
  currentTab = 'active';
  setTabUI('active');
  loadCompanies();
});

document.getElementById('archiveTabBtn')?.addEventListener('click', () => {
  if (currentTab === 'archive') return;
  currentTab = 'archive';
  setTabUI('archive');
  loadCompanies();
});

/* ===============================
   RESTORE COMPANY OVERLAY
=============================== */
const restoreOverlay = document.getElementById("restoreCompanyOverlay");
const restoreErrEl = document.getElementById("restoreCompanyError");

function openRestoreOverlay(id) {
  selectedCompanyId = id;
  restoreErrEl.classList.add("d-none");
  restoreErrEl.textContent = "";
  restoreOverlay.classList.remove("d-none");
}

document.getElementById("closeRestoreCompany").onclick =
document.getElementById("cancelRestoreCompany").onclick = () => {
  restoreOverlay.classList.add("d-none");
  selectedCompanyId = null;
};

document.getElementById("confirmRestoreCompany").onclick = async () => {
  const confirmBtn = document.getElementById("confirmRestoreCompany");
  const cancelBtn = document.getElementById("cancelRestoreCompany");
  const closeBtn = document.getElementById("closeRestoreCompany");
  const originalText = confirmBtn.textContent;

  restoreErrEl.classList.add("d-none");

  try {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    confirmBtn.textContent = "Restoring...";

    await apiFetch(`${FAST_API_URL}/companies/${selectedCompanyId}/restore`, { method: "PATCH" });

    restoreOverlay.classList.add("d-none");
    clearCache();
    loadCompanies();
  } catch (error) {
    console.error("Failed to restore company:", error);
    restoreErrEl.textContent = error.message || "Failed to restore company.";
    restoreErrEl.classList.remove("d-none");
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
  }
};

/* ===============================
   CLICK HANDLING
=============================== */
document.addEventListener("click", async (e) => {
  /* ADD COMPANY */
  if (e.target.closest("#addCompanyCard")) {
    addOverlay.classList.remove("d-none");
    setFormDirty();
    return;
  }

  /* RESTORE COMPANY (archive tab) */
  const restoreBtn = e.target.closest(".restore-company");
  if (restoreBtn) {
    e.stopPropagation();
    openRestoreOverlay(restoreBtn.dataset.id);
    return;
  }

  /* PERMANENT DELETE COMPANY (archive tab) */
  const permDeleteBtn = e.target.closest(".perm-delete-company");
  if (permDeleteBtn) {
    e.stopPropagation();
    selectedCompanyId = permDeleteBtn.dataset.id;
    isPermanentDelete = true;
    document.querySelector("#deleteCompanyOverlay h5").innerHTML =
      "Permanently delete this company?<br>This cannot be undone.";
    deleteOverlay.classList.remove("d-none");
    return;
  }

  /* EDIT COMPANY (active tab) */
  const editBtn = e.target.closest(".edit-company");
  if (editBtn) {
    e.stopPropagation();
    await openEditCompany(editBtn.dataset.id);
    return;
  }

  /* DELETE COMPANY (soft, active tab) */
  const deleteBtn = e.target.closest(".delete-company");
  if (deleteBtn) {
    e.stopPropagation();
    selectedCompanyId = deleteBtn.dataset.id;
    isPermanentDelete = false;
    document.querySelector("#deleteCompanyOverlay h5").innerHTML =
      "Are you sure you want to<br>archive this company?";
    deleteOverlay.classList.remove("d-none");
    return;
  }

  /* OPEN COMPANY → CLIENTS (active tab only) */
  const card = e.target.closest(".company-card");
  if (card && currentTab === 'active') {
    localStorage.setItem("activeCompanyId", card.dataset.companyId);
    window.location.href = "./clients/clients.html";
  }
});

/* ===============================
   SEARCH & SORT
=============================== */
function sortCompanies(companiesArray, sortValue) {
  const arr = [...companiesArray];

  if (sortValue === "az") {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortValue === "za") {
    arr.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortValue === "recent") {
    arr.sort((a, b) => b.id - a.id);
  } else if (sortValue === "oldest") {
    arr.sort((a, b) => a.id - b.id);
  }

  return arr;
}

function applySearchAndSort() {
  const query = searchInput.value.toLowerCase().trim();
  const sortValue = sortSelect.value;

  let filtered = allCompanies.filter(company =>
    company.name.toLowerCase().includes(query)
  );

  filtered = sortCompanies(filtered, sortValue);
  currentFilteredData = filtered;
  currentPage = 1;
  renderPage();
}

function renderPage() {
  const start = (currentPage - 1) * itemsPerPage;
  renderCompanies(currentFilteredData.slice(start, start + itemsPerPage));
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
   ADD COMPANY
=============================== */
addForm.onsubmit = async (e) => {
  e.preventDefault();

  const name = addNameInput.value.trim();
  clearFieldError(addNameInput);

  let validName;
  try {
    validName = validateCompanyName(name);
  } catch (error) {
    showFieldError(addNameInput, error.message);
    return;
  }

  const submitBtn = addForm.querySelector('[type="submit"]');
  const cancelBtn = document.getElementById("cancelAddCompany");
  const closeBtn = document.getElementById("closeAddCompany");
  const originalText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    submitBtn.textContent = "Adding...";

    await apiFetch(`${FAST_API_URL}/companies/`, {
      method: "POST",
      body: JSON.stringify({ name: validName })
    });

    setFormClean();
    addOverlay.classList.add("d-none");
    addForm.reset();
    clearFieldError(addNameInput);
    clearCache();
    loadCompanies();

  } catch (error) {
    console.error("Failed to add company:", error);
    showFieldError(addNameInput, error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
  }
};

/* ===============================
   EDIT COMPANY
=============================== */
async function openEditCompany(companyId) {
  selectedCompanyId = companyId;

  try {
    const response = await apiFetch(`${FAST_API_URL}/companies/${companyId}`);

    let company;
    try {
      company = await response.json();
    } catch {
      throw new Error("Invalid server response");
    }

    editNameInput.value = company.name || "";
    clearFieldError(editNameInput);
    editOverlay.classList.remove("d-none");
    setFormDirty();

  } catch (error) {
    console.error("Failed to load company for editing:", error);
    showPageBanner('danger', `Failed to load company: ${error.message}`);
  }
}

editForm.onsubmit = async (e) => {
  e.preventDefault();

  const name = editNameInput.value.trim();
  clearFieldError(editNameInput);

  let validName;
  try {
    validName = validateCompanyName(name);
  } catch (error) {
    showFieldError(editNameInput, error.message);
    return;
  }

  const submitBtn = editForm.querySelector('[type="submit"]');
  const cancelBtn = document.getElementById("cancelEditCompany");
  const closeBtn = document.getElementById("closeEditCompany");
  const originalText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    await apiFetch(`${FAST_API_URL}/companies/${selectedCompanyId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: validName })
    });

    setFormClean();
    editOverlay.classList.add("d-none");
    clearFieldError(editNameInput);
    clearCache();
    loadCompanies();

  } catch (error) {
    console.error("Failed to update company:", error);
    showFieldError(editNameInput, error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
  }
};

/* ===============================
   DELETE COMPANY
=============================== */
document.getElementById("confirmDeleteCompany").onclick = async () => {
  const confirmBtn = document.getElementById("confirmDeleteCompany");
  const cancelBtn = document.getElementById("cancelDeleteCompany");
  const closeBtn = document.getElementById("closeDeleteCompany");
  const originalText = confirmBtn.textContent;

  const errEl = document.getElementById('deleteCompanyError');
  if (errEl) errEl.classList.add('d-none');

  try {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    confirmBtn.textContent = isPermanentDelete ? "Deleting..." : "Archiving...";

    const url = isPermanentDelete
      ? `${FAST_API_URL}/companies/${selectedCompanyId}/permanent`
      : `${FAST_API_URL}/companies/${selectedCompanyId}`;

    await apiFetch(url, { method: "DELETE" });

    deleteOverlay.classList.add("d-none");
    clearCache();
    loadCompanies();

  } catch (error) {
    console.error("Failed to delete company:", error);
    const errEl = document.getElementById('deleteCompanyError');
    if (errEl) {
      errEl.textContent = `Failed: ${error.message}`;
      errEl.classList.remove('d-none');
    }
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
    isPermanentDelete = false;
  }
};

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
   PAGE BANNER HELPER
=============================== */
function showPageBanner(type, message) {
  document.querySelectorAll('.page-error-banner').forEach(el => el.remove());
  const banner = document.createElement('div');
  banner.className = `alert alert-${type} alert-dismissible fade show page-error-banner`;
  banner.innerHTML = `${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.querySelector('h1')?.insertAdjacentElement('afterend', banner);
}

/* ===============================
   CLOSE BUTTONS
=============================== */
document.getElementById("closeAddCompany").onclick =
  document.getElementById("cancelAddCompany").onclick = () => {
    clearFieldError(addNameInput);
    setFormClean();
    addOverlay.classList.add("d-none");
  };

document.getElementById("closeEditCompany").onclick =
  document.getElementById("cancelEditCompany").onclick = () => {
    clearFieldError(editNameInput);
    setFormClean();
    editOverlay.classList.add("d-none");
  };

document.getElementById("closeDeleteCompany").onclick =
  document.getElementById("cancelDeleteCompany").onclick = () => {
    deleteOverlay.classList.add("d-none");
    isPermanentDelete = false;
    document.querySelector("#deleteCompanyOverlay h5").innerHTML =
      "Are you sure you want to<br>archive this company?";
    const errEl = document.getElementById('deleteCompanyError');
    if (errEl) errEl.classList.add('d-none');
  };

/* ===============================
   INIT
=============================== */
loadCompanies();