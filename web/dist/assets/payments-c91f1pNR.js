import"./bootstrap.min-BB4Wbeoi.js";document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("transactionHistoryOverlay"),a=document.getElementById("closeTransactionOverlay"),o=document.getElementById("closeTransactionBtn");document.querySelectorAll(".view-transaction-btn").forEach(t=>{t.addEventListener("click",()=>{e.classList.remove("d-none")})}),a.addEventListener("click",()=>{e.classList.add("d-none")}),o.addEventListener("click",()=>{e.classList.add("d-none")});const n=document.getElementById("editTransactionOverlay"),s=document.querySelectorAll(".edit-payment-btn"),d=document.getElementById("closeEditTransaction"),l=document.getElementById("cancelEditTransaction"),i=document.getElementById("addTransactionBtn"),c=document.getElementById("transactionsContainer");s.forEach(t=>{t.addEventListener("click",()=>{n.classList.remove("d-none")})}),d.addEventListener("click",()=>{n.classList.add("d-none")}),l.addEventListener("click",()=>{n.classList.add("d-none")}),i.addEventListener("click",()=>{const t=document.createElement("div");t.classList.add("transaction-row"),t.innerHTML=`
      <div>
        <label class="form-label">Amount (₱)</label>
        <input type="number" class="form-control" placeholder="0.00">
      </div>

      <div>
        <label class="form-label">Date</label>
        <input type="text" class="form-control" placeholder="MMM DD, YYYY">
      </div>

      <button type="button" class="delete-transaction-btn">🗑</button>
    `,c.appendChild(t)}),c.addEventListener("click",t=>{t.target.classList.contains("delete-transaction-btn")&&t.target.closest(".transaction-row").remove()})});
