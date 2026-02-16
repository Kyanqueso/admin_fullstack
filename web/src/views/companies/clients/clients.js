document.addEventListener("DOMContentLoaded", () => {

  const API_URL = "http://127.0.0.1:8000/clients/";
  const tableBody = document.querySelector("tbody");

  const addOverlay = document.getElementById("addClientOverlay");
  const openAddBtn = document.getElementById("openOverlay");
  const closeAddBtn = document.getElementById("closeOverlay");
  const cancelAddBtn = document.getElementById("cancelOverlay");

  const notesOverlay = document.getElementById("clientNotesOverlay");
  const editOverlay = document.getElementById("editClientOverlay");
  const deleteOverlay = document.getElementById("deleteClientOverlay");

  const notesTextarea = notesOverlay.querySelector("textarea");

  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  let selectedClientId = null;
  let rowToDelete = null;

  if (!COMPANY_ID) {
    alert("No company selected.");
    return;
  }

  /* ===============================
     OPEN / CLOSE ADD OVERLAY
  =============================== */
  openAddBtn.onclick = () => addOverlay.classList.remove("d-none");
  closeAddBtn.onclick = cancelAddBtn.onclick = () =>
    addOverlay.classList.add("d-none");

  async function loadCompanyTitle() {
    const res = await fetch(`http://127.0.0.1:8000/companies/${COMPANY_ID}`);
    const company = await res.json();

    document.getElementById("companyTitle").textContent =
      `${company.name}'s Client List`;
  }

  loadCompanyTitle();
  /* ===============================
     LOAD CLIENTS
  =============================== */
  async function loadClients() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;

    try {
      let url = `${API_URL}?company_id=${COMPANY_ID}`;

      const searchValue = document.querySelector("input[placeholder='Search name']")?.value.trim();
      const sortValue = document.querySelector("select.form-select")?.value;

      if (searchValue) {
        url += `&search=${encodeURIComponent(searchValue)}`;
      }

      if (sortValue) {
        url += `&sort=${sortValue}`;
      }

      const res = await fetch(url); const clients = await res.json();

      tableBody.innerHTML = "";

      if (clients.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted">
              No clients for this company
            </td>
          </tr>
        `;
        return;
      }

      clients.forEach(client => {
        const tr = document.createElement("tr");
        tr.dataset.id = client.id;

        tr.innerHTML = `
          <td>${client.first_name}</td>
          <td>${client.last_name}</td>
          <td>${client.address}</td>
          <td>${client.viber_number || "-"}</td>
          <td>${client.updated_at || "-"}</td>
          <td>
            <button class="btn btn-sm btn-outline-dark view-notes">
              View Notes
            </button>
          </td>
          <td>
            <button class="btn btn-sm edit-btn">
              <img src="../../../assets/icons/pencil.svg" width="18">
            </button>
          </td>
          <td>
            <button class="btn btn-sm delete-btn">
              <img src="../../../assets/icons/trashcan-black.svg" width="18">
            </button>
          </td>
        `;

        tableBody.appendChild(tr);
      });

    } catch {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `;
    }
  }

  loadClients();

  /* ===============================
     ADD CLIENT (UNCHANGED – WORKING)
  =============================== */
  document.getElementById("overlay-form").onsubmit = async (e) => {
    e.preventDefault();

    const inputs = e.target.querySelectorAll("input");

    const payload = {
      first_name: inputs[0].value.trim(),
      last_name: inputs[1].value.trim(),
      address: inputs[2].value.trim(),
      viber_number: inputs[3].value.trim(),
      company_id: Number(COMPANY_ID)
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert("Failed to add client");
      return;
    }

    addOverlay.classList.add("d-none");
    e.target.reset();
    loadClients();
  };

  /* ===============================
     TABLE ACTIONS
  =============================== */
  document.addEventListener("click", async (e) => {

    /* VIEW NOTES */
    const notesBtn = e.target.closest(".view-notes");
    if (notesBtn) {
      const row = notesBtn.closest("tr");
      selectedClientId = row.dataset.id;

      const res = await fetch(`${API_URL}${selectedClientId}`);
      const client = await res.json();

      notesTextarea.value = client.notes || "";
      notesOverlay.classList.remove("d-none");
      return;
    }

    /* EDIT CLIENT */
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const row = editBtn.closest("tr");
      selectedClientId = row.dataset.id;

      const res = await fetch(`${API_URL}${selectedClientId}`);
      const client = await res.json();

      document.getElementById("editFirstName").value = client.first_name;
      document.getElementById("editLastName").value = client.last_name;
      document.getElementById("editAddress").value = client.address;
      document.getElementById("editViber").value = client.viber_number || "";

      editOverlay.classList.remove("d-none");
      return;
    }

    /* DELETE CLIENT */
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      rowToDelete = deleteBtn.closest("tr");
      selectedClientId = rowToDelete.dataset.id;
      deleteOverlay.classList.remove("d-none");
    }
  });

  /* ===============================
     SAVE NOTES
  =============================== */
  notesOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}${selectedClientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesTextarea.value.trim() })
    });

    if (res.ok) {
      notesOverlay.classList.add("d-none");
      loadClients();
    }
  };

  /* ===============================
     EDIT CLIENT SUBMIT
  =============================== */
  editOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      first_name: editFirstName.value.trim(),
      last_name: editLastName.value.trim(),
      address: editAddress.value.trim(),
      viber_number: editViber.value.trim()
    };

    const res = await fetch(`${API_URL}${selectedClientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      editOverlay.classList.add("d-none");
      loadClients();
    }
  };

  /* ===============================
     DELETE CONFIRM
  =============================== */
  document.getElementById("confirmDelete").onclick = async () => {
    const res = await fetch(`${API_URL}${selectedClientId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      rowToDelete.remove();
      deleteOverlay.classList.add("d-none");
    }
  };

  /* ===============================
     CLOSE BUTTONS
  =============================== */
  document.getElementById("closeNotesOverlay").onclick =
    document.getElementById("closeEditOverlay").onclick =
    document.getElementById("cancelEditOverlay").onclick =
    document.getElementById("closeDeleteOverlay").onclick =
    document.getElementById("cancelDelete").onclick = () => {
      notesOverlay.classList.add("d-none");
      editOverlay.classList.add("d-none");
      deleteOverlay.classList.add("d-none");
    };
    
  /* ===============================
 SEARCH + SORT LISTENERS
=============================== */

  document.querySelector("input[placeholder='Search name']")?.addEventListener("input", () => {
    loadClients();
  });

  document.querySelector("select.form-select")?.addEventListener("change", () => {
    loadClients();
  });
});
