import { getFromCache, saveToCache, clearCache } from '../../js/apiCache.js';

/* ===============================
   CONFIG
=============================== */
const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;

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
const editBranchInput = document.getElementById("editCompanyBranch");

let selectedCompanyId = null;
let allCompanies = []; // cached for search + sort

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
    renderCompanies(allCompanies);
    return;
  }

  grid.innerHTML = `
    <div class="col text-center">
      <div class="spinner-border"></div>
    </div>
  `;

  try {
    const response = await apiFetch(url);
    const companies = await response.json();

    saveToCache(url, companies);
    allCompanies = companies;
    renderCompanies(allCompanies);

  } catch (error) {
    console.error("Failed to load companies:", error);
    grid.innerHTML = `
      <div class="col text-danger text-center">
        Failed to load companies
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

  if (sortValue === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name));
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

  const name = addNameInput.value.trim();
  if (!name) return;

  try {
    await apiFetch(`${FAST_API_URL}/companies/`, {
      method: "POST",
      body: JSON.stringify({ name })
    });

    addOverlay.classList.add("d-none");
    addForm.reset();
    clearCache();
    loadCompanies();

  } catch {
    alert("Failed to add company");
  }
};

/* ===============================
   EDIT COMPANY
=============================== */
async function openEditCompany(companyId) {
  selectedCompanyId = companyId;

  const response = await apiFetch(`${FAST_API_URL}/companies/${companyId}`);
  const company = await response.json();

  editNameInput.value = company.name || "";
  editBranchInput.value = company.branch || "";

  editOverlay.classList.remove("d-none");
}

editForm.onsubmit = async (e) => {
  e.preventDefault();

  try {
    await apiFetch(`${FAST_API_URL}/companies/${selectedCompanyId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editNameInput.value.trim(),
        branch: editBranchInput.value.trim()
      })
    });

    editOverlay.classList.add("d-none");
    clearCache();
    loadCompanies();

  } catch {
    alert("Failed to update company");
  }
};

/* ===============================
   DELETE COMPANY
=============================== */
document.getElementById("confirmDeleteCompany").onclick = async () => {
  try {
    await apiFetch(`${FAST_API_URL}/companies/${selectedCompanyId}`, {
      method: "DELETE"
    });

    deleteOverlay.classList.add("d-none");
    clearCache();
    loadCompanies();

  } catch {
    alert("Failed to delete company");
  }
};

/* ===============================
   CLOSE BUTTONS
=============================== */
document.getElementById("closeAddCompany").onclick =
document.getElementById("cancelAddCompany").onclick =
  () => addOverlay.classList.add("d-none");

document.getElementById("closeEditCompany").onclick =
document.getElementById("cancelEditCompany").onclick =
  () => editOverlay.classList.add("d-none");

document.getElementById("closeDeleteCompany").onclick =
document.getElementById("cancelDeleteCompany").onclick =
  () => deleteOverlay.classList.add("d-none");

/* ===============================
   INIT
=============================== */
window.addEventListener("DOMContentLoaded", loadCompanies);
