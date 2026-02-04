
async function loadShoes(){
    try{
        const response = await fetch('http://127.0.0.1:8000/shoe-management/shoes')
        if (!response.ok){
            throw new Error('Something went wrong while fetching shoe data');
        }

        const shoes = await response.json();

        const grid = document.getElementById('shoe-grid');
        grid.innerHTML = '';

        shoes.forEach(shoe => {
            const col= document.createElement('div');
            col.className = "col-12 col-md-6 col-lg-4";
            col.innerHTML = `
                <div class="card h-100 box-drop-shadow">
                    <img src="${shoe.image_url || 'https://placehold.co/400'}" class="card-img-top" alt="${shoe.model_name}">
                    <div class="accent-bg card-body d-flex flex-column">
                        <h5 class="card-title"><strong>${shoe.model_name}</strong></h5>
                        <p class="card-text flex-grow-1">${shoe.price}</p>

                        <div class="d-flex flex-row gap-3">
                            <a class="btn w-50 edit-shoe-btn" data-shoe-id="${shoe.id}">
                                <img src="../../assets/icons/pencil.svg" width="18" height="18">
                                Edit
                            </a>

                            <a class="btn btn-danger w-50 delete-shoe-btn" data-shoe-id="${shoe.id}">
                                <img src="../../assets/icons/trash-can.svg" width="18" height="18">
                                Delete
                            </a>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading shoes:', error);
    }
}

window.addEventListener('DOMContentLoaded', loadShoes);

async function fetchShoeById(id){
    const response = await fetch(`http://127.0.0.1:8000/shoe-management/shoes/${id}`);
    if(!response.ok) throw new Error('Failed to fetch shoe data');
    return await response.json();
}

// Overlay elements
const overlay = document.getElementById('shoe-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayForm = document.getElementById('overlay-form');
const overlayCancel = document.getElementById('overlay-cancel');
const overlayConfirm = document.getElementById('overlay-confirm');
const overlayClose = document.getElementById('overlay-close');

// Reset overlay state
function resetOverlayState() {
    overlayMessage.classList.remove('d-none');
    overlayForm.classList.add('d-none');
    overlayConfirm.className = 'btn';
}

// Open overlay
function openOverlay(type, shoeData = {}) {
    resetOverlayState();
    overlay.classList.remove('d-none');

    switch(type) {
        case 'add':
            overlayTitle.innerHTML = '<strong>Add New Shoe</strong>';
            overlayMessage.classList.add('d-none');
            overlayForm.classList.remove('d-none');
            overlayForm.reset();
            overlayConfirm.className = 'btn btn-green';
            overlayConfirm.textContent = 'Add';
            break;

        case 'edit':
            overlayTitle.innerHTML = '<strong>Edit Shoe</strong>';
            overlayMessage.classList.add('d-none');
            overlayForm.classList.remove('d-none');

            overlayForm.shoeName.value = shoeData.model_name || '';
            overlayForm.shoePrice.value = shoeData.price || '';

            overlayConfirm.className = 'btn btn-green';
            overlayConfirm.textContent = 'Save';
            break;

        case 'delete':
            overlayTitle.innerHTML = '<strong>Delete Shoe?</strong>';
            overlayMessage.textContent = `Are you sure you want to delete this shoe?`;
            overlayForm.classList.add('d-none');
            overlayConfirm.className = 'btn btn-danger';
            overlayConfirm.textContent = 'Delete';
            break;
    }

    overlay.dataset.type = type;
    overlay.dataset.shoeId = shoeData.id || '';
}

// Close overlay
function closeOverlay() {
    overlay.classList.add('d-none');
}

// Event listeners
overlayCancel.addEventListener('click', closeOverlay);
overlayClose.addEventListener('click', closeOverlay);

// Confirm overlay action
overlayConfirm.addEventListener('click', async () => {

    const type = overlay.dataset.type;
    const id = overlay.dataset.shoeId;

    const name = overlayForm.shoeName.value;
    const price = overlayForm.shoePrice.value;
    const imageFile = overlayForm.shoeImage.files[0];

    try {

        // =====================
        // ADD
        // =====================
        if (type === 'add') {

            const formData = new FormData();
            formData.append('model_name', name);
            formData.append('price', price);
            if (imageFile) formData.append('image', imageFile);

            const response = await fetch('http://127.0.0.1:8000/shoe-management/shoes', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(await response.text());
        }

        // =====================
        // EDIT (PATCH)
        // =====================
        if (type === 'edit') {

            const formData = new FormData();
            formData.append('model_name', name);
            formData.append('price', price);
            if (imageFile) formData.append('image', imageFile);

            const response = await fetch(`http://127.0.0.1:8000/shoe-management/shoes/${id}`, {
                method: 'PATCH',
                body: formData
            });

            if (!response.ok) throw new Error(await response.text());
        }

        // =====================
        // DELETE
        // =====================
        if (type === 'delete') {

            const response = await fetch(`http://127.0.0.1:8000/shoe-management/shoes/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(await response.text());
        }

        loadShoes();
        closeOverlay();

    } catch (error) {
        console.error('Overlay action failed:', error);
    }

});

// Button event listeners
document.getElementById('add-shoe-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openOverlay('add');
});

document.addEventListener('click', async (e) => {

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
