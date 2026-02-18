import pencilIcon from '../../../assets/icons/pencil.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     CONFIG
  =============================== */
  const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;
  const API_URL = `${FAST_API_URL}/clients`;

  console.log("Clients API URL:", API_URL);

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

  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  let selectedClientId = null;
  let rowToDelete = null;
  let allClients = []; // cached clients for search/sort

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (!COMPANY_ID) {
    alert("No company selected.");
    window.location.href = "../companies.html";
    return;
  }

  /* ===============================
     OPEN / CLOSE ADD OVERLAY
  =============================== */
  openAddBtn.onclick = () => addOverlay.classList.remove("d-none");
  closeAddBtn.onclick =
  cancelAddBtn.onclick = () => addOverlay.classList.add("d-none");

  loadCompanyName();
  loadClients();
  /* ===============================
     LOAD CLIENTS
  =============================== */
  async function loadClients() {
    const cached = getFromCache(API_URL);
    if (cached) {
      allClients = cached.filter(
        client => String(client.company_id) === String(COMPANY_ID)
      );
      renderClientRows(allClients);
      return;
    }

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
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

      const res = await apiFetch(url);
      const clients = await res.json();

      saveToCache(API_URL, clients);

      // FILTER CLIENTS BY COMPANY
      allClients = clients.filter(
        client => String(client.company_id) === String(COMPANY_ID)
      );

      renderClientRows(allClients);

    } catch (error) {
      console.error("Failed to load clients:", error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-danger text-center">
            Failed to load clients
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
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No clients found
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

    tr.innerHTML = `
      <td>${escapeHtml(client.first_name)}</td>
      <td>${escapeHtml(client.last_name)}</td>
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
          <img src="${trashIcon}" width="18">
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  }

  /* ===============================
     LIVE SEARCH
  =============================== */
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = allClients.filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(query)
    );

    // apply current sort
    const sortValue = sortSelect.value;
    filtered = sortClients(filtered, sortValue);

    renderClientRows(filtered);
  });

  /* ===============================
     SORT FUNCTION
  =============================== */
  function sortClients(clientsArray, sortValue) {
    const arr = [...clientsArray];
    if (sortValue === "name") {
      arr.sort((a, b) =>
        a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name)
      );
    } else if (sortValue === "recent") {
      arr.sort((a, b) => b.id - a.id);
    } else if (sortValue === "oldest") {
      arr.sort((a, b) => a.id - b.id);
    } else if (sortValue === "alpha") {
      arr.sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    }
    return arr;
  }

  sortSelect.addEventListener("change", () => {
    const sortValue = sortSelect.value;
    const query = searchInput.value.toLowerCase().trim();

    let filtered = allClients.filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(query)
    );

    filtered = sortClients(filtered, sortValue);
    renderClientRows(filtered);
  });

  /* ===============================
     ADD CLIENT
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

    try {
      await apiFetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      addOverlay.classList.add("d-none");
      e.target.reset();
      clearCache();
      loadCompanyName();
      loadClients();

    } catch {
      alert("Failed to add client");
    }
  };

  /* ===============================
     TABLE ACTIONS (VIEW, EDIT, DELETE)
  =============================== */
  document.addEventListener("click", async (e) => {

    const notesBtn = e.target.closest(".view-notes");
    if (notesBtn) {
      const row = notesBtn.closest("tr");
      selectedClientId = row.dataset.id;

      const response = await apiFetch(`${API_URL}/${selectedClientId}`);
      const client = await response.json();

      notesTextarea.value = client.notes || "";
      notesOverlay.classList.remove("d-none");
      return;
    }

    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const row = editBtn.closest("tr");
      selectedClientId = row.dataset.id;

      const response = await apiFetch(`${API_URL}/${selectedClientId}`);
      const client = await response.json();

      editFirstName.value = client.first_name;
      editLastName.value = client.last_name;
      editAddress.value = client.address;
      editViber.value = client.viber_number || "";

      editOverlay.classList.remove("d-none");
      return;
    }

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

    try {
      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notesTextarea.value.trim() })
      });

      notesOverlay.classList.add("d-none");
      clearCache();
      loadCompanyName();
      loadClients();

    } catch {
      alert("Failed to save notes");
    }
  };

  /* ===============================
     EDIT CLIENT
  =============================== */
  editOverlay.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();

    try {
      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          first_name: editFirstName.value.trim(),
          last_name: editLastName.value.trim(),
          address: editAddress.value.trim(),
          viber_number: editViber.value.trim()
        })
      });

      editOverlay.classList.add("d-none");
      clearCache();
      loadCompanyName();
      loadClients();

    } catch {
      alert("Failed to update client");
    }
  };

  /* ===============================
     DELETE CLIENT
  =============================== */
  document.getElementById("confirmDelete").onclick = async () => {
    try {
      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "DELETE"
      });

      rowToDelete.remove();
      deleteOverlay.classList.add("d-none");
      clearCache();

    } catch {
      alert("Failed to delete client");
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
    
});
