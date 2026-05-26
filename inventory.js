// inventory.js
// Implementaciones de funciones de inventario trasladadas desde funciones.js
export function saveProduct(event) {
    event.preventDefault();
    const type = document.getElementById('product-type').value || 'final';
    const data = {
        type,
        sku: document.getElementById('product-sku').value,
        name: document.getElementById('product-name').value,
        price: type === 'raw' ? 0 : parseFloat(document.getElementById('product-price').value),
        supplierId: document.getElementById('product-supplier').value || null,
        quantity: parseFloat(document.getElementById('product-quantity').value),
        volumePerUnit: type === 'raw' ? 0 : parseFloat(document.getElementById('product-volume').value) || 1,
        purchaseUnit: type === 'raw' ? parseFloat(document.getElementById('product-volume').value) || 1 : undefined,
        unitType: document.getElementById('product-unit-type').value || 'und',
        safetyStock: type === 'raw' ? parseFloat(document.getElementById('product-safety-stock').value) || 0 : 0,
    };
    if (window.editingProductId) {
        const existing = window.inventory.find(p => p.id === window.editingProductId);
        if (existing) {
            Object.assign(existing, data);
            if (type === 'raw') existing.volumePerUnit = 0;
        }
        window.showNotification('Producto actualizado en el inventario.', 'success');
    } else {
        const newProduct = { id: Date.now(), ...data };
        window.inventory.push(newProduct);
        window.showNotification('Producto añadido al inventario.', 'success');
    }
    window.saveData();
    window.refreshAppUI();
    window.closeProductModal();
}

export function openProductCreatedModal(id) {
    const prod = window.inventory.find(p => p.id === id);
    if (!prod) return;
    document.getElementById('product-created-sku').value = prod.sku || '';
    document.getElementById('product-created-name').value = prod.name || '';
    document.getElementById('product-created-price').value = prod.price || 0;
    document.getElementById('product-created-volume').value = prod.volumePerUnit || window.LITERS_PER_BOTTLE;
    document.getElementById('product-created-unit').value = prod.unitType || 'und';
    document.getElementById('product-created-quantity').value = prod.quantity || 0;
    document.getElementById('product-created-safety').value = prod.safetyStock || 0;
    updateProductSupplierSelectForModal();
    document.getElementById('product-created-supplier').value = prod.supplierId || '';
    document.getElementById('product-created-modal').classList.remove('hidden');
}

export function closeProductCreatedModal() {
    document.getElementById('product-created-modal').classList.add('hidden');
    window.editingNewProductId = null;
}

export function updateProductSupplierSelectForModal() {
    const sel = document.getElementById('product-created-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona proveedor --</option>';
    window.suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.nit})`;
        sel.appendChild(opt);
    });
}

export function saveCreatedProductFromModal(event) {
    event.preventDefault();
    if (!window.editingNewProductId) return;
    const prod = window.inventory.find(p => p.id === window.editingNewProductId);
    if (!prod) return;
    prod.sku = document.getElementById('product-created-sku').value || prod.sku;
    prod.price = parseFloat(document.getElementById('product-created-price').value) || 0;
    prod.volumePerUnit = parseFloat(document.getElementById('product-created-volume').value) || prod.volumePerUnit || window.LITERS_PER_BOTTLE;
    prod.unitType = document.getElementById('product-created-unit').value || prod.unitType;
    prod.quantity = parseFloat(document.getElementById('product-created-quantity').value) || prod.quantity || 0;
    prod.safetyStock = parseFloat(document.getElementById('product-created-safety').value) || prod.safetyStock || 0;
    const supp = document.getElementById('product-created-supplier').value;
    prod.supplierId = supp ? (isNaN(parseInt(supp)) ? null : parseInt(supp)) : null;
    window.saveData();
    window.refreshAppUI();
    closeProductCreatedModal();
    window.showNotification('Producto actualizado correctamente.', 'success');
}

export function loadInventory() {
    const tbodyFinal = document.getElementById('inventory-final-table-body');
    const tbodyRaw = document.getElementById('inventory-raw-table-body');

    if (tbodyFinal && tbodyRaw) {
        tbodyFinal.innerHTML = '';
        tbodyRaw.innerHTML = '';

        const finalProducts = window.inventory.filter(p => p.type !== 'raw');
        const rawMaterials = window.inventory.filter(p => p.type === 'raw');

        if (finalProducts.length === 0) {
            tbodyFinal.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">No hay productos finales registrados.</td></tr>';
        } else {
            finalProducts.forEach(product => {
                const row = tbodyFinal.insertRow();
                const stockClass = product.quantity < 10 ? 'text-red-600 font-bold' : '';
                row.innerHTML = `
                    <td class="p-3 border-b">${product.sku}</td>
                    <td class="p-3 border-b">${product.name}</td>
                    <td class="p-3 border-b ${stockClass}">${product.quantity}</td>
                    <td class="p-3 border-b">${product.unitType || 'und'}</td>
                    <td class="p-3 border-b">
                        <button onclick="adjustStock(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="Ajustar Inventario"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        }

        if (rawMaterials.length === 0) {
            tbodyRaw.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">No hay materia prima registrada.</td></tr>';
        } else {
            rawMaterials.forEach(product => {
                const row = tbodyRaw.insertRow();
                const lowStock = product.safetyStock > 0 && product.quantity <= product.safetyStock;
                const stockClass = lowStock ? 'text-red-600 font-bold' : '';
                const supplier = window.suppliers.find(s => s.id == product.supplierId);
                const supplierName = supplier ? supplier.name : '<span class="text-gray-400 italic">No asignado</span>';
                row.innerHTML = `
                    <td class="p-3 border-b">${product.sku}</td>
                    <td class="p-3 border-b">${product.name}</td>
                    <td class="p-3 border-b ${stockClass}">${window.formatDecimal(product.quantity)}</td>
                    <td class="p-3 border-b">${product.unitType || 'und'}</td>
                    <td class="p-3 border-b ${stockClass}">${product.safetyStock != null ? window.formatDecimal(product.safetyStock) : '-'}</td>
                    <td class="p-3 border-b text-xs">${supplierName}</td>
                    <td class="p-3 border-b">
                        <button onclick="generatePurchaseOrder(${product.id})" class="text-green-600 hover:text-green-800 mr-3" title="Generar Orden de Compra"><i class="fas fa-file-invoice-dollar"></i></button>
                        <button onclick="adjustStock(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="Ajustar Inventario"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        }
    }
    window.loadMRP();
    window.renderNotificationBell();
}

export function deleteProduct(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        window.inventory = window.inventory.filter(p => p.id !== id);
        window.saveData();
        window.loadInventory();
        window.showNotification('Producto eliminado del inventario.');
    }
}

export function adjustStock(id) {
    const product = window.inventory.find(p => p.id === id);
    if (!product) return;

    const input = prompt(`Ajustar inventario de ${product.name}.\nCantidad actual: ${product.quantity}\nIngresa el valor a SUMAR o RESTAR (ej: 5 para sumar, -2 para restar):`, "0");
    if (input !== null && input.trim() !== "") {
        const qty = parseFloat(input);
        if (!isNaN(qty)) {
            product.quantity += qty;
            if (product.quantity < 0) product.quantity = 0;
            window.saveData();
            window.loadInventory();
            window.showNotification(`Inventario ajustado. Nueva cantidad: ${product.quantity}`, 'success');
        } else {
            window.showNotification('Cantidad inválida.', 'error');
        }
    }
}
