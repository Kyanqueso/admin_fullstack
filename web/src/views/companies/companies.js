const API_URL = "http://127.0.0.1:8000/companies/";
const grid = document.getElementById("companyGrid");

/* OVERLAYS */
const addOverlay = document.getElementById("addCompanyOverlay");
const editOverlay = document.getElementById("editCompanyOverlay");
const deleteOverlay = document.getElementById("deleteCompanyOverlay");

/* FORMS */
const addForm = document.getElementById("addCompanyForm");
const editForm = document.getElementById("editCompanyForm");

/* INPUTS */
const addNameInput = document.getElementById("addCompanyName");
const editNameInput = document.getElementById("editCompanyName");
const editBranchInput = document.getElementById("editCompanyBranch");

let selectedCompanyId = null;

/* ===============================
   LOAD COMPANIES
=============================== */
async function loadCompanies() {
  grid.innerHTML = `
    <div class="col text-center">
      <div class="spinner-border"></div>
    </div>
  `;

  try {
    const res = await fetch(API_URL);
    const companies = await res.json();

    grid.innerHTML = "";

    companies.forEach(company => {
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
            <strong class="fs-3">${company.name}</strong>
          </div>
        </div>
      `;

      grid.appendChild(col);
    });

    /* ADD COMPANY CARD */
    const addCol = document.createElement("div");
    addCol.className = "col";
    addCol.innerHTML = `
      <div id="addCompanyCard"
           class="card h-100 border border-2 d-flex justify-content-center align-items-center py-4"
           style="cursor:pointer;">
        <span class="fs-1 fw-bold">+</span>
      </div>
    `;
    grid.appendChild(addCol);

  } catch (err) {
    grid.innerHTML = `
      <div class="col text-danger text-center">
        Failed to load companies
      </div>
    `;
  }
}

loadCompanies();

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
    selectedCompanyId = editBtn.dataset.id;

    const res = await fetch(`${API_URL}${selectedCompanyId}`);
    const company = await res.json();

    editNameInput.value = company.name || "";
    editBranchInput.value = company.branch || "";

    editOverlay.classList.remove("d-none");
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
    const companyId = card.dataset.companyId;
    localStorage.setItem("activeCompanyId", companyId);
    window.location.href = "./clients/clients.html";
  }
});

/* ===============================
   ADD COMPANY
=============================== */
addForm.onsubmit = async (e) => {
  e.preventDefault();

  const payload = {
    name: addNameInput.value.trim()
  };

  if (!payload.name) return;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    addOverlay.classList.add("d-none");
    addForm.reset();
    loadCompanies();
  } else {
    alert("Failed to add company");
  }
};

/* ===============================
   EDIT COMPANY
=============================== */
editForm.onsubmit = async (e) => {
  e.preventDefault();

  const payload = {
    name: editNameInput.value.trim(),
    branch: editBranchInput.value.trim()
  };

  const res = await fetch(`${API_URL}${selectedCompanyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    editOverlay.classList.add("d-none");
    loadCompanies();
  } else {
    alert("Failed to update company");
  }
};

/* ===============================
   DELETE COMPANY
=============================== */
document.getElementById("confirmDeleteCompany").onclick = async () => {
  const res = await fetch(`${API_URL}${selectedCompanyId}`, {
    method: "DELETE"
  });

  if (res.ok) {
    deleteOverlay.classList.add("d-none");
    loadCompanies();
  } else {
    alert("Failed to delete company");
  }
};

/* ===============================
   CLOSE BUTTONS
=============================== */
document.getElementById("closeAddCompany").onclick =
document.getElementById("cancelAddCompany").onclick = () =>
  addOverlay.classList.add("d-none");

document.getElementById("closeEditCompany").onclick =
document.getElementById("cancelEditCompany").onclick = () =>
  editOverlay.classList.add("d-none");

document.getElementById("closeDeleteCompany").onclick =
document.getElementById("cancelDeleteCompany").onclick = () =>
  deleteOverlay.classList.add("d-none");
