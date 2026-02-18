import"./bootstrap.min-BB4Wbeoi.js";import{g as l,s as m}from"./apiCache-BsFi2VyI.js";const u="http://localhost:8000",p=localStorage.getItem("activeCompanyId");let c={},d=[];function y(){const n=localStorage.getItem("access_token");if(!n||n==="null"||n==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Missing access token");return n}async function h(n,e={}){const t=y(),o=await fetch(n,{...e,headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json",...e.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Unauthorized");return o}document.addEventListener("DOMContentLoaded",async()=>{if(!p){alert("No company selected."),window.location.href="../companies.html";return}await g(),await w(),_()});async function g(){const n=`${u}/clients/`;let e=l(n);e||(e=await(await h(n)).json(),m(n,e)),e.filter(t=>String(t.company_id)===String(p)).forEach(t=>{c[t.id]=`${t.first_name} ${t.last_name}`})}async function w(){const n=document.getElementById("completedOrdersTableBody");if(n){n.innerHTML=`
    <tr><td colspan="15" class="text-center"><div class="spinner-border"></div></td></tr>
  `;try{const e=`${u}/client-orders/?completed=true`;let t=l(e);t||(t=await(await h(e)).json(),m(e,t)),d=t.filter(o=>c[o.client_id]!==void 0),f(d)}catch(e){console.error("Failed to load completed orders",e),document.getElementById("completedOrdersTableBody").innerHTML=`
      <tr><td colspan="15" class="text-danger text-center">Failed to load completed orders</td></tr>
    `}}}function f(n){const e=document.getElementById("completedOrdersTableBody");if(e.innerHTML="",n.length===0){e.innerHTML=`
      <tr><td colspan="15" class="text-center text-muted">No completed orders found</td></tr>
    `;return}n.forEach(t=>{const o=(Number(t.price)*t.quantity).toLocaleString("en-PH",{minimumFractionDigits:2}),a=document.createElement("tr");a.innerHTML=`
      <td>${t.id}</td>
      <td>${c[t.client_id]||t.client_id}</td>
      <td>${t.model}</td>
      <td>${t.size}</td>
      <td>${t.material}</td>
      <td>${t.color}</td>
      <td>${t.heel_type}</td>
      <td>${t.heel_size}</td>
      <td>${t.mold}</td>
      <td>${t.has_buckle?"Yes":"No"}</td>
      <td>${t.has_slingback?"Yes":"No"}</td>
      <td>${t.has_platform?"Yes":"No"}</td>
      <td>${t.quantity}</td>
      <td>₱${Number(t.price).toLocaleString("en-PH",{minimumFractionDigits:2})}</td>
      <td>₱${o}</td>
    `,e.appendChild(a)})}function _(){const n=document.querySelector('input[placeholder="Search name"]'),e=document.querySelector(".form-select");function t(){const o=(n?.value||"").toLowerCase().trim(),a=e?.value||"";let s=d.filter(i=>(c[i.client_id]||"").toLowerCase().includes(o));a==="name"||a==="alpha"?s.sort((i,r)=>(c[i.client_id]||"").localeCompare(c[r.client_id]||"")):a==="recent"&&s.sort((i,r)=>r.id-i.id),f(s)}n?.addEventListener("input",t),e?.addEventListener("change",t)}
