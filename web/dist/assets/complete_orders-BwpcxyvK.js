import"./bootstrap.min-MSA6jxXh.js";import{g as p,s as h}from"./apiCache-BsFi2VyI.js";const l="http://localhost:8000",m=localStorage.getItem("activeCompanyId");let c={},i=[];function g(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Missing access token");return e}async function u(e,n={}){const t=g(),o=await fetch(e,{...n,headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json",...n.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../../auth/index.html",new Error("Unauthorized");return o}async function w(){const e=document.getElementById("companyTitle"),n=`${l}/companies/${m}`,t=p(n);if(t){e.textContent=`${t.name}'s Completed Orders`;return}try{const a=await(await u(n)).json();h(n,a),e.textContent=`${a.name}'s Completed Orders`}catch(o){console.error("Failed to load company name:",o)}}document.addEventListener("DOMContentLoaded",async()=>{if(!m){alert("No company selected."),window.location.href="../companies.html";return}w(),await $(),await f(),_()});window.addEventListener("pageshow",e=>{e.persisted&&f()});async function $(){const e=`${l}/clients/`;let n=p(e);n||(n=await(await u(e)).json(),h(e,n)),n.filter(t=>String(t.company_id)===String(m)).forEach(t=>{c[t.id]=`${t.first_name} ${t.last_name}`})}async function f(){const e=document.getElementById("completedOrdersTableBody");if(e){e.innerHTML=`
    <tr><td colspan="15" class="text-center"><div class="spinner-border"></div></td></tr>
  `;try{i=(await(await u(`${l}/client-orders/?completed=true`)).json()).filter(o=>c[o.client_id]!==void 0),y(i)}catch(n){console.error("Failed to load completed orders",n),document.getElementById("completedOrdersTableBody").innerHTML=`
      <tr><td colspan="15" class="text-danger text-center">Failed to load completed orders</td></tr>
    `}}}function y(e){const n=document.getElementById("completedOrdersTableBody");if(n.innerHTML="",e.length===0){n.innerHTML=`
      <tr><td colspan="15" class="text-center text-muted">No completed orders found</td></tr>
    `;return}e.forEach(t=>{const o=(Number(t.price)*t.quantity).toLocaleString("en-PH",{minimumFractionDigits:2}),a=document.createElement("tr");a.innerHTML=`
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
    `,n.appendChild(a)})}function _(){const e=document.querySelector('input[placeholder="Search name"]'),n=document.querySelector(".form-select");function t(){const o=(e?.value||"").toLowerCase().trim(),a=n?.value||"";let d=i.filter(s=>(c[s.client_id]||"").toLowerCase().includes(o));a==="name"||a==="alpha"?d.sort((s,r)=>(c[s.client_id]||"").localeCompare(c[r.client_id]||"")):a==="recent"&&d.sort((s,r)=>r.id-s.id),y(d)}e?.addEventListener("input",t),n?.addEventListener("change",t)}
