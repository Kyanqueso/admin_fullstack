import"./bootstrap.min-BB4Wbeoi.js";import{p as M}from"./pencil-DOk75lq2.js";import{t as P}from"./trashcan-black-KBbz5QF_.js";import{c as h,g as N,s as T}from"./apiCache-BsFi2VyI.js";document.addEventListener("DOMContentLoaded",()=>{const E="http://localhost:8000",s=`${E}/clients`;console.log("Clients API URL:",s);function A(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}async function r(e,t={}){const o=A(),n=await fetch(e,{...t,headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json",...t.headers||{}}});if(n.status===401||n.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return n}async function p(){const e=document.getElementById("company_name"),t=`${E}/companies/${u}`,o=N(t);if(o){e.textContent=`${o.name}'s Client List`;return}try{const a=await(await r(t)).json();T(t,a),e.textContent=`${a.name}'s Client List`}catch(n){console.error("Failed to load company name:",n),e.textContent="Client List"}}const i=document.querySelector("tbody"),w=document.getElementById("addClientOverlay"),x=document.getElementById("openOverlay"),D=document.getElementById("closeOverlay"),F=document.getElementById("cancelOverlay"),m=document.getElementById("clientNotesOverlay"),v=document.getElementById("editClientOverlay"),_=document.getElementById("deleteClientOverlay"),I=m.querySelector("textarea"),$=document.getElementById("editFirstName"),B=document.getElementById("editLastName"),S=document.getElementById("editAddress"),O=document.getElementById("editViber"),b=document.querySelector('input[placeholder="Search name"]'),L=document.querySelector(".form-select"),u=localStorage.getItem("activeCompanyId");let c=null,C=null,l=[];function y(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}if(!u){alert("No company selected."),window.location.href="../companies.html";return}x.onclick=()=>w.classList.remove("d-none"),D.onclick=F.onclick=()=>w.classList.add("d-none");async function f(){const e=N(s);if(e){l=e.filter(t=>String(t.company_id)===String(u)),g(l);return}i.innerHTML=`
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;try{const o=await(await r(s)).json();T(s,o),l=o.filter(n=>String(n.company_id)===String(u)),g(l)}catch(t){console.error("Failed to load clients:",t),i.innerHTML=`
        <tr>
          <td colspan="8" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `}}function g(e){if(i.innerHTML="",e.length===0){i.innerHTML=`
        <tr>
          <td colspan="8" class="text-center text-muted">
            No clients found
          </td>
        </tr>
      `;return}e.forEach(q)}function q(e){const t=document.createElement("tr");t.dataset.id=e.id,t.innerHTML=`
      <td>${y(e.first_name)}</td>
      <td>${y(e.last_name)}</td>
      <td>${y(e.address)}</td>
      <td>${y(e.viber_number)||"-"}</td>
      <td>${y(e.updated_at)||"-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-dark view-notes">
          View Notes
        </button>
      </td>
      <td>
        <button class="btn btn-sm edit-btn">
          <img src="${M}" width="18">
        </button>
      </td>
      <td>
        <button class="btn btn-sm delete-btn">
          <img src="${P}" width="18">
        </button>
      </td>
    `,i.appendChild(t)}b.addEventListener("input",()=>{const e=b.value.toLowerCase().trim();let t=l.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(e));const o=L.value;t=k(t,o),g(t)});function k(e,t){const o=[...e];return t==="name"?o.sort((n,a)=>n.first_name.localeCompare(a.first_name)||n.last_name.localeCompare(a.last_name)):t==="recent"?o.sort((n,a)=>new Date(a.updated_at)-new Date(n.updated_at)):t==="alpha"&&o.sort((n,a)=>`${n.first_name} ${n.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)),o}L.addEventListener("change",()=>{const e=L.value,t=b.value.toLowerCase().trim();let o=l.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(t));o=k(o,e),g(o)}),document.getElementById("overlay-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelectorAll("input"),o={first_name:t[0].value.trim(),last_name:t[1].value.trim(),address:t[2].value.trim(),viber_number:t[3].value.trim(),company_id:Number(u)};try{await r(s,{method:"POST",body:JSON.stringify(o)}),w.classList.add("d-none"),e.target.reset(),h(),p(),f()}catch{alert("Failed to add client")}},document.addEventListener("click",async e=>{const t=e.target.closest(".view-notes");if(t){c=t.closest("tr").dataset.id;const d=await(await r(`${s}/${c}`)).json();I.value=d.notes||"",m.classList.remove("d-none");return}const o=e.target.closest(".edit-btn");if(o){c=o.closest("tr").dataset.id;const d=await(await r(`${s}/${c}`)).json();$.value=d.first_name,B.value=d.last_name,S.value=d.address,O.value=d.viber_number||"",v.classList.remove("d-none");return}const n=e.target.closest(".delete-btn");n&&(C=n.closest("tr"),c=C.dataset.id,_.classList.remove("d-none"))}),m.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${c}`,{method:"PATCH",body:JSON.stringify({notes:I.value.trim()})}),m.classList.add("d-none"),h(),p(),f()}catch{alert("Failed to save notes")}},v.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${c}`,{method:"PATCH",body:JSON.stringify({first_name:$.value.trim(),last_name:B.value.trim(),address:S.value.trim(),viber_number:O.value.trim()})}),v.classList.add("d-none"),h(),p(),f()}catch{alert("Failed to update client")}},document.getElementById("confirmDelete").onclick=async()=>{try{await r(`${s}/${c}`,{method:"DELETE"}),C.remove(),_.classList.add("d-none"),h()}catch{alert("Failed to delete client")}},document.getElementById("closeNotesOverlay").onclick=document.getElementById("closeEditOverlay").onclick=document.getElementById("cancelEditOverlay").onclick=document.getElementById("closeDeleteOverlay").onclick=document.getElementById("cancelDelete").onclick=()=>{m.classList.add("d-none"),v.classList.add("d-none"),_.classList.add("d-none")},p(),f()});
