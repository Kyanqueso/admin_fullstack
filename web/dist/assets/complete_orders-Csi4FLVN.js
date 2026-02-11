import"./bootstrap.min-BB4Wbeoi.js";document.addEventListener("DOMContentLoaded",()=>{const d="http://localhost:8000",w=`${d}/client-orders`,y=`${d}/clients`,L=`${d}/payment-summaries`,f=localStorage.getItem("activeCompanyId");if(!f){alert("No company selected."),window.location.href="../companies.html";return}function C(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Missing access token");return e}async function m(e,t={}){const a=C(),n=await fetch(e,{...t,headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json",...t.headers||{}}});if(n.status===401||n.status===403)throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Unauthorized");return n}function o(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}const l=document.querySelector("tbody"),h=document.querySelector('input[placeholder="Search name"]'),g=document.querySelector(".form-select");let u=[],r={};async function E(){l.innerHTML=`
      <tr><td colspan="15" class="text-center"><div class="spinner-border"></div></td></tr>
    `;try{const[e,t,a]=await Promise.all([m(y),m(w),m(L)]),n=await e.json(),c=await t.json(),s=await a.json(),_=n.filter(i=>String(i.company_id)===String(f));r={},_.forEach(i=>{r[i.id]=i});const S=new Set;s.forEach(i=>{Number(i.remaining_balance)===0&&S.add(i.client_order_id)}),u=c.filter(i=>r[i.client_id]&&S.has(i.id)),p(u)}catch(e){console.error("Failed to load completed orders:",e),l.innerHTML=`
        <tr><td colspan="15" class="text-danger text-center">Failed to load completed orders</td></tr>
      `}}function p(e){if(l.innerHTML="",e.length===0){l.innerHTML=`
        <tr><td colspan="15" class="text-center text-muted">No completed orders found</td></tr>
      `;return}e.forEach(t=>{const a=r[t.client_id],n=a?`${a.first_name} ${a.last_name}`:"Unknown",c=(t.quantity*t.price).toFixed(2),s=document.createElement("tr");s.innerHTML=`
        <td>${o(String(t.id))}</td>
        <td>${o(n)}</td>
        <td>${o(t.model)}</td>
        <td>${o(String(t.size))}</td>
        <td>${o(t.material)}</td>
        <td>${o(t.color)}</td>
        <td>${o(t.heel_type)}</td>
        <td>${o(String(t.heel_size))}</td>
        <td>${o(t.mold)}</td>
        <td>${t.has_buckle?"Yes":"No"}</td>
        <td>${t.has_slingback?"Yes":"No"}</td>
        <td>${t.has_platform?"Yes":"No"}</td>
        <td>${o(String(t.quantity))}</td>
        <td>${o(String(t.price))}</td>
        <td>${o(c)}</td>
      `,l.appendChild(s)})}function $(){const e=h.value.toLowerCase().trim();let t=u.filter(a=>{const n=r[a.client_id];return(n?`${n.first_name} ${n.last_name}`:"").toLowerCase().includes(e)||a.model.toLowerCase().includes(e)});return M(t,g.value)}function M(e,t){const a=[...e];return t==="name"?a.sort((n,c)=>{const s=r[n.client_id]?`${r[n.client_id].first_name} ${r[n.client_id].last_name}`:"",_=r[c.client_id]?`${r[c.client_id].first_name} ${r[c.client_id].last_name}`:"";return s.localeCompare(_)}):t==="recent"?a.sort((n,c)=>new Date(c.order_date)-new Date(n.order_date)):t==="alpha"&&a.sort((n,c)=>n.model.localeCompare(c.model)),a}h.addEventListener("input",()=>p($())),g.addEventListener("change",()=>p($())),E()});
