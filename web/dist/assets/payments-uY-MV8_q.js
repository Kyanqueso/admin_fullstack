import"./bootstrap.min-BB4Wbeoi.js";import{g as v,s as _,c as T}from"./apiCache-BsFi2VyI.js";const b="http://localhost:8000",h=localStorage.getItem("activeCompanyId");let f={},m={},p=[];function B(){const n=localStorage.getItem("access_token");if(!n||n==="null"||n==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Missing access token");return n}async function g(n,e={}){const t=B(),a=await fetch(n,{...e,headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json",...e.headers||{}}});if(a.status===401||a.status===403)throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Unauthorized");return a}document.addEventListener("DOMContentLoaded",async()=>{if(!h){alert("No company selected."),window.location.href="../companies.html";return}document.getElementById("paymentsTableBody").innerHTML=`
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `,await S(),await $(),await w(),C(),k()});async function S(){const n=`${b}/clients/`;let e=v(n);e||(e=await(await g(n)).json(),_(n,e)),e.filter(t=>String(t.company_id)===String(h)).forEach(t=>{f[t.id]=`${t.first_name} ${t.last_name}`})}async function $(){const n=`${b}/client-orders/`;let e=v(n);e||(e=await(await g(n)).json(),_(n,e)),e.filter(t=>f[t.client_id]!==void 0).forEach(t=>{m[t.id]=t})}async function w(){const n=document.getElementById("paymentsTableBody");n.innerHTML=`
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `;const e=`${b}/payment-summaries/`;let t=v(e);t?p=t:(p=await(await g(e)).json(),_(e,p)),L(p)}function L(n){const e=document.getElementById("paymentsTableBody");e.innerHTML="";const t=n.filter(a=>m[a.client_order_id]);if(t.length===0){e.innerHTML=`
      <tr><td colspan="8" class="text-center text-muted">No payments found</td></tr>
    `;return}t.forEach(a=>{const c=m[a.client_order_id],d=f[c.client_id]||"-",o=Number(c.price)*Number(c.quantity),s=c.order_date?new Date(c.order_date).toLocaleDateString():"-",r=a.remaining_balance==0?new Date().toLocaleDateString():"-",u=document.createElement("tr");u.innerHTML=`
      <td>${c.id}</td>
      <td>${d}</td>
      <td>₱${o.toLocaleString()}</td>
      <td>${s}</td>
      <td class="${a.remaining_balance>0?"text-danger":"text-success"}">
        ₱${Number(a.remaining_balance).toLocaleString()}
      </td>
      <td>${r}</td>
      <td>
        <button class="btn btn-sm text-white view-transaction-btn"
          data-summary-id="${a.id}"
          style="background-color: var(--color-primary);">
          👁 View
        </button>
      </td>
      <td>
        <button class="btn btn-sm edit-payment-btn"
          data-summary-id="${a.id}">
          <img src="../../../assets/icons/pencil.svg" width="18">
        </button>
      </td>
    `,e.appendChild(u)}),N()}function C(){const n=document.querySelector('input[placeholder="Search name"]'),e=document.querySelector(".form-select");function t(){const a=(n?.value||"").toLowerCase().trim(),c=e?.value||"";let d=p.filter(o=>{const s=m[o.client_order_id];return s?(f[s.client_id]||"").toLowerCase().includes(a):!1});c==="name"||c==="alpha"?d.sort((o,s)=>{const r=f[m[o.client_order_id]?.client_id]||"",u=f[m[s.client_order_id]?.client_id]||"";return r.localeCompare(u)}):c==="recent"&&d.sort((o,s)=>(m[s.client_order_id]?.id||0)-(m[o.client_order_id]?.id||0)),L(d)}n?.addEventListener("input",t),e?.addEventListener("change",t)}function N(){document.querySelectorAll(".view-transaction-btn").forEach(n=>{n.addEventListener("click",async()=>{const e=n.dataset.summaryId,t=p.find(l=>l.id==e),a=m[t.client_order_id],c=f[a.client_id],d=Number(a.price)*Number(a.quantity);document.getElementById("historyCustomerName").innerText=c,document.getElementById("historyTotalPrice").innerText="₱"+d.toLocaleString(),document.getElementById("historyBalance").innerText="₱"+Number(t.remaining_balance).toLocaleString();const o=document.getElementById("historyTransactionsBody");o.innerHTML="",(await(await g(`${b}/payment-transactions/`)).json()).filter(l=>l.payment_summary_id==e).forEach((l,i)=>{const y=document.createElement("tr");y.innerHTML=`
          <td>${i+1}</td>
          <td>₱${Number(l.paid_amount).toLocaleString()}</td>
          <td>${new Date(l.payment_date).toLocaleDateString()}</td>
        `,o.appendChild(y)}),document.getElementById("transactionHistoryOverlay").classList.remove("d-none")})}),document.querySelectorAll(".edit-payment-btn").forEach(n=>{n.addEventListener("click",async()=>{const e=n.dataset.summaryId,t=p.find(i=>i.id==e),a=m[t.client_order_id],c=f[a.client_id],d=Number(a.price)*Number(a.quantity),o=document.getElementById("editTransactionOverlay");o.dataset.summaryId=e,document.getElementById("editCustomerName").innerText=c,document.getElementById("editTotalPrice").innerText="₱"+d.toLocaleString(),document.getElementById("editCurrentBalance").innerText="₱"+Number(t.remaining_balance).toLocaleString();const s=document.getElementById("transactionsContainer");s.innerHTML="",(await(await g(`${b}/payment-transactions/`)).json()).filter(i=>i.payment_summary_id==e).forEach(i=>{const y=document.createElement("div");y.classList.add("transaction-row"),y.innerHTML=`
          <div>
            <label class="form-label">Amount (₱)</label>
            <input type="number" class="form-control" value="${i.paid_amount}">
          </div>

          <div>
            <label class="form-label">Date</label>
            <input type="date" class="form-control" value="${i.payment_date}">
          </div>

          <button type="button"
            class="delete-transaction-btn"
            data-id="${i.id}">
            🗑
          </button>
        `,s.appendChild(y)}),o.classList.remove("d-none")})})}function k(){document.getElementById("closeTransactionOverlay")?.addEventListener("click",()=>{document.getElementById("transactionHistoryOverlay").classList.add("d-none")}),document.getElementById("closeTransactionBtn")?.addEventListener("click",()=>{document.getElementById("transactionHistoryOverlay").classList.add("d-none")});const n=document.getElementById("editTransactionOverlay");document.getElementById("closeEditTransaction")?.addEventListener("click",()=>{n.classList.add("d-none")}),document.getElementById("cancelEditTransaction")?.addEventListener("click",()=>{n.classList.add("d-none")}),document.getElementById("addTransactionBtn")?.addEventListener("click",()=>{const e=document.getElementById("transactionsContainer"),t=document.createElement("div");t.classList.add("transaction-row"),t.innerHTML=`
        <div>
          <label class="form-label">Amount (₱)</label>
          <input type="number" class="form-control" placeholder="0.00">
        </div>

        <div>
          <label class="form-label">Date</label>
          <input type="date" class="form-control">
        </div>

        <button type="button" class="delete-transaction-btn">🗑</button>
      `,e.appendChild(t)}),document.getElementById("transactionsContainer")?.addEventListener("click",async e=>{if(e.target.classList.contains("delete-transaction-btn")){const t=e.target.dataset.id;t&&await g(`${b}/payment-transactions/${t}`,{method:"DELETE"}),e.target.closest(".transaction-row").remove()}}),document.getElementById("saveTransactionsBtn")?.addEventListener("click",async()=>{const e=document.getElementById("editTransactionOverlay"),t=e.dataset.summaryId;if(!t)return;const a=p.find(r=>r.id==t),c=m[a.client_order_id],d=Number(c.price)*Number(c.quantity),o=document.querySelectorAll("#transactionsContainer .transaction-row");let s=0;for(let r=0;r<o.length;r++){const u=o[r].querySelector("input[type='number']"),l=o[r].querySelector("input[type='date']"),i=parseFloat(u.value),y=l.value;if(!i||i<=0){alert("Payment amount must be greater than 0.");return}if(!y){alert("Please select a payment date.");return}s+=i}if(s>d){alert("Total payments exceed order total.");return}for(let r=0;r<o.length;r++){const u=o[r].querySelector("input[type='number']"),l=o[r].querySelector("input[type='date']"),i=parseFloat(u.value),y=l.value,E=await g(`${b}/payment-transactions/`,{method:"POST",body:JSON.stringify({payment_summary_id:parseInt(t),payment_number:r+1,paid_amount:i,payment_date:y})});if(!E.ok){const I=await E.json();alert(I.detail||"Payment failed.");return}}T(),await w(),e.classList.add("d-none")})}
