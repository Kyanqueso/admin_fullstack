
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
                    <img src="${shoe.image_url || 'https://placehold.co/400'}" class="card-img-top" alt="${shoe.name}">
                    <div class="accent-bg card-body d-flex flex-column">
                        <h5 class="card-title"><strong>${shoe.model_name}</strong></h5>
                        <p class="card-text flex-grow-1">${shoe.price}</p>
                        <div class="d-flex flex-row gap-3">
                            <a href="#" class="btn w-50 add-edit-shoe" data-shoe-id="${shoe.id}">
                                <img src="../../assets/icons/pencil.svg" alt="Edit" width="18" height="18">
                                Edit
                            </a>
                            <a href="#" class="btn btn-danger w-50 delete-shoe" data-shoe-id="${shoe.id}">
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
overlayConfirm.addEventListener('click', async () => {
    const type = overlay.dataset.type;

    const name = overlayForm.shoeName.value;
    const price = overlayForm.shoePrice.value;
    const imageFile = overlayForm.shoeImage.files[0];

    if (type === 'add') {
        try {
            const formData = new FormData();
            formData.append('model_name', name);
            formData.append('price', price);
            if (imageFile) formData.append('image', imageFile);

            const response = await fetch('http://127.0.0.1:8000/shoe-management/shoes', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Failed to add shoe: ${errText}`);
            }

            const newShoe = await response.json();
            console.log('Shoe added:', newShoe);

            loadShoes(); // refresh grid
        } catch (error) {
            console.error('Error adding shoe:', error);
        }
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
