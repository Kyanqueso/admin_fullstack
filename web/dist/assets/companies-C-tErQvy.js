import"./bootstrap.min-BB4Wbeoi.js";import{c as m,g as L,s as w}from"./apiCache-BsFi2VyI.js";const c="http://localhost:8000",u=document.getElementById("logout-overlay");document.getElementById("logout-btn").addEventListener("click",()=>u.classList.remove("d-none"));document.getElementById("logout-overlay-close").addEventListener("click",()=>u.classList.add("d-none"));document.getElementById("logout-no").addEventListener("click",()=>u.classList.add("d-none"));document.getElementById("logout-yes").addEventListener("click",()=>{localStorage.clear(),window.location.href="../auth/index.html"});console.log("Companies API URL:",c);function B(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}const a=document.getElementById("companyGrid"),f=document.querySelector('input[placeholder="Search companies"]'),h=document.querySelector(".form-select"),p=document.getElementById("addCompanyOverlay"),y=document.getElementById("editCompanyOverlay"),g=document.getElementById("deleteCompanyOverlay"),v=document.getElementById("addCompanyForm"),b=document.getElementById("editCompanyForm"),k=document.getElementById("addCompanyName"),C=document.getElementById("editCompanyName");let l=null,d=[];function S(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}async function s(e,t={}){const n=B(),o=await fetch(e,{...t,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...t.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return o}async function r(){const e=`${c}/companies/`,t=L(e);if(t){d=t,i(d);return}a.innerHTML=`
    <div class="col text-center">
      <div class="spinner-border"></div>
    </div>
  `;try{const o=await(await s(e)).json();w(e,o),d=o,i(d)}catch(n){console.error("Failed to load companies:",n),a.innerHTML=`
      <div class="col text-danger text-center">
        Failed to load companies
      </div>
    `}}function i(e){if(a.innerHTML="",e.length===0){a.innerHTML=`
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
  `,a.appendChild(t)}function $(){const e=document.createElement("div");e.className="col",e.innerHTML=`
    <div id="addCompanyCard"
         class="card h-100 border border-2 d-flex justify-content-center align-items-center py-4"
         style="cursor:pointer;">
      <span class="fs-1 fw-bold">+</span>
    </div>
  `,a.appendChild(e)}document.addEventListener("click",async e=>{if(e.target.closest("#addCompanyCard")){p.classList.remove("d-none");return}const t=e.target.closest(".edit-company");if(t){e.stopPropagation(),await x(t.dataset.id);return}const n=e.target.closest(".delete-company");if(n){e.stopPropagation(),l=n.dataset.id,g.classList.remove("d-none");return}const o=e.target.closest(".company-card");o&&(localStorage.setItem("activeCompanyId",o.dataset.companyId),window.location.href="./clients/clients.html")});function F(e,t){const n=[...e];return t==="name"&&n.sort((o,I)=>o.name.localeCompare(I.name)),n}function E(){const e=f.value.toLowerCase().trim(),t=h.value;let n=d.filter(o=>o.name.toLowerCase().includes(e));n=F(n,t),i(n)}f.addEventListener("input",E);h.addEventListener("change",E);v.onsubmit=async e=>{e.preventDefault();const t=k.value.trim();if(t)try{await s(`${c}/companies/`,{method:"POST",body:JSON.stringify({name:t})}),p.classList.add("d-none"),v.reset(),m(),r()}catch{alert("Failed to add company")}};async function x(e){l=e;const n=await(await s(`${c}/companies/${e}`)).json();C.value=n.name||"",y.classList.remove("d-none")}b.onsubmit=async e=>{e.preventDefault();try{await s(`${c}/companies/${l}`,{method:"PATCH",body:JSON.stringify({name:C.value.trim()})}),y.classList.add("d-none"),m(),r()}catch{alert("Failed to update company")}};document.getElementById("confirmDeleteCompany").onclick=async()=>{try{await s(`${c}/companies/${l}`,{method:"DELETE"}),g.classList.add("d-none"),m(),r()}catch{alert("Failed to delete company")}};document.getElementById("closeAddCompany").onclick=document.getElementById("cancelAddCompany").onclick=()=>p.classList.add("d-none");document.getElementById("closeEditCompany").onclick=document.getElementById("cancelEditCompany").onclick=()=>y.classList.add("d-none");document.getElementById("closeDeleteCompany").onclick=document.getElementById("cancelDeleteCompany").onclick=()=>g.classList.add("d-none");r();
