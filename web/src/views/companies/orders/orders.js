document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     ADD ORDER OVERLAY
  ========================= */
  const addOverlay = document.getElementById("addOrderOverlay");
  const openAddBtn = document.querySelector(".add-order-btn");
  const closeAddBtn = document.getElementById("closeAddOrder");
  const cancelAddBtn = document.getElementById("cancelAddOrder");

  if (openAddBtn) {
    openAddBtn.addEventListener("click", () => {
      addOverlay.classList.remove("d-none");
    });
  }

  closeAddBtn?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  cancelAddBtn?.addEventListener("click", () => {
    addOverlay.classList.add("d-none");
  });

  /* =========================
     EDIT ORDER OVERLAY
  ========================= */
  const editOverlay = document.getElementById("editOrderOverlay");
  const closeEditBtn = document.getElementById("closeEditOrder");
  const cancelEditBtn = document.getElementById("cancelEditOrder");

  document.querySelectorAll(".edit-order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editOverlay.classList.remove("d-none");
    });
  });

  closeEditBtn?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  cancelEditBtn?.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  /* =========================
     DELETE ORDER OVERLAY
  ========================= */
  const deleteOverlay = document.getElementById("deleteOrderOverlay");
  const closeDeleteBtn = document.getElementById("closeDeleteOrder");
  const cancelDeleteBtn = document.getElementById("cancelDeleteOrder");

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteOverlay.classList.remove("d-none");
    });
  });

  closeDeleteBtn?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

  cancelDeleteBtn?.addEventListener("click", () => {
    deleteOverlay.classList.add("d-none");
  });

});
