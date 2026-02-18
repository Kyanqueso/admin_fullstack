import"./bootstrap.min-BB4Wbeoi.js";import{g as B,s as T}from"./apiCache-BsFi2VyI.js";const b="http://localhost:8000",S=localStorage.getItem("activeCompanyId");let p={},u={},g=[],x=0;function $(){const t=localStorage.getItem("access_token");if(!t||t==="null"||t==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Missing access token");return t}async function v(t,e={}){const n=$(),a=await fetch(t,{...e,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...e.headers||{}}});if(a.status===401||a.status===403)throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Unauthorized");return a}document.addEventListener("DOMContentLoaded",async()=>{if(!S){window.location.href="../companies.html";return}document.getElementById("paymentsTableBody").innerHTML=`
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `,await M(),await k(),await L(),H(),O()});async function M(){const t=`${b}/clients/`;let e=B(t);e||(e=await(await v(t)).json(),T(t,e)),e.filter(n=>String(n.company_id)===String(S)).forEach(n=>{p[n.id]=`${n.first_name} ${n.last_name}`})}async function k(){const t=`${b}/client-orders/`;let e=B(t);e||(e=await(await v(t)).json(),T(t,e)),e.filter(n=>p[n.client_id]!==void 0).forEach(n=>{u[n.id]=n})}async function L(){const t=document.getElementById("paymentsTableBody");t.innerHTML=`
    <tr><td colspan="8" class="text-center"><div class="spinner-border"></div></td></tr>
  `,g=await(await v(`${b}/payment-summaries/`)).json(),C(g)}function C(t){const e=document.getElementById("paymentsTableBody");e.innerHTML="";const n=t.filter(a=>u[a.client_order_id]);if(n.length===0){e.innerHTML=`
      <tr><td colspan="8" class="text-center text-muted">No payments found</td></tr>
    `;return}n.forEach(a=>{const o=u[a.client_order_id],l=p[o.client_id]||"-",r=Number(o.price)*Number(o.quantity),s=o.order_date?new Date(o.order_date).toLocaleDateString():"-",m=a.remaining_balance==0?new Date().toLocaleDateString():"-",i=document.createElement("tr");i.innerHTML=`
      <td>${o.id}</td>
      <td>${l}</td>
      <td>₱${r.toLocaleString()}</td>
      <td>${s}</td>
      <td class="${a.remaining_balance>0?"text-danger":"text-success"}">
        ₱${Number(a.remaining_balance).toLocaleString()}
      </td>
      <td>${m}</td>
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
    `,e.appendChild(i)}),q()}function H(){const t=document.querySelector('input[placeholder="Search name"]'),e=document.querySelector(".form-select");function n(){const a=(t?.value||"").toLowerCase().trim(),o=e?.value||"";let l=g.filter(r=>{const s=u[r.client_order_id];return s?(p[s.client_id]||"").toLowerCase().includes(a):!1});o==="name"||o==="alpha"?l.sort((r,s)=>{const m=p[u[r.client_order_id]?.client_id]||"",i=p[u[s.client_order_id]?.client_id]||"";return m.localeCompare(i)}):o==="recent"&&l.sort((r,s)=>(u[s.client_order_id]?.id||0)-(u[r.client_order_id]?.id||0)),C(l)}t?.addEventListener("input",n),e?.addEventListener("change",n)}function f(t){const e=document.getElementById("editErrorMsg");e&&(e.textContent=t,e.classList.remove("d-none"))}function w(){const t=document.getElementById("editErrorMsg");t&&(t.textContent="",t.classList.add("d-none"))}function q(){document.querySelectorAll(".view-transaction-btn").forEach(t=>{t.addEventListener("click",async()=>{const e=t.dataset.summaryId,n=g.find(c=>c.id==e),a=u[n.client_order_id],o=p[a.client_id],l=Number(a.price)*Number(a.quantity);document.getElementById("historyCustomerName").innerText=o,document.getElementById("historyTotalPrice").innerText="₱"+l.toLocaleString(),document.getElementById("historyBalance").innerText="₱"+Number(n.remaining_balance).toLocaleString();const r=document.getElementById("historyTransactionsBody");r.innerHTML=`
        <tr><td colspan="3" class="text-center">
          <div class="spinner-border spinner-border-sm"></div>
        </td></tr>
      `,document.getElementById("transactionHistoryOverlay").classList.remove("d-none");const i=(await(await v(`${b}/payment-transactions/`)).json()).filter(c=>c.payment_summary_id==e);if(r.innerHTML="",i.length===0){r.innerHTML=`
          <tr><td colspan="3" class="text-center text-muted">No transactions yet</td></tr>
        `;return}i.forEach((c,d)=>{const y=document.createElement("tr");y.innerHTML=`
          <td>${d+1}</td>
          <td>₱${Number(c.paid_amount).toLocaleString()}</td>
          <td>${new Date(c.payment_date).toLocaleDateString()}</td>
        `,r.appendChild(y)})})}),document.querySelectorAll(".edit-payment-btn").forEach(t=>{t.addEventListener("click",()=>A(t.dataset.summaryId))})}async function A(t){const e=g.find(c=>c.id==t);if(!e)return;const n=u[e.client_order_id],a=p[n.client_id],o=Number(n.price)*Number(n.quantity),l=document.getElementById("editTransactionOverlay");l.dataset.summaryId=t,document.getElementById("editCustomerName").innerText=a,document.getElementById("editTotalPrice").innerText="₱"+o.toLocaleString(),document.getElementById("editCurrentBalance").innerText="₱"+Number(e.remaining_balance).toLocaleString(),w();const r=document.getElementById("transactionsContainer");r.innerHTML=`
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm"></div>
    </div>
  `,l.classList.remove("d-none");const i=(await(await v(`${b}/payment-transactions/`)).json()).filter(c=>c.payment_summary_id==t);x=i.reduce((c,d)=>Math.max(c,d.payment_number??0),0),r.innerHTML="",i.length===0?r.innerHTML=`
      <p class="text-muted text-center small mb-0">
        No transactions yet. Click "+ Add Transaction" to add one.
      </p>
    `:i.forEach(c=>r.appendChild(D(c)))}function D(t){const e=document.createElement("div");return e.classList.add("transaction-row"),e.dataset.transactionId=t.id,e.innerHTML=`
    <div>
      <label class="form-label">Amount (₱)</label>
      <input type="number" class="form-control" value="${t.paid_amount}" readonly tabindex="-1">
    </div>
    <div>
      <label class="form-label">Date</label>
      <input type="date" class="form-control" value="${t.payment_date}" readonly tabindex="-1">
    </div>
    <button type="button" class="delete-transaction-btn" data-id="${t.id}">🗑</button>
  `,e}function O(){document.getElementById("closeTransactionOverlay")?.addEventListener("click",()=>{document.getElementById("transactionHistoryOverlay").classList.add("d-none")}),document.getElementById("closeTransactionBtn")?.addEventListener("click",()=>{document.getElementById("transactionHistoryOverlay").classList.add("d-none")});const t=document.getElementById("editTransactionOverlay");function e(){t.classList.add("d-none"),w()}document.getElementById("closeEditTransaction")?.addEventListener("click",e),document.getElementById("cancelEditTransaction")?.addEventListener("click",e),document.getElementById("addTransactionBtn")?.addEventListener("click",()=>{w();const n=document.getElementById("transactionsContainer"),a=n.querySelector("p.text-muted");a&&a.remove();const o=document.createElement("div");o.classList.add("transaction-row","transaction-row-new"),o.innerHTML=`
      <div>
        <label class="form-label">Amount (₱)</label>
        <input type="number" class="form-control" placeholder="0.00" min="0.01" step="0.01">
      </div>
      <div>
        <label class="form-label">Date</label>
        <input type="date" class="form-control">
      </div>
      <button type="button" class="delete-transaction-btn">🗑</button>
    `,n.appendChild(o),o.querySelector("input[type='number']").focus()}),document.getElementById("transactionsContainer")?.addEventListener("click",async n=>{const a=n.target.closest(".delete-transaction-btn");if(!a)return;w();const o=a.dataset.id;if(o){if(a.disabled=!0,a.textContent="⏳",!(await v(`${b}/payment-transactions/${o}`,{method:"DELETE"})).ok){a.disabled=!1,a.textContent="🗑",f("Failed to delete transaction. Please try again.");return}a.closest(".transaction-row").remove(),await L();const r=t.dataset.summaryId,s=g.find(i=>i.id==r);s&&(document.getElementById("editCurrentBalance").innerText="₱"+Number(s.remaining_balance).toLocaleString());const m=document.getElementById("transactionsContainer");m.querySelector(".transaction-row")||(m.innerHTML=`
            <p class="text-muted text-center small mb-0">
              No transactions yet. Click "+ Add Transaction" to add one.
            </p>
          `)}else a.closest(".transaction-row").remove()}),document.getElementById("saveTransactionsBtn")?.addEventListener("click",async()=>{w();const n=t.dataset.summaryId;if(!n)return;const a=g.find(d=>d.id==n);if(!a)return;const o=Array.from(document.querySelectorAll("#transactionsContainer .transaction-row-new"));if(o.length===0){f("No new transactions to save.");return}let l=0;for(const d of o){const y=d.querySelector("input[type='number']"),h=d.querySelector("input[type='date']"),E=parseFloat(y.value),_=h.value;if(!E||E<=0){f("Payment amount must be greater than 0."),y.focus();return}if(!_){f("Please select a payment date."),h.focus();return}l+=E}if(l>Number(a.remaining_balance)){f(`Total new payments (₱${l.toLocaleString()}) exceed the remaining balance (₱${Number(a.remaining_balance).toLocaleString()}).`),o[o.length-1].querySelector("input[type='number']").focus();return}const r=document.getElementById("saveTransactionsBtn"),s=document.getElementById("cancelEditTransaction"),m=document.getElementById("closeEditTransaction"),i=document.getElementById("addTransactionBtn"),c=r.textContent;try{r.disabled=!0,s.disabled=!0,m.disabled=!0,i.disabled=!0,r.textContent="Saving...";for(let d=0;d<o.length;d++){const y=o[d].querySelector("input[type='number']"),h=o[d].querySelector("input[type='date']"),E=parseFloat(y.value),_=h.value,I=await v(`${b}/payment-transactions/`,{method:"POST",body:JSON.stringify({payment_summary_id:parseInt(n),payment_number:x+d+1,paid_amount:E,payment_date:_})});if(!I.ok){const N=await I.json();f(N.detail||"Failed to save payment."),y.focus();return}}await L(),t.classList.add("d-none")}catch(d){console.error("Failed to save transactions:",d),f("Failed to save transactions. Please try again.")}finally{r.textContent=c,r.disabled=!1,s.disabled=!1,m.disabled=!1,i.disabled=!1}})}
