import"./bootstrap.min-BB4Wbeoi.js";const c="http://localhost:8000";console.log("Companies API URL:",c);function I(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}const a=document.getElementById("companyGrid"),y=document.querySelector('input[placeholder="Search companies"]'),v=document.querySelector(".form-select"),l=document.getElementById("addCompanyOverlay"),m=document.getElementById("editCompanyOverlay"),p=document.getElementById("deleteCompanyOverlay"),u=document.getElementById("addCompanyForm"),L=document.getElementById("editCompanyForm"),w=document.getElementById("addCompanyName"),g=document.getElementById("editCompanyName"),f=document.getElementById("editCompanyBranch");let s=null,r=[];async function d(e,t={}){const n=I(),o=await fetch(e,{...t,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...t.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return o}async function i(){a.innerHTML=`
    <div class="col text-center">
      <div class="spinner-border"></div>
    </div>
  `;try{r=await(await d(`${c}/companies/`)).json(),h(r)}catch(e){console.error("Failed to load companies:",e),a.innerHTML=`
      <div class="col text-danger text-center">
        Failed to load companies
      </div>
    `}}function h(e){if(a.innerHTML="",e.length===0){a.innerHTML=`
      <div class="col text-center text-muted">
        No companies found
      </div>
    `;return}e.forEach(b),B()}function b(e){const t=document.createElement("div");t.className="col",t.innerHTML=`
    <div class="company-card card h-100 position-relative py-4"
         data-company-id="${e.id}"
         style="cursor:pointer;">

      <div class="position-absolute top-0 end-0 p-1 d-flex gap-2">
        <button class="btn btn-sm btn-success edit-company" data-id="${e.id}">✎</button>
        <button class="btn btn-sm btn-danger delete-company" data-id="${e.id}">🗑</button>
      </div>

      <div class="card-body d-flex justify-content-center align-items-center">
        <strong class="fs-3">${e.name}</strong>
      </div>
    </div>
  `,a.appendChild(t)}function B(){const e=document.createElement("div");e.className="col",e.innerHTML=`
    <div id="addCompanyCard"
         class="card h-100 border border-2 d-flex justify-content-center align-items-center py-4"
         style="cursor:pointer;">
      <span class="fs-1 fw-bold">+</span>
    </div>
  `,a.appendChild(e)}document.addEventListener("click",async e=>{if(e.target.closest("#addCompanyCard")){l.classList.remove("d-none");return}const t=e.target.closest(".edit-company");if(t){e.stopPropagation(),await S(t.dataset.id);return}const n=e.target.closest(".delete-company");if(n){e.stopPropagation(),s=n.dataset.id,p.classList.remove("d-none");return}const o=e.target.closest(".company-card");o&&(localStorage.setItem("activeCompanyId",o.dataset.companyId),window.location.href="./clients/clients.html")});function k(e,t){const n=[...e];return t==="name"&&n.sort((o,E)=>o.name.localeCompare(E.name)),n}function C(){const e=y.value.toLowerCase().trim(),t=v.value;let n=r.filter(o=>o.name.toLowerCase().includes(e));n=k(n,t),h(n)}y.addEventListener("input",C);v.addEventListener("change",C);u.onsubmit=async e=>{e.preventDefault();const t=w.value.trim();if(t)try{await d(`${c}/companies/`,{method:"POST",body:JSON.stringify({name:t})}),l.classList.add("d-none"),u.reset(),i()}catch{alert("Failed to add company")}};async function S(e){s=e;const n=await(await d(`${c}/companies/${e}`)).json();g.value=n.name||"",f.value=n.branch||"",m.classList.remove("d-none")}L.onsubmit=async e=>{e.preventDefault();try{await d(`${c}/companies/${s}`,{method:"PATCH",body:JSON.stringify({name:g.value.trim(),branch:f.value.trim()})}),m.classList.add("d-none"),i()}catch{alert("Failed to update company")}};document.getElementById("confirmDeleteCompany").onclick=async()=>{try{await d(`${c}/companies/${s}`,{method:"DELETE"}),p.classList.add("d-none"),i()}catch{alert("Failed to delete company")}};document.getElementById("closeAddCompany").onclick=document.getElementById("cancelAddCompany").onclick=()=>l.classList.add("d-none");document.getElementById("closeEditCompany").onclick=document.getElementById("cancelEditCompany").onclick=()=>m.classList.add("d-none");document.getElementById("closeDeleteCompany").onclick=document.getElementById("cancelDeleteCompany").onclick=()=>p.classList.add("d-none");window.addEventListener("DOMContentLoaded",i);
