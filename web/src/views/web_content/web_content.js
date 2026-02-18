import pencilIcon from '../../assets/icons/pencil.svg';
import trashIcon from '../../assets/icons/trash-can.svg';
import eyeIcon from '../../assets/icons/eye.svg';
import eyeSlashIcon from '../../assets/icons/eye-slash.svg';
import { getFromCache, saveToCache, clearCache } from '../../js/apiCache.js';

const FAST_API_URL = import.meta.env.VITE_BACKEND_URL;

// Logout confirmation overlay
const logoutOverlay = document.getElementById('logout-overlay');
document.getElementById('logout-btn').addEventListener('click', () => logoutOverlay.classList.remove('d-none'));
document.getElementById('logout-overlay-close').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-no').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-yes').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = "../auth/index.html";
});

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

const existingImagesContainer = document.getElementById('existing-images-container');
const existingImagesDiv = document.getElementById('existing-images');
const imageUploadLabel = document.getElementById('image-upload-label');
const imageInput = document.getElementById('shoe-images');

let allShoes = [];
let imagesToRemove = []; // track image IDs to remove during edit

/* ===============================
   HTML ESCAPING
=============================== */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ===============================
   API HELPERS
=============================== */
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    if (!token || token === 'null' || token === 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = "../auth/index.html";
        throw new Error("Missing access token");
    }
    return { 'Authorization': `Bearer ${token}` };
}

async function apiFetch(url, options = {}) {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');
        window.location.href = "../auth/index.html";
        throw new Error("Unauthorized");
    }
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
    const url = `${FAST_API_URL}/shoe-management/admin/shoes`;
    const cached = getFromCache(url);
    if (cached) {
        allShoes = cached;
        renderShoes(allShoes);
        return;
    }

    grid.innerHTML = `
        <div class="text-center my-5 w-100">
            <div class="spinner-border text-primary" role="status"></div>
            <p>Loading shoes...</p>
        </div>
    `;

    try {
        const shoes = await apiFetch(url);  // apiFetch already attaches auth headers
        saveToCache(url, shoes);
        allShoes = shoes;
        renderShoes(allShoes);
    } catch (err) {
        grid.innerHTML = `<p class="text-danger text-center">Failed to load shoes: ${escapeHtml(err.message)}</p>`;
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
        const primaryImage = shoe.images && shoe.images.length > 0
            ? shoe.images[0].image_url
            : 'https://placehold.co/400';

        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        const hiddenBadge = shoe.is_visible ? '' : `<span class="badge bg-secondary mb-2">Hidden</span>`;
        const toggleIcon = shoe.is_visible ? eyeSlashIcon : eyeIcon;
        const toggleLabel = shoe.is_visible ? 'Hide' : 'Show';
        col.innerHTML = `
            <div class="card h-100 box-drop-shadow${shoe.is_visible ? '' : ' opacity-50'}">
                <img src="${escapeHtml(primaryImage)}" class="card-img-top" alt="${escapeHtml(shoe.model_name)}">
                <div class="accent-bg card-body d-flex flex-column">
                    ${hiddenBadge}
                    <h5 class="card-title"><strong>${highlightQuery(shoe.model_name)}</strong></h5>
                    <p class="card-text flex-grow-1">${escapeHtml(String(shoe.price))}</p>

                    <div class="d-flex flex-row gap-2">
                        <a class="btn btn-secondary w-33 toggle-visibility-btn" data-shoe-id="${shoe.id}" data-visible="${shoe.is_visible}">
                            <img src="${toggleIcon}" width="16" height="16"> ${toggleLabel}
                        </a>
                        <a class="btn w-33 edit-shoe-btn" data-shoe-id="${shoe.id}">
                            <img src="${pencilIcon}" width="18" height="18"> Edit
                        </a>
                        <a class="btn btn-danger w-33 delete-shoe-btn" data-shoe-id="${shoe.id}">
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
    const escaped = escapeHtml(text);
    const query = searchInput.value.trim();
    if (!query) return escaped;
    const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

function sortShoes(shoesArray, sortValue) {
    const arr = [...shoesArray];
    if (sortValue === 'a-z') {
        arr.sort((a, b) => a.model_name.localeCompare(b.model_name));
    } else if (sortValue === 'z-a') {
        arr.sort((a, b) => b.model_name.localeCompare(a.model_name));
    } else if (sortValue === 'recent') {
        arr.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
    } else if (sortValue === 'oldest') {
        arr.sort((a, b) => new Date(a.date_added) - new Date(b.date_added));
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
function resetOverlayState() {
    overlayMessage.classList.remove('d-none');
    overlayForm.classList.add('d-none');
    overlayConfirm.className = 'btn';
    overlayConfirm.disabled = false;
    overlayCancel.disabled = false;
    overlayClose.disabled = false;
    existingImagesContainer.classList.add('d-none');
    existingImagesDiv.innerHTML = '';
    imagesToRemove = [];
}

/* ===============================
   EXISTING IMAGES (Edit mode)
=============================== */
function renderExistingImages(images) {
    existingImagesDiv.innerHTML = '';

    if (!images || images.length === 0) {
        existingImagesContainer.classList.add('d-none');
        return;
    }

    existingImagesContainer.classList.remove('d-none');

    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'existing-image-item';
        item.dataset.imageId = img.id;
        item.innerHTML = `
            <img src="${escapeHtml(img.image_url)}" alt="Image ${img.display_order}">
            <button type="button" class="remove-image-btn" title="Remove image">&times;</button>
        `;
        existingImagesDiv.appendChild(item);
    });
}

/* ===============================
   OPEN OVERLAY
=============================== */
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

        // Image input: required for add, label reflects 1-5
        imageUploadLabel.textContent = 'Upload Images (1-5 required)';
        imageInput.required = true;

    } else if (type === 'edit') {
        overlayTitle.innerHTML = '<strong>Edit Shoe</strong>';
        overlayMessage.classList.add('d-none');
        overlayForm.classList.remove('d-none');
        overlayForm.shoeName.value = shoeData.model_name || '';
        overlayForm.shoePrice.value = shoeData.price || '';
        overlayConfirm.className = 'btn btn-green';
        overlayConfirm.textContent = 'Save';

        // Show existing images with remove buttons
        renderExistingImages(shoeData.images || []);

        // Image input: optional for edit
        imageUploadLabel.textContent = 'Add More Images (optional)';
        imageInput.required = false;

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

/* ===============================
   EVENT LISTENERS
=============================== */
overlayCancel.addEventListener('click', closeOverlay);
overlayClose.addEventListener('click', closeOverlay);

// Remove existing image button (event delegation)
existingImagesDiv.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-image-btn');
    if (!removeBtn) return;

    const item = removeBtn.closest('.existing-image-item');
    const imageId = parseInt(item.dataset.imageId);

    // Check: don't allow removing if it's the last image and no new files are queued
    const remainingItems = existingImagesDiv.querySelectorAll('.existing-image-item').length - 1;
    const newFiles = imageInput.files ? imageInput.files.length : 0;

    if (remainingItems + newFiles < 1) {
        alert('Shoe must have at least 1 image');
        return;
    }

    imagesToRemove.push(imageId);
    item.remove();
});

// Validate file count on input change
imageInput.addEventListener('change', () => {
    const newFiles = imageInput.files ? imageInput.files.length : 0;
    const type = overlay.dataset.type;

    if (type === 'add') {
        if (newFiles > 5) {
            alert('You can upload a maximum of 5 images');
            imageInput.value = '';
        }
    } else if (type === 'edit') {
        const remainingExisting = existingImagesDiv.querySelectorAll('.existing-image-item').length;
        if (remainingExisting + newFiles > 5) {
            alert(`You can only have 5 images total. Currently ${remainingExisting} existing.`);
            imageInput.value = '';
        }
    }
});

document.getElementById('add-shoe-btn').addEventListener('click', e => {
    e.preventDefault();
    openOverlay('add');
});

document.addEventListener('click', async e => {
    const editBtn = e.target.closest('.edit-shoe-btn');
    const deleteBtn = e.target.closest('.delete-shoe-btn');
    const toggleBtn = e.target.closest('.toggle-visibility-btn');

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

    if (toggleBtn) {
        e.preventDefault();
        const id = toggleBtn.dataset.shoeId;
        toggleBtn.textContent = '...';
        toggleBtn.style.pointerEvents = 'none';
        try {
            await apiFetch(`${FAST_API_URL}/shoe-management/shoes/${id}/visibility`, { method: 'PATCH' });
            clearCache();
            await loadShoes();
        } catch (err) {
            console.error(err);
            alert('Failed to toggle visibility');
            toggleBtn.textContent = toggleBtn.dataset.visible === 'true' ? 'Hide' : 'Show';
            toggleBtn.style.pointerEvents = '';
        }
    }
});

/* ===============================
   CONFIRM ACTION
=============================== */
overlayConfirm.addEventListener('click', async () => {
    const type = overlay.dataset.type;
    const id = overlay.dataset.shoeId;
    const name = overlayForm.shoeName?.value;
    const price = overlayForm.shoePrice?.value;
    const newFiles = imageInput.files;

    // Store original button text to restore on error
    const originalText = overlayConfirm.textContent;

    try {
        // Disable buttons and show progress text
        overlayConfirm.disabled = true;
        overlayCancel.disabled = true;
        overlayClose.disabled = true;

        let response;
        const authHeaders = getAuthHeaders();

        // =====================
        // ADD
        // =====================
        if (type === 'add') {
            if (!newFiles || newFiles.length === 0) {
                throw new Error('Please select at least 1 image');
            }
            if (newFiles.length > 5) {
                throw new Error('Maximum 5 images allowed');
            }

            overlayConfirm.textContent = 'Adding...';

            const formData = new FormData();
            formData.append('model_name', name);
            formData.append('price', price);
            for (const file of newFiles) {
                formData.append('images', file);
            }

            response = await fetch(`${FAST_API_URL}/shoe-management/shoes`, {
                method: 'POST',
                headers: authHeaders,
                body: formData
            });
        }

        // =====================
        // EDIT
        // =====================
        if (type === 'edit') {
            const remainingExisting = existingImagesDiv.querySelectorAll('.existing-image-item').length;
            const newCount = newFiles ? newFiles.length : 0;

            if (remainingExisting + newCount < 1) {
                throw new Error('Shoe must have at least 1 image');
            }
            if (remainingExisting + newCount > 5) {
                throw new Error('Maximum 5 images allowed');
            }

            overlayConfirm.textContent = 'Saving...';

            const formData = new FormData();
            formData.append('model_name', name);
            formData.append('price', price);

            // Append new image files
            if (newFiles && newFiles.length > 0) {
                for (const file of newFiles) {
                    formData.append('images', file);
                }
            }

            // Append image IDs to remove
            if (imagesToRemove.length > 0) {
                formData.append('remove_image_ids', imagesToRemove.join(','));
            }

            response = await fetch(`${FAST_API_URL}/shoe-management/shoes/${id}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: formData
            });
        }

        // =====================
        // DELETE
        // =====================
        if (type === 'delete') {
            overlayConfirm.textContent = 'Deleting...';

            response = await fetch(`${FAST_API_URL}/shoe-management/shoes/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });
        }

        if (!response.ok) throw new Error(await response.text());

        closeOverlay();
        clearCache();
        await loadShoes();
    } catch (err) {
        console.error(err);
        alert(err.message || 'An error occurred');
    } finally {
        overlayConfirm.textContent = originalText;
        overlayConfirm.disabled = false;
        overlayCancel.disabled = false;
        overlayClose.disabled = false;
    }
});

/* ===============================
   INIT
=============================== */
window.addEventListener('DOMContentLoaded', loadShoes);
