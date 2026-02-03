/*
async function loadShoes(){
    try{
        const response = await fetch('http://127.0.0.1:8000/shoe-catalog/items')
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
                    <img src="${shoe.imageUrl || 'https://placehold.co/400'}" class="card-img-top" alt="${shoe.name}">
                    <div class="accent-bg card-body d-flex flex-column">
                        <h5 class="card-title"><strong>${shoe.name}</strong></h5>
                        <p class="card-text flex-grow-1">PHP 1,800</p>
                        <div class="d-flex flex-row gap-3">
                            <a href="#" class="btn w-50 add-edit-shoe">
                                <img src="../../assets/icons/pencil.svg" alt="Edit" width="18" height="18">
                                Edit
                            </a>
                            <a href="#" class="btn btn-danger w-50">
                                <img src="../../assets/icons/trash-can.svg" alt="Delete" width="18" height="18">
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
*/

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
            overlayForm.shoeName.value = '';
            overlayForm.shoePrice.value = '';
            overlayForm.shoeImage.value = '';
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
overlayConfirm.addEventListener('click', () => {
    const type = overlay.dataset.type;
    const shoeId = overlay.dataset.shoeId;

    const name = overlayForm.shoeName.value;
    const price = overlayForm.shoePrice.value;
    const imageFile = overlayForm.shoeImage.files[0];

    if(type === 'add') {
        console.log('Adding new shoe:', { name, price, imageFile });
        // You can now send imageFile to server with FormData
    } else if(type === 'edit') {
        console.log('Editing shoe ID', shoeId, { name, price, imageFile });
    } else if(type === 'delete') {
        console.log('Deleting shoe ID', shoeId);
    }

    closeOverlay();
});

// Button event listeners
document.getElementById('add-shoe-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openOverlay('add');
});

document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-shoe-btn');
    const deleteBtn = e.target.closest('.delete-shoe-btn');

    if (editBtn) {
        e.preventDefault();
        openOverlay('edit', {
            id: 1,
            name: 'Shoe Name',
            price: 'PHP 1,800'
        });
    }

    if (deleteBtn) {
        e.preventDefault();
        openOverlay('delete', { id: 1 });
    }
});
