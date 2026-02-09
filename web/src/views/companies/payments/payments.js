document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     VIEW TRANSACTION HISTORY
  =============================== */
  const historyOverlay = document.getElementById("transactionHistoryOverlay");
  const closeHistoryX = document.getElementById("closeTransactionOverlay");
  const closeHistoryBtn = document.getElementById("closeTransactionBtn");

  document.querySelectorAll(".view-transaction-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      historyOverlay.classList.remove("d-none");
    });
  });

  closeHistoryX.addEventListener("click", () => {
    historyOverlay.classList.add("d-none");
  });

  closeHistoryBtn.addEventListener("click", () => {
    historyOverlay.classList.add("d-none");
  });


  /* ===============================
     EDIT TRANSACTION HISTORY
  =============================== */
  const editOverlay = document.getElementById("editTransactionOverlay");
  const editOpenBtns = document.querySelectorAll(".edit-payment-btn");
  const closeEditX = document.getElementById("closeEditTransaction");
  const cancelEditBtn = document.getElementById("cancelEditTransaction");

  const addTransactionBtn = document.getElementById("addTransactionBtn");
  const transactionsContainer = document.getElementById("transactionsContainer");

  // OPEN edit overlay
  editOpenBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      editOverlay.classList.remove("d-none");
    });
  });

  // CLOSE edit overlay
  closeEditX.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  cancelEditBtn.addEventListener("click", () => {
    editOverlay.classList.add("d-none");
  });

  // ADD transaction row
  addTransactionBtn.addEventListener("click", () => {
    const row = document.createElement("div");
    row.classList.add("transaction-row");

    row.innerHTML = `
      <div>
        <label class="form-label">Amount (₱)</label>
        <input type="number" class="form-control" placeholder="0.00">
      </div>

      <div>
        <label class="form-label">Date</label>
        <input type="text" class="form-control" placeholder="MMM DD, YYYY">
      </div>

      <button type="button" class="delete-transaction-btn">🗑</button>
    `;

    transactionsContainer.appendChild(row);
  });

  // DELETE transaction row (event delegation)
  transactionsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-transaction-btn")) {
      e.target.closest(".transaction-row").remove();
    }
  });

});
