const FAST_API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

window.addEventListener('pageshow', () => {
    if (!localStorage.getItem('access_token')) window.location.href = '/403.html';
});

let allAdmins = [];
let currentUserUid = null;
let pendingRemoveUid = null;

/* ===============================
   AUTH HELPERS
=============================== */
function getCurrentUserUid() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
        // JWT uses base64url — replace chars before decoding
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || null;
    } catch {
        return null;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    if (!token || token === 'null' || token === 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/403.html';
        throw new Error('Missing access token');
    }
    return { 'Authorization': `Bearer ${token}` };
}

async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');
        window.location.href = '/403.html';
        throw new Error('Unauthorized');
    }
    return response;
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
   ERROR HELPERS
=============================== */
function showPageError(msg) {
    const el = document.getElementById('page-error');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearPageError() {
    const el = document.getElementById('page-error');
    el.textContent = '';
    el.classList.add('d-none');
}

function showAddError(msg) {
    const el = document.getElementById('add-overlay-error');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearAddError() {
    const el = document.getElementById('add-overlay-error');
    el.textContent = '';
    el.classList.add('d-none');
}

/* ===============================
   LIVE INPUT VALIDATION & BLOCKING
=============================== */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setFieldError(inputEl, errorEl, msg) {
    if (msg) {
        inputEl.classList.add('is-invalid');
        errorEl.textContent = msg;
        errorEl.classList.remove('d-none');
    } else {
        inputEl.classList.remove('is-invalid');
        errorEl.textContent = '';
        errorEl.classList.add('d-none');
    }
}

// Strip characters in real-time, preserving cursor position
function stripChars(el, cleanFn) {
    const original = el.value;
    const cleaned = cleanFn(original);
    if (cleaned !== original) {
        let pos = null;
        try { pos = el.selectionStart; } catch {}
        el.value = cleaned;
        if (pos !== null) {
            const newPos = Math.max(0, pos - (original.length - cleaned.length));
            try { el.setSelectionRange(newPos, newPos); } catch {}
        }
    }
    return cleaned;
}

// Blocks: emojis, numbers, anything that isn't a letter/space/hyphen
function blockNameInput(el, errorEl) {
    el.addEventListener('input', () => {
        const cleaned = stripChars(el, v =>
            v.replace(/\p{Extended_Pictographic}/gu, '')
             .replace(/[^A-Za-zÀ-ÿ\s\-]/g, '')
        );
        const bare = cleaned.trim().replace(/[\s\-]/g, '');
        if (cleaned && bare.length < 2) {
            setFieldError(el, errorEl, 'Name is too short');
        } else {
            setFieldError(el, errorEl, '');
        }
    });
}

// Blocks emojis; validates format live
function blockAndValidateEmail(el, errorEl) {
    el.addEventListener('input', () => {
        stripChars(el, v => v.replace(/\p{Extended_Pictographic}/gu, ''));
        const v = el.value.trim();
        if (v && !EMAIL_REGEX.test(v)) {
            setFieldError(el, errorEl, 'Enter a valid email address');
        } else {
            setFieldError(el, errorEl, '');
        }
    });
}

// Blocks emojis only
function blockEmojiInput(el) {
    el.addEventListener('input', () => {
        stripChars(el, v => v.replace(/\p{Extended_Pictographic}/gu, ''));
    });
}

function showRemoveError(msg) {
    const el = document.getElementById('remove-overlay-error');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function clearRemoveError() {
    const el = document.getElementById('remove-overlay-error');
    el.textContent = '';
    el.classList.add('d-none');
}

/* ===============================
   LOAD & RENDER
=============================== */
async function loadAdmins() {
    const container = document.getElementById('admin-table-container');
    container.innerHTML = `
        <div class="d-flex flex-column align-items-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading admins...</p>
        </div>
    `;

    try {
        const response = await apiFetch(`${FAST_API_URL}/admin-accounts/`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        allAdmins = await response.json();
        renderAdmins(allAdmins);
    } catch (err) {
        console.error(err);
        container.innerHTML = '';
        showPageError(`Failed to load admin accounts: ${err.message}`);
    }
}

function renderAdmins(admins) {
    const container = document.getElementById('admin-table-container');

    if (admins.length === 0) {
        container.innerHTML = `<p class="text-muted text-center py-4">No admin accounts found.</p>`;
        return;
    }

    const rows = admins.map(admin => {
        const isSelf = admin.uid === currentUserUid;
        const displayName = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || '—';
        const removeBtn = isSelf
            ? `<button class="btn btn-sm btn-secondary" disabled title="Cannot remove your own account">Remove</button>`
            : `<button class="btn btn-sm btn-danger remove-admin-btn"
                    data-admin-uid="${escapeHtml(admin.uid)}"
                    data-admin-name="${escapeHtml(displayName)}">
                Remove
               </button>`;

        return `
            <tr>
                <td>${escapeHtml(displayName)}${isSelf ? ' <span class="badge bg-secondary ms-1" style="font-size:0.7rem">You</span>' : ''}</td>
                <td>${escapeHtml(admin.email)}</td>
                <td class="text-end">${removeBtn}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover align-middle bg-white rounded" style="border-radius:12px; overflow:hidden;">
                <thead class="table-light">
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* ===============================
   ADD OVERLAY
=============================== */
function clearAllFieldErrors() {
    [
        ['add-first-name', 'err-first-name'],
        ['add-last-name',  'err-last-name'],
        ['add-email',      'err-email'],
    ].forEach(([inputId, errId]) => {
        setFieldError(document.getElementById(inputId), document.getElementById(errId), '');
    });
}

function openAddOverlay() {
    document.getElementById('add-admin-form').reset();
    clearAddError();
    clearAllFieldErrors();
    setAddButtons(false);
    document.getElementById('add-overlay').classList.remove('d-none');
}

function closeAddOverlay() {
    document.getElementById('add-overlay').classList.add('d-none');
    clearAddError();
    clearAllFieldErrors();
}

function setAddButtons(loading) {
    const confirm = document.getElementById('add-overlay-confirm');
    const cancel = document.getElementById('add-overlay-cancel');
    const close = document.getElementById('add-overlay-close');
    confirm.disabled = loading;
    cancel.disabled = loading;
    close.disabled = loading;
    confirm.textContent = loading ? 'Adding...' : 'Add';
}

// Live blocking + validation listeners
const firstNameInput = document.getElementById('add-first-name');
const lastNameInput  = document.getElementById('add-last-name');
const emailInput     = document.getElementById('add-email');

blockNameInput(firstNameInput, document.getElementById('err-first-name'));
blockNameInput(lastNameInput,  document.getElementById('err-last-name'));
blockAndValidateEmail(emailInput, document.getElementById('err-email'));
blockEmojiInput(document.getElementById('add-password'));
blockEmojiInput(document.getElementById('add-confirm-password'));

document.getElementById('add-admin-btn').addEventListener('click', openAddOverlay);
document.getElementById('add-overlay-cancel').addEventListener('click', closeAddOverlay);
document.getElementById('add-overlay-close').addEventListener('click', closeAddOverlay);

document.getElementById('add-overlay-confirm').addEventListener('click', async () => {
    clearAddError();

    const firstName = document.getElementById('add-first-name').value.trim();
    const lastName  = document.getElementById('add-last-name').value.trim();
    const email     = document.getElementById('add-email').value.trim();
    const password  = document.getElementById('add-password').value;
    const confirm   = document.getElementById('add-confirm-password').value;

    // Client-side validation
    if (!firstName || !lastName) {
        showAddError('First and last name are required.');
        return;
    }
    if (!email) {
        showAddError('Email is required.');
        return;
    }
    if (!password) {
        showAddError('Password is required.');
        return;
    }
    if (password.length < 8) {
        showAddError('Password must be at least 8 characters.');
        return;
    }
    if (password !== confirm) {
        showAddError('Passwords do not match.');
        return;
    }

    setAddButtons(true);

    try {
        const response = await apiFetch(`${FAST_API_URL}/admin-accounts/`, {
            method: 'POST',
            body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || `Error ${response.status}`);
        }

        closeAddOverlay();
        clearPageError();
        await loadAdmins();
    } catch (err) {
        console.error(err);
        showAddError(err.message || 'Failed to add admin.');
    } finally {
        setAddButtons(false);
    }
});

/* ===============================
   REMOVE OVERLAY
=============================== */
function openRemoveOverlay(adminUid, adminName) {
    pendingRemoveUid = adminUid;
    document.getElementById('remove-overlay-name').textContent = `Remove "${adminName}"?`;
    clearRemoveError();
    setRemoveButtons(false);
    document.getElementById('remove-overlay').classList.remove('d-none');
}

function closeRemoveOverlay() {
    pendingRemoveUid = null;
    document.getElementById('remove-overlay').classList.add('d-none');
    clearRemoveError();
}

function setRemoveButtons(loading) {
    const confirm = document.getElementById('remove-overlay-confirm');
    const cancel  = document.getElementById('remove-overlay-cancel');
    const close   = document.getElementById('remove-overlay-close');
    confirm.disabled = loading;
    cancel.disabled  = loading;
    close.disabled   = loading;
    confirm.textContent = loading ? 'Removing...' : 'Remove';
}

document.getElementById('remove-overlay-cancel').addEventListener('click', closeRemoveOverlay);
document.getElementById('remove-overlay-close').addEventListener('click', closeRemoveOverlay);

document.getElementById('remove-overlay-confirm').addEventListener('click', async () => {
    if (!pendingRemoveUid) return;
    clearRemoveError();
    setRemoveButtons(true);

    try {
        const response = await apiFetch(`${FAST_API_URL}/admin-accounts/${pendingRemoveUid}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || `Error ${response.status}`);
        }

        closeRemoveOverlay();
        clearPageError();
        await loadAdmins();
    } catch (err) {
        console.error(err);
        showRemoveError(err.message || 'Failed to remove admin.');
    } finally {
        setRemoveButtons(false);
    }
});

// Event delegation for remove buttons in the table
document.getElementById('admin-table-container').addEventListener('click', e => {
    const btn = e.target.closest('.remove-admin-btn');
    if (!btn) return;
    const uid  = btn.dataset.adminUid;
    const name = btn.dataset.adminName;
    openRemoveOverlay(uid, name);
});

/* ===============================
   LOGOUT
=============================== */
const logoutOverlay = document.getElementById('logout-overlay');
document.getElementById('logout-btn').addEventListener('click', () => logoutOverlay.classList.remove('d-none'));
document.getElementById('logout-overlay-close').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-no').addEventListener('click', () => logoutOverlay.classList.add('d-none'));
document.getElementById('logout-yes').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/src/views/auth/index.html';
});

/* ===============================
   INIT
=============================== */
window.addEventListener('DOMContentLoaded', () => {
    currentUserUid = getCurrentUserUid();
    loadAdmins();
});
