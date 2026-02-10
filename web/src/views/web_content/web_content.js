import pencilIcon from '../../assets/icons/pencil.svg';
import trashIcon from '../../assets/icons/trash-can.svg';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;

// Logout
document.getElementById('logout-btn').onclick = function() {
    localStorage.clear();
    window.location.href = "../auth/index.html";
};

// DOM elements
const grid = document.getElementById('shoe-grid');
const searchInput = document.querySelector('input[placeholder="Search name"]');
const sortSelect = document.querySelector('.form-select');

const overlay = document.getElementById('shoe-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayForm = document.getElementById('overlay-form');
const overlayCancel = document.getElementById('overlay-cancel');
const overlayConfirm = document.getElementById('overlay-confirm');
const overlayClose = document.getElementById('overlay-close');
const overlayLoading = document.getElementById('overlay-loading');
const overlayStatus = document.getElementById('overlay-status');

let allShoes = [];
let selectedShoeId = null;

/* ===============================
   API HELPERS
=============================== */
async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await response.json();
}

async function fetchShoeById(id) {
    return await apiFetch(`${FAST_API_URL}/shoe-management/shoes/${id}`);
}

/* ===============================
   LOAD SHOES
=============================== */
async function loadShoes() {
    grid.innerHTML = `
        <div class="text-center my-5 w-100">
            <div class="spinner-border text-primary" role="status"></div>
            <p>Loading shoes...</p>
        </div>
    `;

    try {
        const shoes = await apiFetch(`${FAST_API_URL}/shoe-management/shoes`);
        allShoes = shoes;
        renderShoes(allShoes);
    } catch (err) {
        grid.innerHTML = `<p class="text-danger text-center">Failed to load shoes: ${err.message}</p>`;
        console.error(err);
    }
}

/* ===============================
   RENDERING
=============================== */
function renderShoes(shoesArray) {
    grid.innerHTML = '';

    if (shoesArray.length === 0) {
        grid.innerHTML = `<p class="text-center text-muted w-100">No shoes found</p>`;
        return;
    }

    shoesArray.forEach(shoe => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 box-drop-shadow">
                <img src="${shoe.image_url || 'https://placehold.co/400'}" class="card-img-top" alt="${shoe.model_name}">
                <div class="accent-bg card-body d-flex flex-column">
                    <h5 class="card-title"><strong>${highlightQuery(shoe.model_name)}</strong></h5>
                    <p class="card-text flex-grow-1">${shoe.price}</p>

                    <div class="d-flex flex-row gap-3">
                        <a class="btn w-50 edit-shoe-btn" data-shoe-id="${shoe.id}">
                            <img src="${pencilIcon}" width="18" height="18"> Edit
                        </a>
                        <a class="btn btn-danger w-50 delete-shoe-btn" data-shoe-id="${shoe.id}">
                            <img src="${trashIcon}" width="18" height="18"> Delete
                        </a>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

/* ===============================
   SEARCH & SORT
=============================== */
function highlightQuery(text) {
    const query = searchInput.value.trim();
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function sortShoes(shoesArray, sortValue) {
    const arr = [...shoesArray];
    if (sortValue === 'alpha') {
        arr.sort((a, b) => a.model_name.localeCompare(b.model_name));
    } else if (sortValue === 'recent') {
        arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return arr;
}

function applySearchAndSort() {
    let filtered = allShoes.filter(shoe =>
        shoe.model_name.toLowerCase().includes(searchInput.value.toLowerCase().trim())
    );
    filtered = sortShoes(filtered, sortSelect.value);
    renderShoes(filtered);
}

searchInput.addEventListener('input', applySearchAndSort);
sortSelect.addEventListener('change', applySearchAndSort);

/* ===============================
   OVERLAY HELPERS
=============================== */
function showLoadingOverlay() {
    overlayLoading.classList.remove('d-none');
    overlayStatus.classList.add('d-none');
    overlayConfirm.disabled = true;
    overlayCancel.disabled = true;
}

function hideLoadingOverlay() {
    overlayLoading.classList.add('d-none');
    overlayConfirm.disabled = false;
    overlayCancel.disabled = false;
}

function showStatus(message, type = 'success') {
    overlayStatus.textContent = message;
    overlayStatus.classList.remove('bg-success', 'bg-danger', 'text-white');

    if (type === 'success') overlayStatus.classList.add('bg-success', 'text-white');
    else overlayStatus.classList.add('bg-danger', 'text-white');

    overlayStatus.classList.remove('d-none');
    setTimeout(() => overlayStatus.classList.add('d-none'), 5000);
}

function resetOverlayState() {
    overlayMessage.classList.remove('d-none');
    overlayForm.classList.add('d-none');
    overlayConfirm.className = 'btn';
}

function openOverlay(type, shoeData = {}) {
    resetOverlayState();
    overlay.classList.remove('d-none');
    overlay.dataset.type = type;
    overlay.dataset.shoeId = shoeData.id || '';

    if (type === 'add') {
        overlayTitle.innerHTML = '<strong>Add New Shoe</strong>';
        overlayMessage.classList.add('d-none');
        overlayForm.classList.remove('d-none');
        overlayForm.reset();
        overlayConfirm.className = 'btn btn-green';
        overlayConfirm.textContent = 'Add';
    } else if (type === 'edit') {
        overlayTitle.innerHTML = '<strong>Edit Shoe</strong>';
        overlayMessage.classList.add('d-none');
        overlayForm.classList.remove('d-none');
        overlayForm.shoeName.value = shoeData.model_name || '';
        overlayForm.shoePrice.value = shoeData.price || '';
        overlayConfirm.className = 'btn btn-green';
        overlayConfirm.textContent = 'Save';
    } else if (type === 'delete') {
        overlayTitle.innerHTML = '<strong>Delete Shoe?</strong>';
        overlayMessage.textContent = 'Are you sure you want to delete this shoe?';
        overlayForm.classList.add('d-none');
        overlayConfirm.className = 'btn btn-danger';
        overlayConfirm.textContent = 'Delete';
    }
}

function closeOverlay() {
    overlay.classList.add('d-none');
}

function lockOverlayAfterSuccess() {
    overlayConfirm.disabled = true;
    overlayCancel.disabled = true;
    overlayClose.disabled = true;
    overlayConfirm.textContent = 'Done';
}

/* ===============================
   EVENT LISTENERS
=============================== */
overlayCancel.addEventListener('click', closeOverlay);
overlayClose.addEventListener('click', closeOverlay);

document.getElementById('add-shoe-btn').addEventListener('click', e => {
    e.preventDefault();
    openOverlay('add');
});

document.addEventListener('click', async e => {
    const editBtn = e.target.closest('.edit-shoe-btn');
    const deleteBtn = e.target.closest('.delete-shoe-btn');

    if (editBtn) {
        e.preventDefault();
        const id = editBtn.dataset.shoeId;
        try {
            const shoe = await fetchShoeById(id);
            openOverlay('edit', shoe);
        } catch (err) {
            console.error(err);
        }
    }

    if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.dataset.shoeId;
        openOverlay('delete', { id });
    }
});

overlayConfirm.addEventListener('click', async () => {
    const type = overlay.dataset.type;
    const id = overlay.dataset.shoeId;
    const name = overlayForm.shoeName?.value;
    const price = overlayForm.shoePrice?.value;
    const imageFile = overlayForm.shoeImage?.files[0];

    try {
        showLoadingOverlay();
        let response;

        const formData = new FormData();
        if (name) formData.append('model_name', name);
        if (price) formData.append('price', price);
        if (imageFile) formData.append('image', imageFile);

        if (type === 'add') {
            response = await fetch(`${FAST_API_URL}/shoe-management/shoes`, {
                method: 'POST',
                body: formData
            });
        } else if (type === 'edit') {
            response = await fetch(`${FAST_API_URL}/shoe-management/shoes/${id}`, {
                method: 'PATCH',
                body: formData
            });
        } else if (type === 'delete') {
            response = await fetch(`${FAST_API_URL}/shoe-management/shoes/${id}`, {
                method: 'DELETE'
            });
        }

        if (!response.ok) throw new Error(await response.text());

        showStatus(
            type === 'delete' ? 'Shoe deleted successfully!' :
            type === 'edit' ? 'Shoe updated successfully!' : 'Shoe added successfully!',
            'success'
        );
        lockOverlayAfterSuccess();
        await loadShoes();

        setTimeout(() => closeOverlay(), 2500);
    } catch (err) {
        console.error(err);
        showStatus(err.message || 'An error occurred', 'error');
        hideLoadingOverlay();
    }
});

/* ===============================
   INIT
=============================== */
window.addEventListener('DOMContentLoaded', loadShoes);
