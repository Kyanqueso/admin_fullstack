import { getFromCache, saveToCache, clearCache } from '../../js/apiCache.js';

/* ===============================
   CONFIG
=============================== */
const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;

/* ===============================
   LOGOUT
=============================== */
const logoutOverlay = document.getElementById('logout-overlay');
document.getElementById('logout-btn').addEventListener('click', () => logoutOverlay.classList.remove('d-none'));
document.getElementById('logout-overlay-close').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-no').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-yes').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "../auth/index.html";
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
    window.location.href = "../auth/index.html";
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

  if (trimmed.length > 32) {
    throw new Error("Company name must not exceed 32 characters.");
  }

  if (EMOJI_REGEX.test(trimmed)) {
    throw new Error("Company name must not contain emojis or symbols.");
  }

  if (!VALID_NAME_REGEX.test(trimmed)) {
    throw new Error(
      "Company name may only contain letters, numbers, spaces, hyphens (-), apostrophes ('), ampersands (&), and periods (.)."
    );
  }

  return trimmed; // ✅ ADD THIS
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
  if (!wrapper) return; // ✅ ADD THIS

  const feedback = document.createElement("div");
  feedback.className = "invalid-feedback d-block";
  feedback.textContent = message;

  wrapper.appendChild(feedback);
}

function clearFieldError(inputEl) {
  inputEl.classList.remove("is-invalid");

  const wrapper = inputEl.closest(".mb-3");

  if (!wrapper) return; // ✅ ADD THIS (CRITICAL)

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
    window.location.href = "../auth/index.html";
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
  const url = `${FAST_API_URL}/companies/`;
  const cached = getFromCache(url);
  if (cached) {
    allCompanies = cached;
    loader.classList.add("d-none");
    renderCompanies(allCompanies);
    return;
  }

  loader.classList.remove("d-none");
  grid.innerHTML = "";

  try {
    const res = await apiFetch(url);
    const companies = await res.json();

    saveToCache(url, companies);
    allCompanies = companies;
    loader.classList.add("d-none");
    renderCompanies(allCompanies);

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
    grid.innerHTML = `
      <div class="col text-center text-muted">
        No companies found
      </div>
    `;
    renderAddCompanyCard();
    return;
  }

  companiesArray.forEach(renderCompanyCard);
  renderAddCompanyCard();
}

function renderCompanyCard(company) {
  const col = document.createElement("div");
  col.className = "col";

  col.innerHTML = `
    <div class="company-card card h-100 position-relative py-4"
         data-company-id="${company.id}"
         style="cursor:pointer;">

      <div class="position-absolute top-0 end-0 p-1 d-flex gap-2">
        <button class="btn btn-sm btn-success edit-company" data-id="${company.id}">✎</button>
        <button class="btn btn-sm btn-danger delete-company" data-id="${company.id}">🗑</button>
      </div>

      <div class="card-body d-flex justify-content-center align-items-center">
        <strong class="fs-3">${escapeHtml(company.name)}</strong>
      </div>
    </div>
  `;

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
   CLICK HANDLING
=============================== */
document.addEventListener("click", async (e) => {
  /* ADD COMPANY */
  if (e.target.closest("#addCompanyCard")) {
    addOverlay.classList.remove("d-none");
    return;
  }

  /* EDIT COMPANY */
  const editBtn = e.target.closest(".edit-company");
  if (editBtn) {
    e.stopPropagation();
    await openEditCompany(editBtn.dataset.id);
    return;
  }

  /* DELETE COMPANY */
  const deleteBtn = e.target.closest(".delete-company");
  if (deleteBtn) {
    e.stopPropagation();
    selectedCompanyId = deleteBtn.dataset.id;
    deleteOverlay.classList.remove("d-none");
    return;
  }

  /* OPEN COMPANY → CLIENTS */
  const card = e.target.closest(".company-card");
  if (card) {
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
  renderCompanies(filtered);
}

searchInput.addEventListener("input", applySearchAndSort);
sortSelect.addEventListener("change", applySearchAndSort);

/* ===============================
   ADD COMPANY
=============================== */
addForm.onsubmit = async (e) => {
  e.preventDefault();

  // MODIFIED
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

    // MODIFIED
    let company;
    try {
      company = await response.json();
    } catch {
      throw new Error("Invalid server response");
    }

    editNameInput.value = company.name || "";
    clearFieldError(editNameInput);
    editOverlay.classList.remove("d-none");

  } catch (error) {
    console.error("Failed to load company for editing:", error);
    alert(`Failed to load company: ${error.message}`);
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

  try {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    closeBtn.disabled = true;
    confirmBtn.textContent = "Deleting...";

    await apiFetch(`${FAST_API_URL}/companies/${selectedCompanyId}`, {
      method: "DELETE"
    });

    deleteOverlay.classList.add("d-none");
    clearCache();
    loadCompanies();

  } catch (error) {
    console.error("Failed to delete company:", error);
    alert(`Failed to delete company: ${error.message}`);
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    closeBtn.disabled = false;
  }
};

/* ===============================
   CLOSE BUTTONS
=============================== */
document.getElementById("closeAddCompany").onclick =
  document.getElementById("cancelAddCompany").onclick = () => {
    clearFieldError(addNameInput);
    addOverlay.classList.add("d-none");
  };

document.getElementById("closeEditCompany").onclick =
  document.getElementById("cancelEditCompany").onclick = () => {
    clearFieldError(editNameInput);
    editOverlay.classList.add("d-none");
  };

document.getElementById("closeDeleteCompany").onclick =
  document.getElementById("cancelDeleteCompany").onclick = () =>
    deleteOverlay.classList.add("d-none");

/* ===============================
   INIT
=============================== */
loadCompanies();