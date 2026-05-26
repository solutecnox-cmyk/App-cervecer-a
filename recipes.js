// recipes.js
// Implementaciones de recetas trasladadas desde funciones.js
export function renderRecipeList() {
    const container = document.getElementById('recipe-list-container');
    container.innerHTML = '';

    if (!window.recipes.length) {
        container.innerHTML = '<div class="text-gray-600">No hay recetas guardadas. Crea una nueva receta primero.</div>';
        return;
    }

    window.recipes.forEach(recipe => {
        const product = window.inventory.find(p => p.id === recipe.productId) || { name: 'Producto desconocido', sku: '' };
        const card = document.createElement('div');
        card.className = 'bg-gray-50 rounded-lg border border-gray-200 p-4';

        const header = document.createElement('div');
        header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3';
        header.innerHTML = `
            <div>
                <p class="font-bold text-lg text-gray-800">${product.name} ${product.sku ? `(${product.sku})` : ''}</p>
                <p class="text-sm text-gray-500">Receta para producto final</p>
            </div>
            <div class="flex gap-2">
                <button onclick="openRecipeModal(${recipe.productId})" class="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"><i class="fas fa-edit mr-2"></i>Editar</button>
                <button onclick="deleteRecipe(${recipe.productId})" class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"><i class="fas fa-trash-alt mr-2"></i>Eliminar</button>
            </div>
        `;

        const ingredientList = document.createElement('div');
        ingredientList.className = 'mt-4 grid gap-2';
        ingredientList.innerHTML = '<p class="font-semibold text-gray-700">Ingredientes:</p>';

        const list = document.createElement('ul');
        list.className = 'space-y-1';
        recipe.ingredients.forEach(ingredient => {
            const ingredientProduct = window.inventory.find(p => p.id === ingredient.ingredientProductId) || { name: 'Ingrediente desconocido', sku: '' };
            const item = document.createElement('li');
            item.className = 'text-sm text-gray-700';
            item.innerHTML = `<strong>${ingredientProduct.name}</strong> ${ingredientProduct.sku ? `(${ingredientProduct.sku})` : ''} — ${ingredient.qtyPerUnit}`;
            list.appendChild(item);
        });
        ingredientList.appendChild(list);

        card.appendChild(header);
        card.appendChild(ingredientList);
        container.appendChild(card);
    });
}

export function deleteRecipe(productId) {
    if (!confirm('¿Seguro quieres eliminar esta receta?')) return;
    window.recipes = window.recipes.filter(r => r.productId !== productId);
    window.saveData();
    renderRecipeList();
    window.showNotification('Receta eliminada.', 'success');
}

export function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients-container');
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center mb-2 ingredient-row';

    let options = '<option value="">-- Ingrediente (Materia Prima) --</option>';
    const rawMaterials = window.inventory.filter(p => p.type === 'raw');
    rawMaterials.forEach(p => {
        options += `<option value="${p.id}">${p.name} (SKU: ${p.sku})</option>`;
    });

    row.innerHTML = `
        <select required class="flex-1 p-2 border border-gray-300 rounded-md ingredient-select">
            ${options}
        </select>
        <input type="number" required step="0.00000001" placeholder="Cant. por unidad" class="w-1/3 p-2 border border-gray-300 rounded-md ingredient-qty">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 p-2"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

export function saveRecipe(event) {
    event.preventDefault();
    const productName = document.getElementById('recipe-product-input').value.trim();
    if (!productName) return window.showNotification('Ingresa o selecciona un producto final.', 'error');

    let prod = window.inventory.find(p => p.name.toLowerCase() === productName.toLowerCase());
    let productId;
    if (prod) {
        productId = prod.id;
    } else {
        const newProd = {
            id: Date.now(),
            type: 'final',
            sku: 'PT-' + Date.now().toString().slice(-6),
            name: productName,
            price: 0,
            supplierId: null,
            quantity: 0,
            volumePerUnit: window.LITERS_PER_BOTTLE,
            unitType: 'und',
            safetyStock: 0
        };
        window.inventory.push(newProd);
        window.saveData();
        window.loadInventory();
        window.updateBatchProductSelect();
        window.updateOrderProductSelect();
        window.updateForecastProductSelect();
        prod = newProd;
        productId = newProd.id;
        window.editingNewProductId = newProd.id;
        setTimeout(() => window.openProductCreatedModal(newProd.id), 120);
    }

    const ingredientRows = document.querySelectorAll('.ingredient-row');
    const ingredients = [];

    ingredientRows.forEach(row => {
        const ingId = parseInt(row.querySelector('.ingredient-select').value);
        const qty = parseFloat(row.querySelector('.ingredient-qty').value);
        if (ingId && qty > 0) {
            ingredients.push({ ingredientProductId: ingId, qtyPerUnit: qty });
        }
    });

    if (ingredients.length === 0) {
        return window.showNotification('Añade al menos un ingrediente válido.', 'error');
    }

    window.recipes = window.recipes.filter(r => r.productId !== productId && r.productId !== window.editingRecipeProductId);
    window.recipes.push({ productId, ingredients });
    window.saveData();
    window.refreshAppUI();
    window.closeRecipeModal();
    window.showNotification('Receta guardada con éxito.', 'success');
}

export function loadRecipes() {
    if (document.getElementById('recipe-list-modal') && !document.getElementById('recipe-list-modal').classList.contains('hidden')) {
        renderRecipeList();
    }
}
