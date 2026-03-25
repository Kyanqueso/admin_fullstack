import pencilIcon from '../../../assets/icons/pencil-dark.svg';
import trashIcon from '../../../assets/icons/trashcan-black.svg';
import { getFromCache, saveToCache, clearCache } from '../../../js/apiCache.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("CLIENTS JS LOADED");

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
      window.location.href = "../auth/index.html";
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

  const COMPANY_ID = localStorage.getItem("activeCompanyId");

  let selectedClientId = null;
  let rowToDelete = null;
  let allClients = [];

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
     VALIDATION HELPERS
  =============================== */
  // ADDED (same as companies)
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

    const existing = wrapper.querySelectorAll(".invalid-feedback");
    existing.forEach(el => el.remove());
  }
  function hasEmoji(str) {
    if (!str) return false;
    const cleaned = str.replace(/[0-9A-Za-zÀ-ÿ\s.,\-#'":;!?@&()/\\]/g, "");
    return /[\p{Extended_Pictographic}]/u.test(cleaned);
  }

  function isLettersOnly(str) {
    return /^[A-Za-zÀ-ÿ\s'-]+$/.test(str) && str.trim().length > 0;
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

    // FIRST NAME
    if (!firstName) {
      showFieldError(firstInput, "First name is required");
      return false;
    }

    if (hasEmoji(firstName)) {
      showFieldError(firstInput, "No emoji allowed");
      return false;
    }

    if (!isLettersOnly(firstName)) {
      showFieldError(firstInput, "Letters only");
      return false;
    }

    // LAST NAME
    if (!lastName) {
      showFieldError(lastInput, "Last name is required");
      return false;
    }

    if (hasEmoji(lastName)) {
      showFieldError(lastInput, "No emoji allowed");
      return false;
    }

    if (!isLettersOnly(lastName)) {
      showFieldError(lastInput, "Letters only");
      return false;
    }

    // ADDRESS
    if (address && !isAlphanumeric(address)) {
      showFieldError(addressInput, "Invalid address");
      return false;
    }

    // CONTACT
    // EMPTY CHECK
    if (!contact) {
      showFieldError(contactInput, "Contact number is required");
      return false;
    }

    if (hasEmoji(contact)) {
      showFieldError(contactInput, "No emoji allowed");
      return false;
    }

    if (!isNumbersOnly(contact)) {
      showFieldError(contactInput, "Numbers only");
      return false;
    }

    if (contact.length !== 11) {
      showFieldError(contactInput, "Must be 11 digits");
      return false;
    }
    return true;
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
    setTimeout(() => alert("No company selected."), 0);
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

      let clients = [];
      try {
        clients = await res.json();
      } catch {
        clients = [];
      }

      saveToCache(API_URL, clients);

      allClients = clients.filter(
        client => String(client.company_id) === String(COMPANY_ID)
      );

      renderClientRows(allClients);

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

    const sortValue = sortSelect.value;
    filtered = sortClients(filtered, sortValue);

    renderClientRows(filtered);
  });

  /* ===============================
     SORT FUNCTION
     -- values match the HTML option values: az, za, recent, oldest
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
  // MODIFIED (FIXED ORDER + CORRECT INPUTS)
  document.getElementById("overlay-form").onsubmit = async (e) => {
    e.preventDefault();

    const inputs = e.target.querySelectorAll("input");

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

    const submitBtn = e.target.querySelector('[type="submit"]');
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

      addOverlay.classList.add("d-none");
      e.target.reset();
      clearCache();
      loadCompanyName();
      loadClients();

    } catch (error) {
      setTimeout(() => alert(error.message || "Failed to add client"), 0);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      closeBtn.disabled = false;
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

      try {
        const response = await apiFetch(`${API_URL}/${selectedClientId}`);
        const client = await response.json();

        notesTextarea.value = client.notes || "";
        notesOverlay.classList.remove("d-none");
      } catch (error) {
        setTimeout(() => alert(error.message || "Failed to load client notes"), 0);
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
        editAddress.value = client.address;
        editViber.value = client.viber_number || "";

        editOverlay.classList.remove("d-none");
      } catch (error) {
        setTimeout(() => alert(error.message || "Failed to load client data"), 0);

      }
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

    const notesValue = notesTextarea.value.trim();

    // EMOJI CHECK
    if (hasEmoji(notesValue)) {
      setTimeout(() => alert("Emoji not allowed in notes"), 0);
      return;
    }

    const submitBtn = e.target.querySelector('[type="submit"]');
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
      setTimeout(() => alert(error.message || "Failed to save notes"), 0);
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

    let firstName = editFirstName.value.trim();
    let lastName = editLastName.value.trim();
    let address = editAddress.value.trim();
    let contact = editViber.value.trim();

    // CLEAN CONTACT BEFORE VALIDATION
    contact = cleanContact(contact);

    // VALIDATE — stop here if invalid
    // MODIFIED
    const inputs = [editFirstName, editLastName, editAddress, editViber];

    if (!validateClientFields(firstName, lastName, address, contact, inputs)) return;

    // UPDATE FIELD WITH CLEANED VALUE BEFORE SEND
    editViber.value = contact;

    const submitBtn = e.target.querySelector('[type="submit"]');
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

      editOverlay.classList.add("d-none");
      clearCache();
      loadCompanyName();
      loadClients();

    } catch (error) {
      setTimeout(() => alert(error.message || "Failed to update client"), 0);
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

    try {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      confirmBtn.textContent = "Deleting...";

      await apiFetch(`${API_URL}/${selectedClientId}`, {
        method: "DELETE"
      });

      rowToDelete.remove();
      deleteOverlay.classList.add("d-none");
      clearCache();

    } catch (error) {
      setTimeout(() => alert(error.message || "Failed to delete client"), 0);
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
