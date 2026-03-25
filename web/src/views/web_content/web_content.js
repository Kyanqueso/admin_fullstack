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
const searchInput = document.querySelector('input[placeholder="Search Shoe Name"]');
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

// Block emojis on all text inputs in real time
[searchInput, document.getElementById('shoe-name')]
    .forEach(el => blockEmojis(el));

// Price input: enforce digits-only, max 5 integer digits, max 2 decimal places
const priceInput = document.getElementById('shoe-price');

priceInput.addEventListener('keydown', e => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
});

priceInput.addEventListener('input', () => {
    let val = priceInput.value.replace(/[^0-9.]/g, '');
    const dotIndex = val.indexOf('.');
    if (dotIndex !== -1) {
        const intPart = val.slice(0, dotIndex).slice(0, 7);
        const decPart = val.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
        val = intPart + '.' + decPart;
    } else {
        val = val.slice(0, 7);
    }
    priceInput.value = val;
});

/* ===============================
   INPUT VALIDATION
=============================== */
const emojiRegex = /\p{Extended_Pictographic}/u;

function isValidInput(value) {
    return value.length <= 50
        && !/[\x00-\x1F\x7F]/.test(value)
        && !emojiRegex.test(value);
}

function blockEmojis(el) {
    el.addEventListener('input', () => {
        const original = el.value;
        const cleaned = original.replace(/\p{Extended_Pictographic}/gu, '');
        if (cleaned !== original) {
            let pos = null;
            try { pos = el.selectionStart; } catch {}
            el.value = cleaned;
            if (pos !== null) {
                const newPos = Math.max(0, pos - (original.length - cleaned.length));
                try { el.setSelectionRange(newPos, newPos); } catch {}
            }
        }
    });
}

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
    // Check in-memory list first — avoids the round-trip on edit
    const local = allShoes.find(s => String(s.id) === String(id));
    if (local) return local;
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
        <div class="col-12 d-flex flex-column align-items-center justify-content-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading shoes...</p>
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
        const sortedImages = shoe.images
            ? [...shoe.images].sort((a, b) => a.display_order - b.display_order)
            : [];
        const primaryImage = sortedImages.length > 0
            ? sortedImages[0].image_url
            : 'https://placehold.co/400';

        const dateAdded = shoe.date_added
            ? new Date(shoe.date_added).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
            : '—';

        const formattedPrice = '₱' + Number(shoe.price).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const imageCount = sortedImages.length;
        const imgCountBadge = imageCount > 1
            ? `<span class="shoe-img-count">${imageCount} photos</span>`
            : '';
        const hiddenBadge = shoe.is_visible ? '' : `<span class="shoe-status-badge">Hidden</span>`;
        const toggleIcon = shoe.is_visible ? eyeSlashIcon : eyeIcon;
        const toggleLabel = shoe.is_visible ? 'Hide' : 'Show';

        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-lg-4';
        col.innerHTML = `
            <div class="shoe-card${shoe.is_visible ? '' : ' is-hidden'}">
                <div class="shoe-card-img-wrap">
                    <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(shoe.model_name)}" loading="lazy">
                    ${hiddenBadge}
                    ${imgCountBadge}
                </div>
                <div class="shoe-card-body">
                    <div class="shoe-card-info">
                        <p class="shoe-card-name">${highlightQuery(shoe.model_name)}</p>
                        <p class="shoe-card-price">${escapeHtml(formattedPrice)}</p>
                        <p class="shoe-card-date">Added ${escapeHtml(dateAdded)}</p>
                    </div>
                    <div class="shoe-card-actions">
                        <a class="shoe-action-btn shoe-action-toggle toggle-visibility-btn" data-shoe-id="${shoe.id}" data-visible="${shoe.is_visible}">
                            <img src="${toggleIcon}" width="14" height="14"> ${toggleLabel}
                        </a>
                        <a class="shoe-action-btn shoe-action-edit edit-shoe-btn" data-shoe-id="${shoe.id}">
                            <img src="${pencilIcon}" width="14" height="14"> Edit
                        </a>
                        <a class="shoe-action-btn shoe-action-delete delete-shoe-btn" data-shoe-id="${shoe.id}">
                            <img src="${trashIcon}" width="14" height="14"> Delete
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

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

searchInput.addEventListener('input', debounce(applySearchAndSort, 150));
sortSelect.addEventListener('change', applySearchAndSort);

/* ===============================
   INLINE ERROR HELPERS
=============================== */
function showOverlayError(msg) {
    const el = document.getElementById('overlay-error-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearOverlayError() {
    const el = document.getElementById('overlay-error-msg');
    if (!el) return;
    el.textContent = '';
    el.classList.add('d-none');
}

function showPageError(msg) {
    const el = document.getElementById('page-error-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearPageError() {
    const el = document.getElementById('page-error-msg');
    if (!el) return;
    el.textContent = '';
    el.classList.add('d-none');
}

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
    clearOverlayError();
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

    // Render sorted by display_order so initial sequence is correct
    const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
    sorted.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'existing-image-item';
        item.dataset.imageId = img.id;
        item.draggable = true;
        item.innerHTML = `
            <img src="${escapeHtml(img.image_url)}" alt="Image ${img.display_order}">
            <span class="order-badge">${index + 1}</span>
            <button type="button" class="remove-image-btn" title="Remove image">&times;</button>
        `;
        existingImagesDiv.appendChild(item);
    });
}

function updateOrderBadges() {
    existingImagesDiv.querySelectorAll('.existing-image-item').forEach((item, i) => {
        const badge = item.querySelector('.order-badge');
        if (badge) badge.textContent = i + 1;
    });
}

/* ===============================
   IMAGE DRAG-AND-DROP (Edit mode)
=============================== */
function setupImageDragDrop() {
    let dragSrc = null;

    existingImagesDiv.addEventListener('dragstart', e => {
        const item = e.target.closest('.existing-image-item');
        if (!item) return;
        dragSrc = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    existingImagesDiv.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.target.closest('.existing-image-item');
        if (!target || target === dragSrc) return;
        existingImagesDiv.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
    });

    existingImagesDiv.addEventListener('dragleave', e => {
        if (!existingImagesDiv.contains(e.relatedTarget)) {
            existingImagesDiv.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });

    existingImagesDiv.addEventListener('drop', e => {
        e.preventDefault();
        const target = e.target.closest('.existing-image-item');
        if (!target || target === dragSrc || !dragSrc) return;

        const allItems = [...existingImagesDiv.querySelectorAll('.existing-image-item')];
        const srcIndex = allItems.indexOf(dragSrc);
        const targetIndex = allItems.indexOf(target);

        if (srcIndex < targetIndex) {
            target.after(dragSrc);
        } else {
            target.before(dragSrc);
        }

        target.classList.remove('drag-over');
        updateOrderBadges();
    });

    existingImagesDiv.addEventListener('dragend', () => {
        existingImagesDiv.querySelectorAll('.dragging, .drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
        dragSrc = null;
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
    clearOverlayError();
    enableAllCardButtons();
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
        showOverlayError('Shoe must have at least 1 image. Please upload another image before removing this one.');
        return;
    }

    imagesToRemove.push(imageId);
    item.remove();
});

// Validate file count on input change
imageInput.addEventListener('change', () => {
    clearOverlayError();
    const newFiles = imageInput.files ? imageInput.files.length : 0;
    const type = overlay.dataset.type;

    if (type === 'add') {
        if (newFiles > 5) {
            showOverlayError('You can upload a maximum of 5 images');
            imageInput.value = '';
        }
    } else if (type === 'edit') {
        const remainingExisting = existingImagesDiv.querySelectorAll('.existing-image-item').length;
        if (remainingExisting + newFiles > 5) {
            showOverlayError(`You can only have 5 images total. Currently ${remainingExisting} existing.`);
            imageInput.value = '';
        }
    }
});

/* ===============================
   CARD BUTTON LOCKING
=============================== */
function disableCardButtonsOnly() {
    document.querySelectorAll('.edit-shoe-btn, .delete-shoe-btn, .toggle-visibility-btn')
        .forEach(btn => { btn.disabled = true; });
}

function enableCardButtonsOnly() {
    document.querySelectorAll('.edit-shoe-btn, .delete-shoe-btn, .toggle-visibility-btn')
        .forEach(btn => { btn.disabled = false; });
}

function disableAllCardButtons() {
    disableCardButtonsOnly();
}

function enableAllCardButtons() {
    enableCardButtonsOnly();
}

document.getElementById('add-shoe-btn').addEventListener('click', e => {
    e.preventDefault();
    disableCardButtonsOnly();
    openOverlay('add');
});

document.addEventListener('click', async e => {
    const editBtn = e.target.closest('.edit-shoe-btn');
    const deleteBtn = e.target.closest('.delete-shoe-btn');
    const toggleBtn = e.target.closest('.toggle-visibility-btn');

    if (editBtn) {
        e.preventDefault();
        const id = editBtn.dataset.shoeId;
        const originalHTML = editBtn.innerHTML;
        disableAllCardButtons();
        editBtn.innerHTML = '...';
        try {
            const shoe = await fetchShoeById(id);
            openOverlay('edit', shoe);
        } catch (err) {
            console.error(err);
            showPageError('Failed to load shoe data');
        } finally {
            enableAllCardButtons();
            editBtn.innerHTML = originalHTML;
        }
    }

    if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.dataset.shoeId;
        disableAllCardButtons();
        openOverlay('delete', { id });
    }

    if (toggleBtn) {
        e.preventDefault();
        const id = toggleBtn.dataset.shoeId;
        clearPageError();
        const originalHTML = toggleBtn.innerHTML;
        disableCardButtonsOnly();
        toggleBtn.innerHTML = '...';
        try {
            await apiFetch(`${FAST_API_URL}/shoe-management/shoes/${id}/visibility`, { method: 'PATCH' });
            clearCache();
            await loadShoes();
        } catch (err) {
            console.error(err);
            showPageError('Failed to toggle visibility');
            enableCardButtonsOnly();
            toggleBtn.innerHTML = originalHTML;
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

    clearOverlayError();

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
            if (!name || !name.trim()) {
                throw new Error('Shoe name is required');
            }
            if (!isValidInput(name.trim())) {
                throw new Error('Shoe name must be 50 characters or fewer with no emojis');
            }
            if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 1) {
                throw new Error('Price must be greater than 1');
            }
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
            if (!name || !name.trim()) {
                throw new Error('Shoe name is required');
            }
            if (!isValidInput(name.trim())) {
                throw new Error('Shoe name must be 50 characters or fewer with no emojis');
            }
            if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 1) {
                throw new Error('Price must be greater than 1');
            }

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

            // Append drag-reordered image IDs so backend applies new display_order
            const orderedIds = [...existingImagesDiv.querySelectorAll('.existing-image-item')]
                .map(item => item.dataset.imageId);
            if (orderedIds.length > 0) {
                formData.append('image_order', orderedIds.join(','));
            }

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

        if (!response.ok) {
            const text = await response.text();
            let errMsg;
            try {
                errMsg = JSON.parse(text).detail || text;
            } catch {
                errMsg = text || `HTTP error: ${response.status}`;
            }
            throw new Error(errMsg);
        }

        closeOverlay();
        clearCache();
        await loadShoes();
    } catch (err) {
        console.error(err);
        showOverlayError(err.message || 'An error occurred');
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
window.addEventListener('DOMContentLoaded', () => {
    loadShoes();
    setupImageDragDrop();
});
