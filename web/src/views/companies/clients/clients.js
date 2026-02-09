document.addEventListener("DOMContentLoaded", () => {

  /* ===== Add Client Overlay ===== */
  const addOverlay = document.getElementById("addClientOverlay");
  const openAddBtn = document.getElementById("openOverlay");
  const closeAddBtn = document.getElementById("closeOverlay");
  const cancelAddBtn = document.getElementById("cancelOverlay");

  openAddBtn.addEventListener("click", () => {
    addOverlay.classList.remove("d-none");
  });

  closeAddBtn.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  cancelAddBtn.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });


  /* ===== Client Notes Overlay ===== */
  const notesOverlay = document.getElementById("clientNotesOverlay");
  const closeNotesBtn = document.getElementById("closeNotesOverlay");

  document.querySelectorAll(".view-notes").forEach(btn => {
    btn.addEventListener("click", () => {
      notesOverlay.classList.remove("d-none");
    });
  });

  closeNotesBtn.addEventListener("click", () => {
    notesOverlay.classList.add("d-none");
  });

  /* ===== Edit Client Overlay ===== */
const editOverlay = document.getElementById("editClientOverlay");
const closeEditBtn = document.getElementById("closeEditOverlay");
const cancelEditBtn = document.getElementById("cancelEditOverlay");

const editFirstName = document.getElementById("editFirstName");
const editLastName = document.getElementById("editLastName");
const editAddress = document.getElementById("editAddress");
const editViber = document.getElementById("editViber");

/* Edit buttons in table */
document.querySelectorAll(".edit-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // TEMP: demo data (later replace with row data)
    editFirstName.value = "Pedro";
    editLastName.value = "Garcia";
    editAddress.value = "321 Rizal St, Pasig City";
    editViber.value = "09451234567";

    editOverlay.classList.remove("d-none");
  });
});

closeEditBtn.addEventListener("click", () => {
  editOverlay.classList.add("d-none");
});

cancelEditBtn.addEventListener("click", () => {
  editOverlay.classList.add("d-none");
});

/* ===== Delete Client Overlay ===== */
const deleteOverlay = document.getElementById("deleteClientOverlay");
const closeDeleteBtn = document.getElementById("closeDeleteOverlay");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const confirmDeleteBtn = document.getElementById("confirmDelete");

let rowToDelete = null;

document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    rowToDelete = e.currentTarget.closest("tr");
    deleteOverlay.classList.remove("d-none");
  });
});

closeDeleteBtn.addEventListener("click", () => {
  deleteOverlay.classList.add("d-none");
});

cancelDeleteBtn.addEventListener("click", () => {
  deleteOverlay.classList.add("d-none");
});

confirmDeleteBtn.addEventListener("click", () => {
  if (rowToDelete) {
    rowToDelete.remove(); // frontend delete
    rowToDelete = null;
  }
  deleteOverlay.classList.add("d-none");
});


});
