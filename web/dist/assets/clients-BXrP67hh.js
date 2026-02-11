import"./bootstrap.min-BB4Wbeoi.js";import{p as F}from"./pencil-DOk75lq2.js";import{t as q}from"./trashcan-black-KBbz5QF_.js";document.addEventListener("DOMContentLoaded",()=>{const E="http://localhost:8000",s=`${E}/clients`;console.log("Clients API URL:",s);function k(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}async function r(e,t={}){const n=k(),o=await fetch(e,{...t,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...t.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return o}async function u(){const e=document.getElementById("company_name");try{const n=await(await r(`${E}/companies/${p}`)).json();e.textContent=`${n.name}'s Client List`}catch(t){console.error("Failed to load company name:",t),e.textContent="Client List"}}const d=document.querySelector("tbody"),g=document.getElementById("addClientOverlay"),N=document.getElementById("openOverlay"),A=document.getElementById("closeOverlay"),T=document.getElementById("cancelOverlay"),i=document.getElementById("clientNotesOverlay"),y=document.getElementById("editClientOverlay"),w=document.getElementById("deleteClientOverlay"),I=i.querySelector("textarea"),$=document.getElementById("editFirstName"),C=document.getElementById("editLastName"),B=document.getElementById("editAddress"),O=document.getElementById("editViber"),h=document.querySelector('input[placeholder="Search name"]'),_=document.querySelector(".form-select"),p=localStorage.getItem("activeCompanyId");let l=null,b=null,v=[];function m(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}if(!p){alert("No company selected."),window.location.href="../companies.html";return}N.onclick=()=>g.classList.remove("d-none"),A.onclick=T.onclick=()=>g.classList.add("d-none");async function f(){d.innerHTML=`
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;try{v=(await(await r(s)).json()).filter(n=>String(n.company_id)===String(p)),L(v)}catch(e){console.error("Failed to load clients:",e),d.innerHTML=`
        <tr>
          <td colspan="8" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `}}function L(e){if(d.innerHTML="",e.length===0){d.innerHTML=`
        <tr>
          <td colspan="8" class="text-center text-muted">
            No clients found
          </td>
        </tr>
      `;return}e.forEach(D)}function D(e){const t=document.createElement("tr");t.dataset.id=e.id,t.innerHTML=`
      <td>${m(e.first_name)}</td>
      <td>${m(e.last_name)}</td>
      <td>${m(e.address)}</td>
      <td>${m(e.viber_number)||"-"}</td>
      <td>${m(e.updated_at)||"-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-dark view-notes">
          View Notes
        </button>
      </td>
      <td>
        <button class="btn btn-sm edit-btn">
          <img src="${F}" width="18">
        </button>
      </td>
      <td>
        <button class="btn btn-sm delete-btn">
          <img src="${q}" width="18">
        </button>
      </td>
    `,d.appendChild(t)}h.addEventListener("input",()=>{const e=h.value.toLowerCase().trim();let t=v.filter(o=>`${o.first_name} ${o.last_name}`.toLowerCase().includes(e));const n=_.value;t=S(t,n),L(t)});function S(e,t){const n=[...e];return t==="name"?n.sort((o,a)=>o.first_name.localeCompare(a.first_name)||o.last_name.localeCompare(a.last_name)):t==="recent"?n.sort((o,a)=>new Date(a.updated_at)-new Date(o.updated_at)):t==="alpha"&&n.sort((o,a)=>`${o.first_name} ${o.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)),n}_.addEventListener("change",()=>{const e=_.value,t=h.value.toLowerCase().trim();let n=v.filter(o=>`${o.first_name} ${o.last_name}`.toLowerCase().includes(t));n=S(n,e),L(n)}),document.getElementById("overlay-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelectorAll("input"),n={first_name:t[0].value.trim(),last_name:t[1].value.trim(),address:t[2].value.trim(),viber_number:t[3].value.trim(),company_id:Number(p)};try{await r(s,{method:"POST",body:JSON.stringify(n)}),g.classList.add("d-none"),e.target.reset(),u(),f()}catch{alert("Failed to add client")}},document.addEventListener("click",async e=>{const t=e.target.closest(".view-notes");if(t){l=t.closest("tr").dataset.id;const c=await(await r(`${s}/${l}`)).json();I.value=c.notes||"",i.classList.remove("d-none");return}const n=e.target.closest(".edit-btn");if(n){l=n.closest("tr").dataset.id;const c=await(await r(`${s}/${l}`)).json();$.value=c.first_name,C.value=c.last_name,B.value=c.address,O.value=c.viber_number||"",y.classList.remove("d-none");return}const o=e.target.closest(".delete-btn");o&&(b=o.closest("tr"),l=b.dataset.id,w.classList.remove("d-none"))}),i.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${l}`,{method:"PATCH",body:JSON.stringify({notes:I.value.trim()})}),i.classList.add("d-none"),u(),f()}catch{alert("Failed to save notes")}},y.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${l}`,{method:"PATCH",body:JSON.stringify({first_name:$.value.trim(),last_name:C.value.trim(),address:B.value.trim(),viber_number:O.value.trim()})}),y.classList.add("d-none"),u(),f()}catch{alert("Failed to update client")}},document.getElementById("confirmDelete").onclick=async()=>{try{await r(`${s}/${l}`,{method:"DELETE"}),b.remove(),w.classList.add("d-none")}catch{alert("Failed to delete client")}},document.getElementById("closeNotesOverlay").onclick=document.getElementById("closeEditOverlay").onclick=document.getElementById("cancelEditOverlay").onclick=document.getElementById("closeDeleteOverlay").onclick=document.getElementById("cancelDelete").onclick=()=>{i.classList.add("d-none"),y.classList.add("d-none"),w.classList.add("d-none")},u(),f()});
