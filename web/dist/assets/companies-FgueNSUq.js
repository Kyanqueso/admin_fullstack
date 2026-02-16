import"./bootstrap.min-BB4Wbeoi.js";import{c as m,g as L,s as w}from"./apiCache-BsFi2VyI.js";const c="http://localhost:8000";console.log("Companies API URL:",c);function b(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}const o=document.getElementById("companyGrid"),f=document.querySelector('input[placeholder="Search companies"]'),v=document.querySelector(".form-select"),p=document.getElementById("addCompanyOverlay"),u=document.getElementById("editCompanyOverlay"),y=document.getElementById("deleteCompanyOverlay"),g=document.getElementById("addCompanyForm"),B=document.getElementById("editCompanyForm"),k=document.getElementById("addCompanyName"),h=document.getElementById("editCompanyName"),C=document.getElementById("editCompanyBranch");let r=null,d=[];function S(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}async function s(e,t={}){const n=b(),a=await fetch(e,{...t,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...t.headers||{}}});if(a.status===401||a.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return a}async function i(){const e=`${c}/companies/`,t=L(e);if(t){d=t,l(d);return}o.innerHTML=`
    <div class="col text-center">
      <div class="spinner-border"></div>
    </div>
  `;try{const a=await(await s(e)).json();w(e,a),d=a,l(d)}catch(n){console.error("Failed to load companies:",n),o.innerHTML=`
      <div class="col text-danger text-center">
        Failed to load companies
      </div>
    `}}function l(e){if(o.innerHTML="",e.length===0){o.innerHTML=`
      <div class="col text-center text-muted">
        No companies found
      </div>
    `;return}e.forEach(T),$()}function T(e){const t=document.createElement("div");t.className="col",t.innerHTML=`
    <div class="company-card card h-100 position-relative py-4"
         data-company-id="${e.id}"
         style="cursor:pointer;">

      <div class="position-absolute top-0 end-0 p-1 d-flex gap-2">
        <button class="btn btn-sm btn-success edit-company" data-id="${e.id}">✎</button>
        <button class="btn btn-sm btn-danger delete-company" data-id="${e.id}">🗑</button>
      </div>

      <div class="card-body d-flex justify-content-center align-items-center">
        <strong class="fs-3">${S(e.name)}</strong>
      </div>
    </div>
  `,o.appendChild(t)}function $(){const e=document.createElement("div");e.className="col",e.innerHTML=`
    <div id="addCompanyCard"
         class="card h-100 border border-2 d-flex justify-content-center align-items-center py-4"
         style="cursor:pointer;">
      <span class="fs-1 fw-bold">+</span>
    </div>
  `,o.appendChild(e)}document.addEventListener("click",async e=>{if(e.target.closest("#addCompanyCard")){p.classList.remove("d-none");return}const t=e.target.closest(".edit-company");if(t){e.stopPropagation(),await x(t.dataset.id);return}const n=e.target.closest(".delete-company");if(n){e.stopPropagation(),r=n.dataset.id,y.classList.remove("d-none");return}const a=e.target.closest(".company-card");a&&(localStorage.setItem("activeCompanyId",a.dataset.companyId),window.location.href="./clients/clients.html")});function F(e,t){const n=[...e];return t==="name"&&n.sort((a,I)=>a.name.localeCompare(I.name)),n}function E(){const e=f.value.toLowerCase().trim(),t=v.value;let n=d.filter(a=>a.name.toLowerCase().includes(e));n=F(n,t),l(n)}f.addEventListener("input",E);v.addEventListener("change",E);g.onsubmit=async e=>{e.preventDefault();const t=k.value.trim();if(t)try{await s(`${c}/companies/`,{method:"POST",body:JSON.stringify({name:t})}),p.classList.add("d-none"),g.reset(),m(),i()}catch{alert("Failed to add company")}};async function x(e){r=e;const n=await(await s(`${c}/companies/${e}`)).json();h.value=n.name||"",C.value=n.branch||"",u.classList.remove("d-none")}B.onsubmit=async e=>{e.preventDefault();try{await s(`${c}/companies/${r}`,{method:"PATCH",body:JSON.stringify({name:h.value.trim(),branch:C.value.trim()})}),u.classList.add("d-none"),m(),i()}catch{alert("Failed to update company")}};document.getElementById("confirmDeleteCompany").onclick=async()=>{try{await s(`${c}/companies/${r}`,{method:"DELETE"}),y.classList.add("d-none"),m(),i()}catch{alert("Failed to delete company")}};document.getElementById("closeAddCompany").onclick=document.getElementById("cancelAddCompany").onclick=()=>p.classList.add("d-none");document.getElementById("closeEditCompany").onclick=document.getElementById("cancelEditCompany").onclick=()=>u.classList.add("d-none");document.getElementById("closeDeleteCompany").onclick=document.getElementById("cancelDeleteCompany").onclick=()=>y.classList.add("d-none");window.addEventListener("DOMContentLoaded",i);
