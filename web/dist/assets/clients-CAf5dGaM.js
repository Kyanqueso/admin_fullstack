import"./bootstrap.min-BB4Wbeoi.js";import{p as T}from"./pencil-DOk75lq2.js";const M="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20640%20640'%3e%3c!--!Font%20Awesome%20Free%207.1.0%20by%20@fontawesome%20-%20https://fontawesome.com%20License%20-%20https://fontawesome.com/license/free%20Copyright%202026%20Fonticons,%20Inc.--%3e%3cpath%20d='M232.7%2069.9C237.1%2056.8%20249.3%2048%20263.1%2048L377%2048C390.8%2048%20403%2056.8%20407.4%2069.9L416%2096L512%2096C529.7%2096%20544%20110.3%20544%20128C544%20145.7%20529.7%20160%20512%20160L128%20160C110.3%20160%2096%20145.7%2096%20128C96%20110.3%20110.3%2096%20128%2096L224%2096L232.7%2069.9zM128%20208L512%20208L512%20512C512%20547.3%20483.3%20576%20448%20576L192%20576C156.7%20576%20128%20547.3%20128%20512L128%20208zM216%20272C202.7%20272%20192%20282.7%20192%20296L192%20488C192%20501.3%20202.7%20512%20216%20512C229.3%20512%20240%20501.3%20240%20488L240%20296C240%20282.7%20229.3%20272%20216%20272zM320%20272C306.7%20272%20296%20282.7%20296%20296L296%20488C296%20501.3%20306.7%20512%20320%20512C333.3%20512%20344%20501.3%20344%20488L344%20296C344%20282.7%20333.3%20272%20320%20272zM424%20272C410.7%20272%20400%20282.7%20400%20296L400%20488C400%20501.3%20410.7%20512%20424%20512C437.3%20512%20448%20501.3%20448%20488L448%20296C448%20282.7%20437.3%20272%20424%20272z'/%3e%3c/svg%3e";document.addEventListener("DOMContentLoaded",()=>{const _="http://localhost:8000",a=`${_}/clients`;console.log("Clients API URL:",a);function S(){const e=localStorage.getItem("access_token");if(!e||e==="null"||e==="undefined")throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Missing access token");return e}async function r(e,t={}){const n=S(),o=await fetch(e,{...t,headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json",...t.headers||{}}});if(o.status===401||o.status===403)throw localStorage.removeItem("access_token"),window.location.href="../auth/index.html",new Error("Unauthorized");return o}async function m(){const e=document.getElementById("company_name");try{const n=await(await r(`${_}/companies/${y}`)).json();e.textContent=`${n.name}'s Client List`}catch(t){console.error("Failed to load company name:",t),e.textContent="Client List"}}const d=document.querySelector("tbody"),f=document.getElementById("addClientOverlay"),k=document.getElementById("openOverlay"),A=document.getElementById("closeOverlay"),N=document.getElementById("cancelOverlay"),i=document.getElementById("clientNotesOverlay"),u=document.getElementById("editClientOverlay"),g=document.getElementById("deleteClientOverlay"),b=i.querySelector("textarea"),I=document.getElementById("editFirstName"),E=document.getElementById("editLastName"),$=document.getElementById("editAddress"),B=document.getElementById("editViber"),L=document.querySelector('input[placeholder="Search name"]'),w=document.querySelector(".form-select"),y=localStorage.getItem("activeCompanyId");let c=null,C=null,v=[];if(!y){alert("No company selected."),window.location.href="../companies.html";return}k.onclick=()=>f.classList.remove("d-none"),A.onclick=N.onclick=()=>f.classList.add("d-none");async function p(){d.innerHTML=`
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner-border"></div>
        </td>
      </tr>
    `;try{v=(await(await r(a)).json()).filter(n=>String(n.company_id)===String(y)),h(v)}catch(e){console.error("Failed to load clients:",e),d.innerHTML=`
        <tr>
          <td colspan="8" class="text-danger text-center">
            Failed to load clients
          </td>
        </tr>
      `}}function h(e){if(d.innerHTML="",e.length===0){d.innerHTML=`
        <tr>
          <td colspan="8" class="text-center text-muted">
            No clients found
          </td>
        </tr>
      `;return}e.forEach(x)}function x(e){const t=document.createElement("tr");t.dataset.id=e.id,t.innerHTML=`
      <td>${e.first_name}</td>
      <td>${e.last_name}</td>
      <td>${e.address}</td>
      <td>${e.viber_number||"-"}</td>
      <td>${e.updated_at||"-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-dark view-notes">
          View Notes
        </button>
      </td>
      <td>
        <button class="btn btn-sm edit-btn">
          <img src="${T}" width="18">
        </button>
      </td>
      <td>
        <button class="btn btn-sm delete-btn">
          <img src="${M}" width="18">
        </button>
      </td>
    `,d.appendChild(t)}L.addEventListener("input",()=>{const e=L.value.toLowerCase().trim();let t=v.filter(o=>`${o.first_name} ${o.last_name}`.toLowerCase().includes(e));const n=w.value;t=O(t,n),h(t)});function O(e,t){const n=[...e];return t==="name"?n.sort((o,s)=>o.first_name.localeCompare(s.first_name)||o.last_name.localeCompare(s.last_name)):t==="recent"?n.sort((o,s)=>new Date(s.updated_at)-new Date(o.updated_at)):t==="alpha"&&n.sort((o,s)=>`${o.first_name} ${o.last_name}`.localeCompare(`${s.first_name} ${s.last_name}`)),n}w.addEventListener("change",()=>{const e=w.value,t=L.value.toLowerCase().trim();let n=v.filter(o=>`${o.first_name} ${o.last_name}`.toLowerCase().includes(t));n=O(n,e),h(n)}),document.getElementById("overlay-form").onsubmit=async e=>{e.preventDefault();const t=e.target.querySelectorAll("input"),n={first_name:t[0].value.trim(),last_name:t[1].value.trim(),address:t[2].value.trim(),viber_number:t[3].value.trim(),company_id:Number(y)};try{await r(a,{method:"POST",body:JSON.stringify(n)}),f.classList.add("d-none"),e.target.reset(),m(),p()}catch{alert("Failed to add client")}},document.addEventListener("click",async e=>{const t=e.target.closest(".view-notes");if(t){c=t.closest("tr").dataset.id;const l=await(await r(`${a}/${c}`)).json();b.value=l.notes||"",i.classList.remove("d-none");return}const n=e.target.closest(".edit-btn");if(n){c=n.closest("tr").dataset.id;const l=await(await r(`${a}/${c}`)).json();I.value=l.first_name,E.value=l.last_name,$.value=l.address,B.value=l.viber_number||"",u.classList.remove("d-none");return}const o=e.target.closest(".delete-btn");o&&(C=o.closest("tr"),c=C.dataset.id,g.classList.remove("d-none"))}),i.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${a}/${c}`,{method:"PATCH",body:JSON.stringify({notes:b.value.trim()})}),i.classList.add("d-none"),m(),p()}catch{alert("Failed to save notes")}},u.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await r(`${a}/${c}`,{method:"PATCH",body:JSON.stringify({first_name:I.value.trim(),last_name:E.value.trim(),address:$.value.trim(),viber_number:B.value.trim()})}),u.classList.add("d-none"),m(),p()}catch{alert("Failed to update client")}},document.getElementById("confirmDelete").onclick=async()=>{try{await r(`${a}/${c}`,{method:"DELETE"}),C.remove(),g.classList.add("d-none")}catch{alert("Failed to delete client")}},document.getElementById("closeNotesOverlay").onclick=document.getElementById("closeEditOverlay").onclick=document.getElementById("cancelEditOverlay").onclick=document.getElementById("closeDeleteOverlay").onclick=document.getElementById("cancelDelete").onclick=()=>{i.classList.add("d-none"),u.classList.add("d-none"),g.classList.add("d-none")},m(),p()});
