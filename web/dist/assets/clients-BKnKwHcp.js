import"./bootstrap.min-BB4Wbeoi.js";import{p as M}from"./pencil-dark-BzH6uJbB.js";import{t as P}from"./trashcan-black-KBbz5QF_.js";import{g as k,s as N,c as h}from"./apiCache-BsFi2VyI.js";document.addEventListener("DOMContentLoaded",()=>{const L="http://localhost:8000",s=`${L}/clients`;console.log("Clients API URL:",s);function q(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}async function c(e,t={}){const o=q(),n=await fetch(e,{...t,headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json",...t.headers||{}}});if(n.status===401||n.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return n}async function f(){const e=document.getElementById("companyTitle"),t=`${L}/companies/${i}`,o=k(t);if(o){e.textContent=`${o.name}'s Client List`;return}try{const a=await(await c(t)).json();N(t,a),e.textContent=`${a.name}'s Client List`}catch(n){console.error("Failed to load company name:",n),e.textContent="Client List"}}const u=document.querySelector("tbody"),C=document.getElementById("addClientOverlay"),A=document.getElementById("openOverlay"),D=document.getElementById("closeOverlay"),F=document.getElementById("cancelOverlay"),y=document.getElementById("clientNotesOverlay"),g=document.getElementById("editClientOverlay"),B=document.getElementById("deleteClientOverlay"),_=y.querySelector("textarea"),$=document.getElementById("editFirstName"),S=document.getElementById("editLastName"),x=document.getElementById("editAddress"),O=document.getElementById("editViber"),E=document.querySelector('input[placeholder="Search name"]'),I=document.querySelector(".form-select"),i=localStorage.getItem("activeCompanyId");let r=null,w=null,m=[];function v(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}if(!i){alert("No company selected."),window.location.href="../companies.html";return}A.onclick=()=>C.classList.remove("d-none"),D.onclick=F.onclick=()=>C.classList.add("d-none"),f(),p();async function p(){const e=k(s);if(e){m=e.filter(t=>String(t.company_id)===String(i)),b(m);return}u.innerHTML=`
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;try{let t=`${s}?company_id=${i}`;const o=document.querySelector("input[placeholder='Search name']")?.value.trim(),n=document.querySelector("select.form-select")?.value;o&&(t+=`&search=${encodeURIComponent(o)}`),n&&(t+=`&sort=${n}`);const d=await(await c(t)).json();N(s,d),m=d.filter(l=>String(l.company_id)===String(i)),b(m)}catch(t){console.error("Failed to load clients:",t),u.innerHTML=`
        <tr>
          <td colspan="7" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `}}function b(e){if(u.innerHTML="",e.length===0){u.innerHTML=`
        <tr>
          <td colspan="7" class="text-center text-muted">
            No clients found
          </td>
        </tr>
      `;return}e.forEach(H)}function H(e){const t=document.createElement("tr");t.dataset.id=e.id,t.innerHTML=`
      <td>${v(e.first_name)}</td>
      <td>${v(e.last_name)}</td>
      <td>${v(e.address)}</td>
      <td>${v(e.viber_number)||"-"}</td>
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
    `,u.appendChild(t)}E.addEventListener("input",()=>{const e=E.value.toLowerCase().trim();let t=m.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(e));const o=I.value;t=T(t,o),b(t)});function T(e,t){const o=[...e];return t==="name"?o.sort((n,a)=>n.first_name.localeCompare(a.first_name)||n.last_name.localeCompare(a.last_name)):t==="recent"?o.sort((n,a)=>a.id-n.id):t==="oldest"?o.sort((n,a)=>n.id-a.id):t==="alpha"&&o.sort((n,a)=>`${n.first_name} ${n.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)),o}I.addEventListener("change",()=>{const e=I.value,t=E.value.toLowerCase().trim();let o=m.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(t));o=T(o,e),b(o)}),document.getElementById("overlay-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelectorAll("input"),o={first_name:t[0].value.trim(),last_name:t[1].value.trim(),address:t[2].value.trim(),viber_number:t[3].value.trim(),company_id:Number(i)},n=e.target.querySelector('[type="submit"]'),a=document.getElementById("cancelOverlay"),d=document.getElementById("closeOverlay"),l=n.textContent;try{n.disabled=!0,a.disabled=!0,d.disabled=!0,n.textContent="Adding...",await c(s,{method:"POST",body:JSON.stringify(o)}),C.classList.add("d-none"),e.target.reset(),h(),f(),p()}catch{alert("Failed to add client")}finally{n.textContent=l,n.disabled=!1,a.disabled=!1,d.disabled=!1}},document.addEventListener("click",async e=>{const t=e.target.closest(".view-notes");if(t){r=t.closest("tr").dataset.id;const l=await(await c(`${s}/${r}`)).json();_.value=l.notes||"",y.classList.remove("d-none");return}const o=e.target.closest(".edit-btn");if(o){r=o.closest("tr").dataset.id;const l=await(await c(`${s}/${r}`)).json();$.value=l.first_name,S.value=l.last_name,x.value=l.address,O.value=l.viber_number||"",g.classList.remove("d-none");return}const n=e.target.closest(".delete-btn");n&&(w=n.closest("tr"),r=w.dataset.id,B.classList.remove("d-none"))}),y.querySelector("form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelector('[type="submit"]'),o=document.getElementById("closeNotesOverlay"),n=t.textContent;try{t.disabled=!0,o.disabled=!0,t.textContent="Saving...",await c(`${s}/${r}`,{method:"PATCH",body:JSON.stringify({notes:_.value.trim()})}),y.classList.add("d-none"),h(),f(),p()}catch{alert("Failed to save notes")}finally{t.textContent=n,t.disabled=!1,o.disabled=!1}},g.querySelector("form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelector('[type="submit"]'),o=document.getElementById("cancelEditOverlay"),n=document.getElementById("closeEditOverlay"),a=t.textContent;try{t.disabled=!0,o.disabled=!0,n.disabled=!0,t.textContent="Saving...",await c(`${s}/${r}`,{method:"PATCH",body:JSON.stringify({first_name:$.value.trim(),last_name:S.value.trim(),address:x.value.trim(),viber_number:O.value.trim()})}),g.classList.add("d-none"),h(),f(),p()}catch{alert("Failed to update client")}finally{t.textContent=a,t.disabled=!1,o.disabled=!1,n.disabled=!1}},document.getElementById("confirmDelete").onclick=async()=>{const e=document.getElementById("confirmDelete"),t=document.getElementById("cancelDelete"),o=document.getElementById("closeDeleteOverlay"),n=e.textContent;try{e.disabled=!0,t.disabled=!0,o.disabled=!0,e.textContent="Deleting...",await c(`${s}/${r}`,{method:"DELETE"}),w.remove(),B.classList.add("d-none"),h()}catch{alert("Failed to delete client")}finally{e.textContent=n,e.disabled=!1,t.disabled=!1,o.disabled=!1}},document.getElementById("closeNotesOverlay").onclick=document.getElementById("closeEditOverlay").onclick=document.getElementById("cancelEditOverlay").onclick=document.getElementById("closeDeleteOverlay").onclick=document.getElementById("cancelDelete").onclick=()=>{y.classList.add("d-none"),g.classList.add("d-none"),B.classList.add("d-none")}});
