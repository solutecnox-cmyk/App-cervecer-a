// Proveedores: funciones originalmente en funciones.js
export function openAddSupplierModal() {
    document.getElementById('supplier-form').reset();
    document.getElementById('supplier-modal').classList.remove('hidden');
}

export function closeSupplierModal() {
    document.getElementById('supplier-modal').classList.add('hidden');
}

export function saveSupplier(event) {
    event.preventDefault();
    const newSupplier = {
        id: Date.now(),
        type: document.getElementById('supplier-type').value,
        nit: document.getElementById('supplier-nit').value,
        name: document.getElementById('supplier-name').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
    };
    window.suppliers.push(newSupplier);
    window.saveData();
    window.refreshAppUI();
    closeSupplierModal();
    window.showNotification('Proveedor añadido con éxito.');
}

export function loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!window.suppliers || window.suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay proveedores registrados.</td></tr>';
        return;
    }
    window.suppliers.forEach(supplier => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="p-4">${supplier.nit}</td>
            <td class="p-4">${supplier.type === 'empresa' ? 'Jurídica' : 'Natural'}</td>
            <td class="p-4">${supplier.name}</td>
            <td class="p-4">${supplier.phone}</td>
            <td class="p-4">${supplier.email || '-'}</td>
            <td class="p-4">
                <button class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </td>
        `;
        row.querySelector('button').onclick = () => deleteSupplier(supplier.id);
    });
}

export function deleteSupplier(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
        window.suppliers = window.suppliers.filter(s => s.id !== id);
        window.saveData();
        loadSuppliers();
        updateProductSupplierSelect();
        window.showNotification('Proveedor eliminado.');
    }
}

export function updateProductSupplierSelect() {
    const sel = document.getElementById('product-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona proveedor --</option>';
    (window.suppliers || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.nit})`;
        sel.appendChild(opt);
    });
}
