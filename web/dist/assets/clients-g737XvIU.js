import"./bootstrap.min-BB4Wbeoi.js";import{p as M}from"./pencil-OSk29Rca.js";import{t as P}from"./trashcan-black-KBbz5QF_.js";import{g as N,s as A,c as w}from"./apiCache-BsFi2VyI.js";document.addEventListener("DOMContentLoaded",()=>{const I="http://localhost:8000",s=`${I}/clients`;console.log("Clients API URL:",s);function q(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}async function r(e,t={}){const o=q(),n=await fetch(e,{...t,headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json",...t.headers||{}}});if(n.status===401||n.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return n}async function y(){const e=document.getElementById("companyTitle"),t=`${I}/companies/${d}`,o=N(t);if(o){e.textContent=`${o.name}'s Client List`;return}try{const a=await(await r(t)).json();A(t,a),e.textContent=`${a.name}'s Client List`}catch(n){console.error("Failed to load company name:",n),e.textContent="Client List"}}const m=document.querySelector("tbody"),b=document.getElementById("addClientOverlay"),x=document.getElementById("openOverlay"),F=document.getElementById("closeOverlay"),D=document.getElementById("cancelOverlay"),u=document.getElementById("clientNotesOverlay"),f=document.getElementById("editClientOverlay"),C=document.getElementById("deleteClientOverlay"),E=u.querySelector("textarea"),B=document.getElementById("editFirstName"),S=document.getElementById("editLastName"),O=document.getElementById("editAddress"),k=document.getElementById("editViber"),L=document.querySelector('input[placeholder="Search name"]'),_=document.querySelector(".form-select"),d=localStorage.getItem("activeCompanyId");let c=null,$=null,i=[];function p(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}if(!d){alert("No company selected."),window.location.href="../companies.html";return}x.onclick=()=>b.classList.remove("d-none"),F.onclick=D.onclick=()=>b.classList.add("d-none"),y(),v();async function v(){const e=N(s);if(e){i=e.filter(t=>String(t.company_id)===String(d)),g(i);return}m.innerHTML=`
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;try{let t=`${s}?company_id=${d}`;const o=document.querySelector("input[placeholder='Search name']")?.value.trim(),n=document.querySelector("select.form-select")?.value;o&&(t+=`&search=${encodeURIComponent(o)}`),n&&(t+=`&sort=${n}`);const h=await(await r(t)).json();A(s,h),i=h.filter(l=>String(l.company_id)===String(d)),g(i)}catch(t){console.error("Failed to load clients:",t),m.innerHTML=`
        <tr>
          <td colspan="7" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `}}function g(e){if(m.innerHTML="",e.length===0){m.innerHTML=`
        <tr>
          <td colspan="7" class="text-center text-muted">
            No clients found
          </td>
        </tr>
      `;return}e.forEach(H)}function H(e){const t=document.createElement("tr");t.dataset.id=e.id,t.innerHTML=`
      <td>${p(e.first_name)}</td>
      <td>${p(e.last_name)}</td>
      <td>${p(e.address)}</td>
      <td>${p(e.viber_number)||"-"}</td>
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
    `,m.appendChild(t)}L.addEventListener("input",()=>{const e=L.value.toLowerCase().trim();let t=i.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(e));const o=_.value;t=T(t,o),g(t)});function T(e,t){const o=[...e];return t==="name"?o.sort((n,a)=>n.first_name.localeCompare(a.first_name)||n.last_name.localeCompare(a.last_name)):t==="recent"?o.sort((n,a)=>a.id-n.id):t==="oldest"?o.sort((n,a)=>n.id-a.id):t==="alpha"&&o.sort((n,a)=>`${n.first_name} ${n.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)),o}_.addEventListener("change",()=>{const e=_.value,t=L.value.toLowerCase().trim();let o=i.filter(n=>`${n.first_name} ${n.last_name}`.toLowerCase().includes(t));o=T(o,e),g(o)}),document.getElementById("overlay-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelectorAll("input"),o={first_name:t[0].value.trim(),last_name:t[1].value.trim(),address:t[2].value.trim(),viber_number:t[3].value.trim(),company_id:Number(d)};try{await r(s,{method:"POST",body:JSON.stringify(o)}),b.classList.add("d-none"),e.target.reset(),w(),y(),v()}catch{alert("Failed to add client")}},document.addEventListener("click",async e=>{const t=e.target.closest(".view-notes");if(t){c=t.closest("tr").dataset.id;const l=await(await r(`${s}/${c}`)).json();E.value=l.notes||"",u.classList.remove("d-none");return}const o=e.target.closest(".edit-btn");if(o){c=o.closest("tr").dataset.id;const l=await(await r(`${s}/${c}`)).json();B.value=l.first_name,S.value=l.last_name,O.value=l.address,k.value=l.viber_number||"",f.classList.remove("d-none");return}const n=e.target.closest(".delete-btn");n&&($=n.closest("tr"),c=$.dataset.id,C.classList.remove("d-none"))}),u.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${c}`,{method:"PATCH",body:JSON.stringify({notes:E.value.trim()})}),u.classList.add("d-none"),w(),y(),v()}catch{alert("Failed to save notes")}},f.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${s}/${c}`,{method:"PATCH",body:JSON.stringify({first_name:B.value.trim(),last_name:S.value.trim(),address:O.value.trim(),viber_number:k.value.trim()})}),f.classList.add("d-none"),w(),y(),v()}catch{alert("Failed to update client")}},document.getElementById("confirmDelete").onclick=async()=>{try{await r(`${s}/${c}`,{method:"DELETE"}),$.remove(),C.classList.add("d-none"),w()}catch{alert("Failed to delete client")}},document.getElementById("closeNotesOverlay").onclick=document.getElementById("closeEditOverlay").onclick=document.getElementById("cancelEditOverlay").onclick=document.getElementById("closeDeleteOverlay").onclick=document.getElementById("cancelDelete").onclick=()=>{u.classList.add("d-none"),f.classList.add("d-none"),C.classList.add("d-none")}});
