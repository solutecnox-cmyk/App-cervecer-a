// --- Estado de la Aplicación ---
const STORAGE_KEY = 'erpState';
const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

let clients = savedState.clients || JSON.parse(localStorage.getItem('clients')) || [];
let inventory = savedState.inventory || JSON.parse(localStorage.getItem('inventory')) || [];
let cart = [];
let selectedProductId = null; // Para el buscador de productos en POS
let suppliers = savedState.suppliers || JSON.parse(localStorage.getItem('suppliers')) || [];
// Nuevas estructuras: bodegas y lotes (batches)

function formatDecimal(value, digits = 8) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return num.toFixed(digits).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}
let warehouses = savedState.warehouses || JSON.parse(localStorage.getItem('warehouses')) || [];
let batches = savedState.batches || JSON.parse(localStorage.getItem('batches')) || []; // cada batch: {id, productId, warehouseId, lot, quantity, manufactureDate, createdAt}
// Producción: pedidos firmes, pronósticos, recetas (BOM), tanques y órdenes de compra
let orders = savedState.orders || JSON.parse(localStorage.getItem('orders')) || []; // {id, productId, qty, dueDate, createdAt}
let forecasts = savedState.forecasts || JSON.parse(localStorage.getItem('forecasts')) || []; // {id, productId, qty, targetDate}
let recipes = savedState.recipes || JSON.parse(localStorage.getItem('recipes')) || []; // {productId, ingredients: [{ingredientProductId, qtyPerUnit}]}
let editingRecipeProductId = null;
let editingTankId = null;
let editingNewProductId = null; // para modal emergente cuando se crea producto desde receta
let editingProductId = null; // para editar productos existentes desde modales
let tanks = savedState.tanks || JSON.parse(localStorage.getItem('tanks')) || []; // {id, name, capacityLiters, schedule: [{start, end, productId, qty}]}
let purchaseOrders = savedState.purchaseOrders || JSON.parse(localStorage.getItem('purchaseOrders')) || []; // {id, ingredientId, qty, status}
let productionHistory = savedState.productionHistory || JSON.parse(localStorage.getItem('productionHistory')) || []; // {id, productId, qty, startDate, endDate, tankName}
let weekCalculationMode = savedState.weekCalculationMode || 'month';
let customWeeklyCapacities = savedState.customWeeklyCapacities || [720, 720, 720, 720];

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadClients();
    loadSuppliers();
    loadInventory();
    loadWarehouses();
    loadBatches();
    updateBatchProductSelect();
    updateWarehouseSelect();
    loadOrders();
    loadForecasts();
    loadRecipes();
    loadTanks();
    updateOrderProductSelect();
    updateForecastProductSelect();
    
    updateWizardProductSelect();
    updateWizardTankSelect();
    renderTrackingActive();
    renderTrackingHistory();
    showSection('produccion');
    switchProductionTab('nueva');
});

// --- Semilla de Datos de Ejemplo (Cervecería B&E) ---
function seedSampleData() {
    // 1. Proveedores
    suppliers = [
        { id: 1, type: 'empresa', nit: '900.000.001-1', name: 'Proveedor Bogotá', phone: '3001111111', email: 'bogota@proveedor.com' },
        { id: 2, type: 'empresa', nit: '900.000.002-2', name: 'Proveedor Armenia', phone: '3002222222', email: 'armenia@proveedor.com' }
    ];

    // 2. Inventario (Materia Prima y Productos Finales)
    // leadTime en días, purchaseUnit en unidades de compra
    inventory = [
        // Materia Prima
        { id: 101, type: 'raw', sku: 'MP-001', name: 'Malta Pale Ale (kg)', price: 0, supplierId: 1, quantity: 54, safetyStock: 36.00, leadTime: 2, purchaseUnit: 25 },
        { id: 102, type: 'raw', sku: 'MP-002', name: 'Malta Pilsen (kg)', price: 0, supplierId: 1, quantity: 50, safetyStock: 30.67, leadTime: 2, purchaseUnit: 25 },
        { id: 103, type: 'raw', sku: 'MP-003', name: 'Malta Chocolate (kg)', price: 0, supplierId: 1, quantity: 30, safetyStock: 18.67, leadTime: 2, purchaseUnit: 25 },
        { id: 104, type: 'raw', sku: 'MP-004', name: 'Malta Roasted (kg)', price: 0, supplierId: 1, quantity: 25, safetyStock: 15.33, leadTime: 2, purchaseUnit: 25 },
        { id: 105, type: 'raw', sku: 'MP-005', name: 'Lúpulo Magnum (kg)', price: 0, supplierId: 1, quantity: 1.2, safetyStock: 1.15, leadTime: 2, purchaseUnit: 1 },
        { id: 106, type: 'raw', sku: 'MP-006', name: 'Levadura US-05 (kg)', price: 0, supplierId: 1, quantity: 0.5, safetyStock: 0.30, leadTime: 2, purchaseUnit: 0.5 },
        { id: 107, type: 'raw', sku: 'MP-007', name: 'Miel (kg)', price: 0, supplierId: 2, quantity: 4, safetyStock: 6.67, leadTime: 1, purchaseUnit: 27 },
        { id: 108, type: 'raw', sku: 'MP-008', name: 'Botellas 330 mL (und)', price: 0, supplierId: 2, quantity: 400, safetyStock: 242, leadTime: 1, purchaseUnit: 24 },
        { id: 109, type: 'raw', sku: 'MP-009', name: 'Tapas corona (und)', price: 0, supplierId: 2, quantity: 500, safetyStock: 242, leadTime: 1, purchaseUnit: 100 },
        { id: 110, type: 'raw', sku: 'MP-010', name: 'Agua (L)', price: 0, supplierId: 1, quantity: 10000, safetyStock: 1000, leadTime: 0, purchaseUnit: 1000 },
        // Productos Finales (Inventario PT inicial = 50 botellas por sabor = 300 total)
        { id: 201, type: 'final', sku: 'PT-IPA-P', name: 'IPA Pijao', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 },
        { id: 202, type: 'final', sku: 'PT-IPA-H', name: 'IPA Honey', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 },
        { id: 203, type: 'final', sku: 'PT-HGA', name: 'Honey Golden Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 },
        { id: 204, type: 'final', sku: 'PT-GOL', name: 'Golden Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 },
        { id: 205, type: 'final', sku: 'PT-POR', name: 'Porter', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 },
        { id: 206, type: 'final', sku: 'PT-IRA', name: 'Iris Red Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: 0.33 }
    ];

    // 3. Recetas (BOM) en kg/L o und/L
    const envases = [
        { ingredientProductId: 108, qtyPerUnit: 3 },
        { ingredientProductId: 109, qtyPerUnit: 3 },
        { ingredientProductId: 110, qtyPerUnit: 3.1667 }
    ];

    recipes = [
        { productId: 201, ingredients: [{ ingredientProductId: 101, qtyPerUnit: 0.2250 }, { ingredientProductId: 105, qtyPerUnit: 0.00496 }, { ingredientProductId: 106, qtyPerUnit: 0.000670833 }, ...envases] },
        { productId: 202, ingredients: [{ ingredientProductId: 101, qtyPerUnit: 0.2170 }, { ingredientProductId: 105, qtyPerUnit: 0.00450 }, { ingredientProductId: 106, qtyPerUnit: 0.000670833 }, { ingredientProductId: 107, qtyPerUnit: 0.045833333 }, ...envases] },
        { productId: 203, ingredients: [{ ingredientProductId: 102, qtyPerUnit: 0.2000 }, { ingredientProductId: 105, qtyPerUnit: 0.001375 }, { ingredientProductId: 106, qtyPerUnit: 0.000575 }, { ingredientProductId: 107, qtyPerUnit: 0.0375 }, ...envases] },
        { productId: 204, ingredients: [{ ingredientProductId: 102, qtyPerUnit: 0.1830 }, { ingredientProductId: 105, qtyPerUnit: 0.00138 }, { ingredientProductId: 106, qtyPerUnit: 0.000575 }, ...envases] },
        { productId: 205, ingredients: [{ ingredientProductId: 103, qtyPerUnit: 0.2330 }, { ingredientProductId: 105, qtyPerUnit: 0.001125 }, { ingredientProductId: 106, qtyPerUnit: 0.000670833 }, ...envases] },
        { productId: 206, ingredients: [{ ingredientProductId: 104, qtyPerUnit: 0.1920 }, { ingredientProductId: 105, qtyPerUnit: 0.00100 }, { ingredientProductId: 106, qtyPerUnit: 0.000575 }, ...envases] }
    ];

    // 4. Clientes (Gastrobares)
    clients = [
        { id: 1, numDoc: '900111', razonSocial: 'Bar Armenia', nombreComercial: 'Gastrobar AR', ciudad: 'Armenia', correo: 'contacto@bararmenia.com' },
        { id: 2, numDoc: '900222', razonSocial: 'Bar Manizales', nombreComercial: 'Gastrobar MZ', ciudad: 'Manizales', correo: 'contacto@barmanizales.com' }
    ];

    // 5. Bodegas y Lotes (Batches)
    warehouses = [
        { id: 1, name: 'Bodega Principal', location: 'Planta Alta' },
        { id: 2, name: 'Bodega Frío', location: 'Sótano' }
    ];
    batches = [
        { id: 1, productId: 201, warehouseId: 1, lot: 'L-001', quantity: 20, manufactureDate: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() },
        { id: 2, productId: 202, warehouseId: 2, lot: 'L-002', quantity: 30, manufactureDate: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() }
    ];

    // 6. Producción (Órdenes, Pronósticos y Tanques)
    orders = [
        { id: 1, productId: 201, qty: 10, dueDate: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() }
    ];
    forecasts = [
        { id: 1, productId: 203, qty: 50, targetDate: new Date().toISOString().slice(0,10) }
    ];
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 2); // Empezó hace 2 días
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 5); // Termina en 5 días

    tanks = [
        { 
            id: 1, 
            name: 'Tanque Fermentador 1', 
            capacityLiters: 1000, 
            schedule: [{
                start: inicio.toISOString().slice(0, 10),
                end: fin.toISOString().slice(0, 10),
                productId: 201, // IPA Pijao
                qty: 800
            }] 
        },
        { id: 2, name: 'Tanque Maduración 1', capacityLiters: 1000, schedule: [] }
    ];

    // Guardar en LocalStorage
    saveData();
    showNotification('Datos iniciales del modelo de Cervecería B&E cargados correctamente.', 'success');
}

// --- Navegación de Secciones ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

// --- Lógica de Clientes ---
function openAddClientModal() {
    document.getElementById('client-form').reset();
    document.getElementById('client-modal').classList.remove('hidden');
}
function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
}

function saveClient(event) {
    event.preventDefault();
    const newClient = {
        id: Date.now(),
        tipoDoc: document.getElementById('client-tipo-doc').value,
        numDoc: document.getElementById('client-num-doc').value,
        dv: document.getElementById('client-dv').value,
        razonSocial: document.getElementById('client-razon-social').value,
        nombreComercial: document.getElementById('client-nombre-comercial').value,
        departamento: document.getElementById('client-departamento').value,
        ciudad: document.getElementById('client-ciudad').value,
        direccion: document.getElementById('client-direccion').value,
        telefono: document.getElementById('client-telefono').value,
        correo: document.getElementById('client-correo').value,
    };
    clients.push(newClient);
    saveData();
    refreshAppUI();
    closeClientModal();
    showNotification('Cliente registrado con éxito.');
}

function loadClients() {
    const tbody = document.getElementById('clients-table-body');
    tbody.innerHTML = '';
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay clientes registrados.</td></tr>';
        return;
    }
    clients.forEach(client => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="p-4">${client.numDoc} - ${client.dv || 'N/A'}</td>
            <td class="p-4">${client.razonSocial}</td>
            <td class="p-4">${client.nombreComercial || '-'}</td>
            <td class="p-4">${client.ciudad}</td>
            <td class="p-4">${client.correo}</td>
            <td class="p-4">
                <button class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </td>
        `;
        row.querySelector('button').onclick = () => deleteClient(client.id);
    });
}
        
function deleteClient(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        clients = clients.filter(c => c.id !== id);
        saveData();
        loadClients();
        showNotification('Cliente eliminado.');
    }
}

// --- Lógica de Proveedores ---
function openAddSupplierModal() {
    document.getElementById('supplier-form').reset();
    document.getElementById('supplier-modal').classList.remove('hidden');
}

function closeSupplierModal() {
    document.getElementById('supplier-modal').classList.add('hidden');
}

function saveSupplier(event) {
    event.preventDefault();
    const newSupplier = {
        id: Date.now(),
        type: document.getElementById('supplier-type').value,
        nit: document.getElementById('supplier-nit').value,
        name: document.getElementById('supplier-name').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
    };
    suppliers.push(newSupplier);
    saveData();
    refreshAppUI();
    closeSupplierModal();
    showNotification('Proveedor añadido con éxito.');
}

function loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay proveedores registrados.</td></tr>';
        return;
    }
    suppliers.forEach(supplier => {
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

function deleteSupplier(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
        suppliers = suppliers.filter(s => s.id !== id);
        saveData();
        loadSuppliers();
        updateProductSupplierSelect();
        showNotification('Proveedor eliminado.');
    }
}

function updateProductSupplierSelect() {
    const sel = document.getElementById('product-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona proveedor --</option>';
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.nit})`;
        sel.appendChild(opt);
    });
}

// --- Lógica de Inventario ---
function openAddProductModal(type = 'final', productId = null) {
    editingProductId = null;
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    if (productId) {
        const product = inventory.find(p => p.id === productId);
        if (product) {
            editingProductId = productId;
            document.getElementById('product-type').value = product.type;
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-price').value = product.price != null ? product.price : 0;
            document.getElementById('product-volume').value = product.type === 'raw' ? (product.purchaseUnit || 1) : (product.volumePerUnit || 1);
            document.getElementById('product-unit-type').value = product.unitType || 'und';
            document.getElementById('product-quantity').value = product.quantity != null ? product.quantity : 0;
            document.getElementById('product-safety-stock').value = product.safetyStock != null ? product.safetyStock : 0;
            document.getElementById('product-supplier').value = product.supplierId || '';
            document.getElementById('product-modal-title').textContent = product.type === 'raw' ? 'Editar Materia Prima' : 'Editar Producto Final';
            document.getElementById('product-modal-subtitle').textContent = product.type === 'raw'
                ? 'Edita las propiedades de la materia prima. También puedes ajustar el stock mínimo de seguridad.'
                : 'Edita los datos del producto final para ventas y planeación.';
        }
    } else {
        document.getElementById('product-type').value = type;
        document.getElementById('product-modal-title').textContent = type === 'raw' ? 'Añadir Materia Prima' : 'Añadir Producto Final';
        document.getElementById('product-modal-subtitle').textContent = type === 'raw'
            ? 'Registra materia prima: el precio de compra y el volumen por unidad no se mostrarán.'
            : 'Registra producto final para ventas: completa precio y volumen para la planeación.';
    }
    updateProductSupplierSelect();
    handleProductTypeChange();
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    editingProductId = null;
}

function handleProductTypeChange() {
    const type = document.getElementById('product-type').value;
    const priceDiv = document.getElementById('product-price-div');
    const productVolumeDiv = document.getElementById('product-volume-div');
    const supplierDiv = document.getElementById('product-supplier-div');
    const safetyDiv = document.getElementById('product-safety-stock-div');
    const priceLabel = document.getElementById('product-price-label');

    const priceInput = document.getElementById('product-price');
    const volumeInput = document.getElementById('product-volume');
    const safetyInput = document.getElementById('product-safety-stock');

    const volumeLabel = document.getElementById('product-volume-label');
    const volumeHelp = document.getElementById('product-volume-help');

    if (type === 'raw') {
        priceDiv.classList.add('hidden');
        productVolumeDiv.classList.remove('hidden');
        supplierDiv.classList.remove('hidden');
        safetyDiv.classList.remove('hidden');
        priceInput.required = false;
        priceInput.disabled = true;
        volumeInput.required = true;
        volumeInput.disabled = false;
        safetyInput.disabled = false;
        volumeLabel.textContent = 'Tamaño de unidad de compra';
        volumeHelp.textContent = 'Ej: 25 para sack, caja o lote de compra. Se usa para cálculos de reorden y compras.';
    } else {
        priceDiv.classList.remove('hidden');
        productVolumeDiv.classList.remove('hidden');
        supplierDiv.classList.add('hidden');
        safetyDiv.classList.add('hidden');
        priceInput.required = true;
        priceInput.disabled = false;
        volumeInput.required = true;
        volumeInput.disabled = false;
        safetyInput.disabled = true;
        volumeLabel.textContent = 'Volumen por unidad (L)';
        volumeHelp.textContent = 'Ej: 0.33 para botella 330 mL — se usa en cálculos de planeación (MPS/MRP).';
    }
}

function saveProduct(event) {
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
    if (editingProductId) {
        const existing = inventory.find(p => p.id === editingProductId);
        if (existing) {
            Object.assign(existing, data);
            if (type === 'raw') existing.volumePerUnit = 0;
        }
        showNotification('Producto actualizado en el inventario.', 'success');
    } else {
        const newProduct = { id: Date.now(), ...data };
        inventory.push(newProduct);
        showNotification('Producto añadido al inventario.', 'success');
    }
    saveData();
    refreshAppUI();
    closeProductModal();
}

// --- Modal para producto creado automáticamente desde Receta ---
function openProductCreatedModal(id) {
    const prod = inventory.find(p => p.id === id);
    if (!prod) return;
    document.getElementById('product-created-sku').value = prod.sku || '';
    document.getElementById('product-created-name').value = prod.name || '';
    document.getElementById('product-created-price').value = prod.price || 0;
    document.getElementById('product-created-volume').value = prod.volumePerUnit || 0.33;
    document.getElementById('product-created-unit').value = prod.unitType || 'und';
    document.getElementById('product-created-quantity').value = prod.quantity || 0;
    document.getElementById('product-created-safety').value = prod.safetyStock || 0;
    updateProductSupplierSelectForModal();
    document.getElementById('product-created-supplier').value = prod.supplierId || '';
    document.getElementById('product-created-modal').classList.remove('hidden');
}

function closeProductCreatedModal() {
    document.getElementById('product-created-modal').classList.add('hidden');
    editingNewProductId = null;
}

function updateProductSupplierSelectForModal() {
    const sel = document.getElementById('product-created-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona proveedor --</option>';
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.nit})`;
        sel.appendChild(opt);
    });
}

function saveCreatedProductFromModal(event) {
    event.preventDefault();
    if (!editingNewProductId) return;
    const prod = inventory.find(p => p.id === editingNewProductId);
    if (!prod) return;
    prod.sku = document.getElementById('product-created-sku').value || prod.sku;
    // name no editable en modal (se asume viene de la receta)
    prod.price = parseFloat(document.getElementById('product-created-price').value) || 0;
    prod.volumePerUnit = parseFloat(document.getElementById('product-created-volume').value) || prod.volumePerUnit || 0.33;
    prod.unitType = document.getElementById('product-created-unit').value || prod.unitType;
    prod.quantity = parseFloat(document.getElementById('product-created-quantity').value) || prod.quantity || 0;
    prod.safetyStock = parseFloat(document.getElementById('product-created-safety').value) || prod.safetyStock || 0;
    const supp = document.getElementById('product-created-supplier').value;
    prod.supplierId = supp ? (isNaN(parseInt(supp)) ? null : parseInt(supp)) : null;
    saveData();
    refreshAppUI();
    closeProductCreatedModal();
    showNotification('Producto actualizado correctamente.', 'success');
}

function loadInventory() {
    const tbodyFinal = document.getElementById('inventory-final-table-body');
    const tbodyRaw = document.getElementById('inventory-raw-table-body');
    
    if (tbodyFinal && tbodyRaw) {
        tbodyFinal.innerHTML = '';
        tbodyRaw.innerHTML = '';
        
        const finalProducts = inventory.filter(p => p.type !== 'raw');
        const rawMaterials = inventory.filter(p => p.type === 'raw');

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
                const supplier = suppliers.find(s => s.id == product.supplierId);
                const supplierName = supplier ? supplier.name : '<span class="text-gray-400 italic">No asignado</span>';
                row.innerHTML = `
                    <td class="p-3 border-b">${product.sku}</td>
                    <td class="p-3 border-b">${product.name}</td>
                    <td class="p-3 border-b ${stockClass}">${formatDecimal(product.quantity)}</td>
                    <td class="p-3 border-b">${product.unitType || 'und'}</td>
                    <td class="p-3 border-b ${stockClass}">${product.safetyStock != null ? formatDecimal(product.safetyStock) : '-'}</td>
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
    loadMRP(); // Actualizar barras de MRP cuando cambie el inventario
    renderNotificationBell();
}

function deleteProduct(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        inventory = inventory.filter(p => p.id !== id);
        saveData();
        loadInventory();
        showNotification('Producto eliminado del inventario.');
    }
}

function adjustStock(id) {
    const product = inventory.find(p => p.id === id);
    if(!product) return;
    
    const input = prompt(`Ajustar inventario de ${product.name}.\nCantidad actual: ${product.quantity}\nIngresa el valor a SUMAR o RESTAR (ej: 5 para sumar, -2 para restar):`, "0");
    if (input !== null && input.trim() !== "") {
        const qty = parseFloat(input);
        if(!isNaN(qty)) {
            product.quantity += qty;
            if (product.quantity < 0) product.quantity = 0;
            saveData();
            loadInventory();
            showNotification(`Inventario ajustado. Nueva cantidad: ${product.quantity}`, 'success');
        } else {
            showNotification('Cantidad inválida.', 'error');
        }
    }
}

function quickRestock(productId, qty) {
    const product = inventory.find(p => p.id === productId);
    if(product) {
        product.quantity += qty;
        saveData();
        loadInventory();
        showNotification(`Se reabastecieron ${qty} unidades de ${product.name}`, 'success');
        runProductionFlow(); // Recalcular MRP
    }
}

function generatePurchaseOrder(id) {
    const product = inventory.find(p => p.id === id);
    if (!product) return;
    
    if (!product.supplierId) {
        showNotification('El producto no tiene un proveedor asignado.', 'error');
        return;
    }
    
    const supplier = suppliers.find(s => s.id == product.supplierId);
    if (!supplier) {
        showNotification('Proveedor no encontrado.', 'error');
        return;
    }

    let qtyToOrder = 0;
    const safetyStock = product.safetyStock || 0;
    const purchaseUnit = product.purchaseUnit || 1;

    if (product.quantity < safetyStock) {
        const missing = safetyStock - product.quantity;
        qtyToOrder = Math.ceil(missing / purchaseUnit) * purchaseUnit;
    } else {
        const input = prompt(`El producto ${product.name} tiene buen stock (${product.quantity}).\n\n¿Cuántas unidades deseas pedir manualmente a ${supplier.name}?`);
        if (input !== null && input.trim() !== "") {
            qtyToOrder = parseFloat(input);
            if (isNaN(qtyToOrder) || qtyToOrder <= 0) {
                return showNotification('Cantidad inválida.', 'error');
            }
        } else {
            return;
        }
    }

    if (qtyToOrder > 0) {
        if (confirm(`¿Deseas generar la orden de compra en PDF por ${qtyToOrder} unidades de ${product.name} a ${supplier.name}?`)) {
            
            const printArea = document.getElementById('print-area');
            const today = new Date().toLocaleDateString();
            const orderId = 'OC-' + Date.now().toString().slice(-6);
            
            printArea.innerHTML = `
                <div class="max-w-4xl mx-auto border border-gray-300 p-8">
                    <div class="flex justify-between items-start mb-8">
                        <div>
                            <img src="logo.png" alt="Logo B&E" style="height: 80px;" class="mb-4">
                            <h2 class="text-2xl font-bold">B&E Cervecería</h2>
                            <p class="text-gray-600">NIT: 901.000.000-1</p>
                            <p class="text-gray-600">Armenia, Quindío</p>
                        </div>
                        <div class="text-right">
                            <h1 class="text-3xl font-black text-gray-800 mb-2">ORDEN DE COMPRA</h1>
                            <p class="text-xl font-bold text-gray-700"># ${orderId}</p>
                            <p class="text-gray-600 mt-2"><strong>Fecha:</strong> ${today}</p>
                        </div>
                    </div>
                    
                    <div class="bg-gray-100 p-4 mb-8">
                        <h3 class="font-bold border-b border-gray-300 pb-2 mb-2">DATOS DEL PROVEEDOR</h3>
                        <p><strong>Razón Social:</strong> ${supplier.name}</p>
                        <p><strong>NIT/CC:</strong> ${supplier.nit}</p>
                        <p><strong>Teléfono:</strong> ${supplier.phone}</p>
                        <p><strong>Correo:</strong> ${supplier.email || 'N/A'}</p>
                    </div>
                    
                    <table class="w-full text-left border-collapse mb-8">
                        <thead>
                            <tr class="bg-gray-200">
                                <th class="p-3 border border-gray-300">SKU</th>
                                <th class="p-3 border border-gray-300">Descripción del Producto</th>
                                <th class="p-3 border border-gray-300 text-center">Cantidad a Pedir</th>
                                <th class="p-3 border border-gray-300 text-center">Unidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="p-3 border border-gray-300">${product.sku}</td>
                                <td class="p-3 border border-gray-300 font-bold">${product.name}</td>
                                <td class="p-3 border border-gray-300 text-center font-bold text-lg">${qtyToOrder}</td>
                                <td class="p-3 border border-gray-300 text-center">${product.purchaseUnit} por lote</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="mt-16 text-center text-gray-500 text-sm border-t border-gray-300 pt-8">
                        <p>Documento generado automáticamente por el sistema B&E Cervecería.</p>
                        <p>Por favor confirmar recepción de esta orden de compra.</p>
                    </div>
                </div>
            `;
            
            purchaseOrders.push({
                id: orderId,
                ingredientId: product.id,
                qty: qtyToOrder,
                status: 'Emitida',
                date: new Date().toISOString()
            });
            saveData();
            
            printArea.classList.remove('hidden');
            window.print();
            
            setTimeout(() => {
                printArea.classList.add('hidden');
            }, 1000);
        }
    }
}

function loadMRP() {
    // La vista MRP ahora se renderiza completamente dentro de runProductionFlow()
    // en la pestaña de Producción, por lo que las barras simples ya no son necesarias.
    const container = document.getElementById('mrp-bars-container');
    if (container) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Visita el Dashboard de Producción para ver el MRP detallado a 4 semanas.</p>';
    }
}


// --- Bodegas y Lotes (Batches) ---
function createWarehouse() {
    const name = document.getElementById('warehouse-name').value.trim();
    const location = document.getElementById('warehouse-location').value.trim();
    if (!name) {
        showNotification('Ingresa el nombre de la bodega.', 'error');
        return;
    }
    const newWh = { id: Date.now(), name, location };
    warehouses.push(newWh);
    saveData();
    refreshAppUI();
    document.getElementById('warehouse-name').value = '';
    document.getElementById('warehouse-location').value = '';
    showNotification('Bodega creada.');
}

function loadWarehouses() {
    renderWarehousesVisual();
}

function renderWarehousesVisual() {
    const container = document.getElementById('warehouses-visual-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (warehouses.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No hay bodegas registradas.</p>';
        return;
    }

    warehouses.forEach(w => {
        // Encontrar los lotes de esta bodega
        const whBatches = batches.filter(b => b.warehouseId === w.id && b.quantity > 0);
        
        // Construir el tooltip HTML
        let tooltipHtml = `<div class="font-bold border-b mb-2 pb-1">${w.name} (${w.location})</div>`;
        if (whBatches.length === 0) {
            tooltipHtml += `<p class="text-gray-500 italic">Bodega vacía</p>`;
        } else {
            tooltipHtml += `<ul class="space-y-1">`;
            whBatches.forEach(b => {
                const prod = inventory.find(p => p.id === b.productId);
                tooltipHtml += `<li><strong>${prod ? prod.name : 'Desc.'}</strong>: Lote ${b.lot} (Cant: ${b.quantity})</li>`;
            });
            tooltipHtml += `</ul>`;
        }

        const div = document.createElement('div');
        div.className = 'warehouse-visual flex flex-col items-center justify-start pt-2';
        div.innerHTML = `
            <div class="font-bold text-center z-10 px-1 truncate w-full" title="${w.name}">${w.name}</div>
            <div class="warehouse-door">
                <i class="fas fa-box-open text-2xl opacity-50 mb-1"></i>
                <span class="text-xs font-bold bg-black bg-opacity-30 px-2 py-1 rounded">${whBatches.length} Lotes</span>
            </div>
            <div class="batch-tooltip">${tooltipHtml}</div>
        `;
        container.appendChild(div);
    });
}

function updateWarehouseSelect() {
    const sel = document.getElementById('batch-warehouse-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona bodega --</option>';
    warehouses.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.name} (${w.location})`;
        sel.appendChild(opt);
    });
}

function createBatchFromUI() {
    const productId = parseInt(document.getElementById('batch-product-select').value);
    const warehouseId = parseInt(document.getElementById('batch-warehouse-select').value);
    const lot = document.getElementById('batch-lot').value.trim() || `L-${Date.now()}`;
    const qty = parseInt(document.getElementById('batch-qty').value) || 0;
    const manufactureDate = document.getElementById('batch-manufacture-date').value || new Date().toISOString().slice(0,10);
    if (!productId || !warehouseId || qty <= 0) {
        showNotification('Completa producto, bodega y cantidad.', 'error');
        return;
    }
    createBatch({ productId, warehouseId, lot, qty, manufactureDate });
    document.getElementById('batch-lot').value = '';
    document.getElementById('batch-qty').value = '';
    document.getElementById('batch-manufacture-date').value = '';
}

function createBatch({ productId, warehouseId, lot, qty, manufactureDate }) {
    const batch = {
        id: Date.now(),
        productId,
        warehouseId,
        lot,
        quantity: qty,
        manufactureDate,
        createdAt: new Date().toISOString()
    };
    batches.push(batch);

    // Actualizar cantidad global del producto en inventory
    const prod = inventory.find(p => p.id === productId);
    if (prod) {
        prod.quantity = (prod.quantity || 0) + qty;
    }
    saveData();
    refreshAppUI();
    showNotification('Lote registrado y stock actualizado.', 'success');
}

function loadBatches() {
    // Reutilizamos el renderizado visual de bodegas
    renderWarehousesVisual();
}

function updateBatchProductSelect() {
    const sel = document.getElementById('batch-product-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona producto --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        sel.appendChild(opt);
    });
}

function updateOrderProductSelect() {
    const sel = document.getElementById('order-product-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Producto para Pedido --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        sel.appendChild(opt);
    });
}

function updateForecastProductSelect() {
    // usa el mismo select por ahora
    updateOrderProductSelect();
}

// --- Orders & Forecasts ---
function addOrderFromUI() {
    const productId = parseInt(document.getElementById('order-product-select').value);
    const qty = parseFloat(document.getElementById('order-qty').value) || 0;
    const date = document.getElementById('order-date').value || new Date().toISOString().slice(0,10);
    if (!productId || qty <= 0) return showNotification('Completa producto y cantidad para el pedido.', 'error');
    orders.push({ id: Date.now(), productId, qty, dueDate: date, createdAt: new Date().toISOString() });
    saveData();
    refreshAppUI();
    showNotification('Pedido registrado.', 'success');
}

function addForecastFromUI() {
    const productId = parseInt(document.getElementById('order-product-select').value);
    const qty = parseFloat(document.getElementById('order-qty').value) || 0;
    const targetDate = document.getElementById('order-date').value || new Date().toISOString().slice(0,10);
    if (!productId || qty <= 0) return showNotification('Completa producto y cantidad para el pronóstico.', 'error');
    forecasts.push({ id: Date.now(), productId, qty, targetDate });
    saveData();
    refreshAppUI();
    showNotification('Pronóstico agregado.', 'success');
}

function loadOrders() {
    // Para simplicidad mostramos cantidad de pedidos en el panel de producción
    const el = document.getElementById('production-result');
    if (!el) return;
    el.textContent = `Pedidos: ${orders.length} · Pronósticos: ${forecasts.length}`;
}

function loadForecasts() {
    loadOrders();
}

// --- Recipes (BOM) ---
function openRecipeModal(recipeProductId = null) {
    editingRecipeProductId = null;
    document.getElementById('recipe-form').reset();
    document.getElementById('recipe-ingredients-container').innerHTML = '';
    document.getElementById('recipe-modal-title').textContent = 'Definir Receta (BOM)';

    // Poblar datalist de producto final (permite escribir un nombre nuevo o elegir existente)
    const input = document.getElementById('recipe-product-input');
    const datalist = document.getElementById('recipe-product-list');
    datalist.innerHTML = '';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        datalist.appendChild(opt);
    });

    if (recipeProductId) {
        const recipe = recipes.find(r => r.productId === recipeProductId);
        const prod = inventory.find(p => p.id === recipeProductId);
        input.value = prod ? prod.name : '';
        if (recipe && recipe.ingredients.length > 0) {
            recipe.ingredients.forEach(ingredient => {
                addIngredientRow();
                const row = document.querySelector('#recipe-ingredients-container .ingredient-row:last-child');
                row.querySelector('.ingredient-select').value = ingredient.ingredientProductId;
                row.querySelector('.ingredient-qty').value = ingredient.qtyPerUnit;
            });
        } else {
            addIngredientRow();
        }
        editingRecipeProductId = recipeProductId;
        document.getElementById('recipe-modal-title').textContent = 'Editar Receta';
    } else {
        input.value = '';
        addIngredientRow(); // Añadir una fila por defecto
    }

    closeRecipeListModal();
    document.getElementById('recipe-modal').classList.remove('hidden');
}

function closeRecipeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
    editingRecipeProductId = null;
}

function openRecipeListModal() {
    document.getElementById('recipe-list-modal').classList.remove('hidden');
    renderRecipeList();
}

function closeRecipeListModal() {
    document.getElementById('recipe-list-modal').classList.add('hidden');
}

function renderRecipeList() {
    const container = document.getElementById('recipe-list-container');
    container.innerHTML = '';

    if (!recipes.length) {
        container.innerHTML = '<div class="text-gray-600">No hay recetas guardadas. Crea una nueva receta primero.</div>';
        return;
    }

    recipes.forEach(recipe => {
        const product = inventory.find(p => p.id === recipe.productId) || { name: 'Producto desconocido', sku: '' };
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
            const ingredientProduct = inventory.find(p => p.id === ingredient.ingredientProductId) || { name: 'Ingrediente desconocido', sku: '' };
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

function deleteRecipe(productId) {
    if (!confirm('¿Seguro quieres eliminar esta receta?')) return;
    recipes = recipes.filter(r => r.productId !== productId);
    saveData();
    renderRecipeList();
    showNotification('Receta eliminada.', 'success');
}

function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients-container');
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center mb-2 ingredient-row';
    
    let options = '<option value="">-- Ingrediente (Materia Prima) --</option>';
    const rawMaterials = inventory.filter(p => p.type === 'raw');
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

function saveRecipe(event) {
    event.preventDefault();
    const productName = document.getElementById('recipe-product-input').value.trim();
    if (!productName) return showNotification('Ingresa o selecciona un producto final.', 'error');

    // Buscar producto existente por nombre (case-insensitive)
    let prod = inventory.find(p => p.name.toLowerCase() === productName.toLowerCase());
    let productId;
    if (prod) {
        productId = prod.id;
    } else {
        // Crear nuevo producto final mínimo si no existe
        const newProd = {
            id: Date.now(),
            type: 'final',
            sku: 'PT-' + Date.now().toString().slice(-6),
            name: productName,
            price: 0,
            supplierId: null,
            quantity: 0,
            volumePerUnit: 0.33,
            unitType: 'und',
            safetyStock: 0
        };
        inventory.push(newProd);
        saveData();
        loadInventory();
        updateBatchProductSelect();
        updateOrderProductSelect();
        updateForecastProductSelect();
        prod = newProd;
        productId = newProd.id;
        // Abrir modal emergente para revisar/editar el producto recién creado
        editingNewProductId = newProd.id;
        setTimeout(() => openProductCreatedModal(newProd.id), 120);
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
        return showNotification('Añade al menos un ingrediente válido.', 'error');
    }

    recipes = recipes.filter(r => r.productId !== productId && r.productId !== editingRecipeProductId);
    recipes.push({ productId, ingredients });
    saveData();
    refreshAppUI();
    closeRecipeModal();
    showNotification('Receta guardada con éxito.', 'success');
}

function loadRecipes() {
    console.log('Recipes:', recipes);
    if (document.getElementById('recipe-list-modal') && !document.getElementById('recipe-list-modal').classList.contains('hidden')) {
        renderRecipeList();
    }
}

// --- Tanks / CRP ---
function openTankModal(tankId = null) {
    editingTankId = null;
    document.getElementById('tank-form').reset();
    document.getElementById('tank-modal').querySelector('h2').textContent = tankId ? 'Editar Tanque' : 'Añadir Tanque';

    if (tankId) {
        const tank = tanks.find(t => t.id === tankId);
        if (tank) {
            document.getElementById('tank-name').value = tank.name;
            document.getElementById('tank-capacity').value = tank.capacityLiters;
            editingTankId = tankId;
        }
    }

    document.getElementById('tank-modal').classList.remove('hidden');
}

function closeTankModal() {
    document.getElementById('tank-modal').classList.add('hidden');
    editingTankId = null;
}

function saveTank(event) {
    event.preventDefault();
    const name = document.getElementById('tank-name').value.trim();
    const cap = parseFloat(document.getElementById('tank-capacity').value);
    
    if (!name || isNaN(cap) || cap <= 0) {
        return showNotification('Ingresa un nombre y capacidad válidos.', 'error');
    }

    const duplicate = tanks.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== editingTankId);
    if (duplicate) {
        return showNotification('Ya existe un tanque con ese nombre. Por favor, elige otro nombre.', 'error');
    }

    if (editingTankId) {
        const tank = tanks.find(t => t.id === editingTankId);
        if (tank) {
            tank.name = name;
            tank.capacityLiters = cap;
        }
        showNotification('Tanque actualizado con éxito.', 'success');
    } else {
        tanks.push({ id: Date.now(), name, capacityLiters: cap, schedule: [] });
        showNotification('Tanque añadido con éxito.', 'success');
    }

    saveData();
    refreshAppUI();
    closeTankModal();
}

function loadTanks() {
    const container = document.getElementById('tanks-visual-container');
    if (!container) return;
    container.innerHTML = '';

    if (tanks.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm col-span-full">No hay tanques registrados.</p>';
        return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    tanks.forEach(tank => {
        let statusBgColor = 'bg-[#005B3A]';
        let statusText = 'Libre';

        // Check active schedule
        const activeSchedule = (tank.schedule || []).find(s => {
            return s.start <= todayStr && s.end >= todayStr;
        });

        if (activeSchedule) {
            const prod = inventory.find(p => p.id === activeSchedule.productId);
            statusBgColor = 'bg-amber-500';
            statusText = `Fermentando:<br>${prod ? prod.name : 'Prod.'}`;
        }

        const div = document.createElement('div');
        div.className = 'relative flex flex-col items-center group cursor-pointer';
        div.innerHTML = `
            <svg viewBox="0 0 100 150" class="w-24 h-36 drop-shadow-md">
                <!-- Legs -->
                <rect x="25" y="110" width="4" height="30" fill="#9ca3af"/>
                <rect x="71" y="110" width="4" height="30" fill="#9ca3af"/>
                <line x1="25" y1="130" x2="75" y2="130" stroke="#9ca3af" stroke-width="2"/>
                <!-- Main Body -->
                <path d="M15,20 L85,20 L85,90 L55,120 L45,120 L15,90 Z" fill="#e5e7eb" stroke="#6b7280" stroke-width="2"/>
                <!-- Top Dome -->
                <path d="M15,20 Q50,-5 85,20 Z" fill="#d1d5db" stroke="#6b7280" stroke-width="2"/>
                <!-- Bottom Pipe -->
                <path d="M50,120 L50,135 L60,135" fill="none" stroke="#6b7280" stroke-width="3"/>
            </svg>
            <!-- Label Overlay -->
            <div class="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span class="text-[11px] font-bold text-gray-800 mb-1 truncate w-20 text-center">${tank.name}</span>
                <div class="px-1 py-1 rounded text-[10px] font-bold text-white text-center leading-tight ${statusBgColor} border border-black/20 w-18 shadow-inner flex items-center justify-center h-8">
                    ${statusText}
                </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 mb-1 hidden group-hover:flex justify-center gap-1">
                <button type="button" onclick="event.stopPropagation(); openTankModal(${tank.id});" class="px-2 py-1 bg-yellow-500 text-white rounded text-[10px] hover:bg-yellow-600">Editar</button>
                <button type="button" onclick="event.stopPropagation(); deleteTank(${tank.id});" class="px-2 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700">Eliminar</button>
            </div>
            
            <div class="absolute top-full mt-1 hidden group-hover:block w-48 p-2 bg-white border border-gray-300 shadow-lg rounded text-xs z-50 text-center">
                <div class="font-bold border-b pb-1 mb-1">${tank.name}</div>
                <div>Capacidad: ${tank.capacityLiters}L</div>
                ${activeSchedule ? `<div class="text-amber-600 mt-1">Fin: ${activeSchedule.end}</div>` : ''}
            </div>
        `;
        div.onclick = () => openTankInfoModal(tank.id);
        container.appendChild(div);
    });
    renderNotificationBell();
}

function deleteTank(tankId) {
    if (!confirm('¿Seguro deseas eliminar este tanque? Esto también eliminará su programación.')) return;
    tanks = tanks.filter(t => t.id !== tankId);
    saveData();
    loadTanks();
    updateWizardTankSelect();
    showNotification('Tanque eliminado.', 'success');
}

function hasActiveProduction() {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tanks.some(t => (t.schedule || []).some(s => s.start <= todayStr && s.end >= todayStr));
}

function renderPlaneacionPlaceholder() {
    const mpsContainer = document.getElementById('mps-table-container');
    const mrpContainer = document.getElementById('mrp-table-container');
    const kpiContainer = document.getElementById('kpi-container');
    const out = document.getElementById('production-output');
    const message = `<div class="text-gray-500 italic p-6 border rounded-lg bg-gray-50 text-center">No hay producción activa en este momento. Inicia una producción para ver los cálculos de MPS/MRP.</div>`;
    if (mpsContainer) mpsContainer.innerHTML = message;
    if (mrpContainer) mrpContainer.innerHTML = '';
    if (kpiContainer) kpiContainer.innerHTML = '';
    if (out) out.innerHTML = '';
}

// --- Production Flow: MPS -> MRP -> CRP ---
function runProductionFlow() {
    const out = document.getElementById('production-output');
    if (!hasActiveProduction()) {
        renderPlaneacionPlaceholder();
        if (out) out.innerHTML = '<div class="text-gray-600 italic">No hay producción activa. Inicia producción para habilitar la planeación MPS/MRP.</div>';
        return;
    }
    out.innerHTML = '<div class="text-blue-600 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Calculando Plan Maestro de Producción y Requerimientos...</div>';
    
    const mpsContainer = document.getElementById('mps-table-container');
    const mrpContainer = document.getElementById('mrp-table-container');
    const kpiContainer = document.getElementById('kpi-container');

    const finalProducts = inventory.filter(p => p.type !== 'raw');
    const rawMaterials = inventory.filter(p => p.type === 'raw');
    
    // Parámetros del Sistema
    const LITROS_POR_LOTE = 120; // 1 tanque = 1 lote = 120L
    const MAX_TANQUES_SEMANA = 6;

    const scheduledProduction = {};
    const scheduleEntries = [];
    const today = new Date();
    const getWeekIndexFromDate = (dateStr) => {
        const date = new Date(`${dateStr}T00:00:00`);
        if (isNaN(date)) return -1;
        const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
        return Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
    };

    tanks.forEach(tank => {
        (tank.schedule || []).forEach(schedule => {
            const prod = inventory.find(p => p.id === schedule.productId);
            if (!prod || prod.type === 'raw') return;
            const weekIndex = getWeekIndexFromDate(schedule.start);
            if (weekIndex < 0 || weekIndex > 3) return;
            if (!scheduledProduction[schedule.productId]) {
                scheduledProduction[schedule.productId] = [0, 0, 0, 0];
            }
            scheduledProduction[schedule.productId][weekIndex] += schedule.qty;
            scheduleEntries.push({
                tankName: tank.name,
                productId: schedule.productId,
                productName: prod.name,
                weekIndex,
                qty: schedule.qty,
                start: schedule.start,
                end: schedule.end
            });
        });
    });
    
    // 1. Preparar Demanda por Semana (1 a 4)
    // Para simplificar la demo, agruparemos artificialmente pedidos al canal barril y botellas.
    // Si no hay suficientes datos, generaremos demanda base.
    const demandBarril = {}; // Litros por semana
    const demandBotellas = {}; // Unidades por semana
    let weeklyBarrilDemand = [0, 0, 0, 0];
    let weeklyForecastBottles = [0, 0, 0, 0];
    let weeklyForecastLiters = [0, 0, 0, 0];
    let weeklyProducedLiters = [0, 0, 0, 0];
    let weeklyOverflowBottles = [0, 0, 0, 0];
    let weeklyOverflowLiters = [0, 0, 0, 0];

    finalProducts.forEach(p => {
        demandBarril[p.id] = [0, 0, 0, 0];
        demandBotellas[p.id] = [0, 0, 0, 0];
    });

    // Agregar pedidos reales
    orders.forEach(o => {
        const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000*60*60*24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        if (demandBarril[o.productId]) {
            const volume = o.qty * (inventory.find(p=>p.id===o.productId)?.volumePerUnit || 1);
            demandBarril[o.productId][w] += volume;
            weeklyBarrilDemand[w] += volume;
        }
    });

    forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000*60*60*24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        if (demandBotellas[f.productId]) {
            demandBotellas[f.productId][w] += f.qty;
            weeklyForecastBottles[w] += f.qty;
            const volume = f.qty * (inventory.find(p=>p.id===f.productId)?.volumePerUnit || 0.33);
            weeklyForecastLiters[w] += volume;
        }
    });

    // 2. Calcular MPS (Plan Maestro de Producción)
    let totalLiters = 0;
    let totalBottlesGen = 0;
    let lotesPorSemana = [0, 0, 0, 0];
    const mpsPlan = {}; // [Liters W1, Liters W2, Liters W3, Liters W4]
    const invProjectedPT = {}; // Array de inventario de botellas al final de cada semana
    
    let mpsHtml = `<table class="w-full text-left border-collapse border border-gray-200 text-sm">
        <thead>
            <tr class="bg-[#005B3A] text-white">
                <th class="p-2 border">Sabor</th>
                <th class="p-2 border text-center">Sem 1 (Barril)</th>
                <th class="p-2 border text-center">Sem 2 (Barril)</th>
                <th class="p-2 border text-center">Sem 3 (Botellas)</th>
                <th class="p-2 border text-center">Sem 4 (Botellas)</th>
                <th class="p-2 border text-center">Total Litros</th>
            </tr>
        </thead>
        <tbody>`;

    finalProducts.forEach(p => {
        mpsPlan[p.id] = [0, 0, 0, 0];
        invProjectedPT[p.id] = [0, 0, 0, 0];
        
        let currentBotellas = p.quantity; // Inventario inicial PT
        let pmpDetails = []; // Textos descriptivos para UI
        
        for (let w = 0; w < 4; w++) {
            let litrosProducir = 0;
            let overflowBotellas = 0;
            let detail = "";
            
            const unitVolume = p.volumePerUnit || 0.33;
            const scheduledLiters = (scheduledProduction[p.id] || [0, 0, 0, 0])[w] || 0;
            const scheduledBottles = Math.floor(scheduledLiters / unitVolume);

            if (w < 2) {
                // Semanas 1 y 2: Canal Barril
                const demandaL = demandBarril[p.id][w];
                const producedBySchedule = scheduledLiters;
                const falta = Math.max(0, demandaL - producedBySchedule);
                const adicionales = Math.ceil(falta / LITROS_POR_LOTE) * LITROS_POR_LOTE;
                litrosProducir = producedBySchedule + adicionales;
                
                const overflowLitros = Math.max(0, litrosProducir - demandaL);
                overflowBotellas = Math.floor(overflowLitros / unitVolume);
                currentBotellas += overflowBotellas;

                weeklyOverflowBottles[w] += overflowBotellas;
                weeklyOverflowLiters[w] += overflowLitros;
                weeklyProducedLiters[w] += litrosProducir;

                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Plan real: ${formatDecimal(producedBySchedule)} L${adicionales ? ` + ${formatDecimal(adicionales)} L extra` : ''} / Demanda: ${formatDecimal(demandaL)} L<br>Overflow: +${formatDecimal(overflowBotellas)} bot / ${formatDecimal(overflowLitros)} L</span>`;
            } else {
                // Semanas 3 y 4: Canal Botellas
                currentBotellas += scheduledBottles;
                const demandaB = demandBotellas[p.id][w];
                currentBotellas -= demandaB;

                if (currentBotellas < 0) {
                    const deficitBotellas = Math.abs(currentBotellas);
                    const deficitLitros = deficitBotellas * unitVolume;
                    const lotesNecesarios = Math.ceil(deficitLitros / LITROS_POR_LOTE);
                    const adicionales = lotesNecesarios * LITROS_POR_LOTE;
                    litrosProducir = scheduledLiters + adicionales;
                    const botellasNuevas = Math.floor(adicionales / unitVolume);
                    currentBotellas += botellasNuevas;
                } else {
                    litrosProducir = scheduledLiters;
                }
                
                weeklyProducedLiters[w] += litrosProducir;
                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Plan real: ${formatDecimal(scheduledLiters)} L / Demanda: ${formatDecimal(demandaB)} bot<br>Inv. Fin: ${formatDecimal(currentBotellas)} bot / ${formatDecimal(currentBotellas * unitVolume)} L</span>`;
            }
            
            mpsPlan[p.id][w] = litrosProducir;
            invProjectedPT[p.id][w] = currentBotellas;
            lotesPorSemana[w] += Math.ceil(litrosProducir / LITROS_POR_LOTE);
            totalLiters += litrosProducir;
            pmpDetails.push(detail);
        }
        
        totalBottlesGen += invProjectedPT[p.id][3] - p.quantity + demandBotellas[p.id].reduce((a,b)=>a+b,0);
        
        mpsHtml += `<tr>
            <td class="p-2 border font-semibold">${p.name}</td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50 transition-colors" title="Haz clic para editar la demanda de esta semana" onclick="editPlanningDemand(${p.id}, 0)">
                ${pmpDetails[0]}
                <span class="text-[10px] text-green-700 block font-semibold hover:underline mt-1"><i class="fas fa-edit"></i> Editar Demanda</span>
            </td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50 transition-colors" title="Haz clic para editar la demanda de esta semana" onclick="editPlanningDemand(${p.id}, 1)">
                ${pmpDetails[1]}
                <span class="text-[10px] text-green-700 block font-semibold hover:underline mt-1"><i class="fas fa-edit"></i> Editar Demanda</span>
            </td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50 transition-colors" title="Haz clic para editar el pronóstico de esta semana" onclick="editPlanningDemand(${p.id}, 2)">
                ${pmpDetails[2]}
                <span class="text-[10px] text-green-700 block font-semibold hover:underline mt-1"><i class="fas fa-edit"></i> Editar Pronóstico</span>
            </td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50 transition-colors" title="Haz clic para editar el pronóstico de esta semana" onclick="editPlanningDemand(${p.id}, 3)">
                ${pmpDetails[3]}
                <span class="text-[10px] text-green-700 block font-semibold hover:underline mt-1"><i class="fas fa-edit"></i> Editar Pronóstico</span>
            </td>
            <td class="p-2 border text-center font-bold">${mpsPlan[p.id].reduce((a,b)=>a+b,0)} L</td>
        </tr>`;
    });
    
    // Fila de validación de capacidad (CRP)
    mpsHtml += `<tr class="bg-gray-100">
        <td class="p-2 border font-bold text-right text-gray-600">Lotes a Iniciar (CRP):</td>`;
    
    let isOverCapacity = false;
    for(let w=0; w<4; w++) {
        let l = lotesPorSemana[w];
        const maxTanksThisWeek = customWeeklyCapacities[w] / LITROS_POR_LOTE;
        let alertClass = l > maxTanksThisWeek ? 'text-red-600 font-bold bg-red-100' : 'text-green-600 font-bold';
        if (l > maxTanksThisWeek) isOverCapacity = true;
        mpsHtml += `<td class="p-2 border text-center ${alertClass}">${l} / ${maxTanksThisWeek} Tanques</td>`;
    }
    mpsHtml += `<td class="p-2 border"></td></tr></tbody></table>`;

    if (isOverCapacity) {
        mpsHtml = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 font-bold">
            <i class="fas fa-exclamation-triangle"></i> ALERTA CRÍTICA: Se ha excedido la capacidad máxima de producción en alguna de las semanas. Ajusta los pedidos o el pronóstico.
        </div>` + mpsHtml;
    }

    if(mpsContainer) mpsContainer.innerHTML = mpsHtml;

    // 3. Calcular MRP (Explosión de Materiales)
    let mrpHtml = `<table class="w-full text-left border-collapse border border-gray-200 text-sm">
        <thead>
            <tr class="bg-[#005B3A] text-white">
                <th class="p-2 border">Materia Prima</th>
                <th class="p-2 border text-center bg-[#00422a]">Stock Inicial</th>
                <th class="p-2 border text-center">Sem 1</th>
                <th class="p-2 border text-center">Sem 2</th>
                <th class="p-2 border text-center">Sem 3</th>
                <th class="p-2 border text-center">Sem 4</th>
            </tr>
        </thead>
        <tbody>`;

    rawMaterials.forEach(rm => {
        let inv = rm.quantity;
        let cellsHtml = '';
        
        for(let w=0; w<4; w++) {
            // Explosión de Materiales: Requerimiento Bruto
            let reqBruto = 0;
            finalProducts.forEach(p => {
                const recipe = recipes.find(r => r.productId === p.id);
                if(recipe) {
                    const ing = recipe.ingredients.find(i => i.ingredientProductId === rm.id);
                    if(ing) {
                        reqBruto += ing.qtyPerUnit * mpsPlan[p.id][w];
                    }
                }
            });
            
            // Lógica MRP
            let invProyectado = inv - reqBruto;
            let reqNeto = 0;
            let ordenLanzada = 0;
            let aPedirEn = "";

            if(invProyectado <= rm.safetyStock) {
                reqNeto = rm.safetyStock - invProyectado + reqBruto;
                
                // Redondeo a unidad de compra (TECHO)
                ordenLanzada = Math.ceil(reqNeto / rm.purchaseUnit) * rm.purchaseUnit;
                invProyectado += ordenLanzada; // Simulamos la recepción en esta semana
                
                // Desplazamiento por Lead Time para lanzar la orden
                let dt = rm.leadTime; // leadTime en semanas
                let semanaLanzamiento = (w + 1) - dt;
                
                if (semanaLanzamiento <= 0) {
                    aPedirEn = `<div class="mt-1 text-[10px] bg-red-100 text-red-800 p-1 rounded font-bold border border-red-300 mb-1">¡PEDIDO URGENTE! ${ordenLanzada.toFixed(0)} ${rm.name.includes('und')||rm.name.includes('Botellas')?'und':'kg'}</div>
                    <button onclick="quickRestock(${rm.id}, ${ordenLanzada})" class="w-full text-[10px] bg-blue-500 hover:bg-blue-600 text-white py-1 px-1 rounded font-bold shadow"><i class="fas fa-truck-loading"></i> Reabastecer</button>`;
                } else {
                    aPedirEn = `<div class="mt-1 text-[10px] bg-amber-100 text-amber-800 p-1 rounded font-bold border border-amber-300 mb-1">Lanzar Orden Sem ${semanaLanzamiento}: ${ordenLanzada.toFixed(0)}</div>
                    <button onclick="quickRestock(${rm.id}, ${ordenLanzada})" class="w-full text-[10px] bg-blue-500 hover:bg-blue-600 text-white py-1 px-1 rounded font-bold shadow"><i class="fas fa-truck-loading"></i> Reabastecer</button>`;
                }
            }

            cellsHtml += `<td class="p-2 border text-center text-xs">
                Req: <span class="text-red-600 font-semibold">${formatDecimal(reqBruto)}</span><br>
                Inv: <span class="text-blue-600 font-semibold">${formatDecimal(invProyectado)}</span>
                ${aPedirEn}
            </td>`;
            inv = invProyectado;
        }
        
        mrpHtml += `<tr>
            <td class="p-2 border font-semibold">${rm.name}<br><span class="text-[10px] text-gray-500">SS: ${formatDecimal(rm.safetyStock)} | Lote: ${formatDecimal(rm.purchaseUnit)} | LT: ${formatDecimal(rm.leadTime)} Sem</span></td>
            <td class="p-2 border text-center bg-gray-50 font-bold">${formatDecimal(rm.quantity)}</td>
            ${cellsHtml}
        </tr>`;
    });
    mrpHtml += `</tbody></table>`;
    if(mrpContainer) mrpContainer.innerHTML = mrpHtml;

    // 4. Resumen Ejecutivo (KPIs)
    let finalInvTotal = 0;
    let finalInvLiters = 0;
    finalProducts.forEach(p => {
        const finalQty = invProjectedPT[p.id][3] || 0;
        finalInvTotal += finalQty;
        finalInvLiters += finalQty * (p.volumePerUnit || 0.33);
    });

    if(kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="flex-1 bg-green-50 p-4 rounded-lg border border-green-200 text-center shadow-sm">
                <p class="text-sm text-green-800 font-bold mb-1">Litros Producidos / Mes</p>
                <p class="text-3xl font-black text-green-600">${totalLiters} L</p>
            </div>
            <div class="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-200 text-center shadow-sm">
                <p class="text-sm text-blue-800 font-bold mb-1">Uso de Capacidad (S1-S4)</p>
                <p class="text-3xl font-black text-blue-600">${Math.round((lotesPorSemana.reduce((a, b) => a + b, 0) / (customWeeklyCapacities.reduce((a, b) => a + b, 0) / LITROS_POR_LOTE)) * 100)}%</p>
            </div>
            <div class="flex-1 bg-amber-50 p-4 rounded-lg border border-amber-200 text-center shadow-sm">
                <p class="text-sm text-amber-800 font-bold mb-1">Overflow embotellado</p>
                <p class="text-3xl font-black text-amber-600">${formatDecimal(weeklyOverflowBottles.reduce((a,b)=>a+b,0))} Bot / ${formatDecimal(weeklyOverflowLiters.reduce((a,b)=>a+b,0))} L</p>
            </div>
            <div class="flex-1 bg-purple-50 p-4 rounded-lg border border-purple-200 text-center shadow-sm">
                <p class="text-sm text-purple-800 font-bold mb-1">Inv. Final PT Proyectado</p>
                <p class="text-3xl font-black text-purple-600">${formatDecimal(finalInvTotal)} Bot / ${formatDecimal(finalInvLiters)} L</p>
            </div>
        `;
    }

    const volumeTable = document.getElementById('production-volume-table');
    const demandTable = document.getElementById('production-demand-table');
    const inventoryTable = document.getElementById('production-inventory-table');

    if(volumeTable) {
        const monthlyCapacity = customWeeklyCapacities.reduce((a, b) => a + b, 0);
        const barrilTotal = weeklyBarrilDemand.reduce((a,b)=>a+b,0);
        const overflowTotalBottles = weeklyOverflowBottles.reduce((a,b)=>a+b,0);
        const overflowTotalLiters = weeklyOverflowLiters.reduce((a,b)=>a+b,0);
        const forecastTotal = weeklyForecastLiters.reduce((a,b)=>a+b,0);
        const producedTotal = weeklyProducedLiters.reduce((a,b)=>a+b,0);

        volumeTable.innerHTML = `
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-[#005B3A] text-white">
                    <tr>
                        <th class="p-2 border">Concepto</th>
                        <th class="p-2 border text-center">Semana 1</th>
                        <th class="p-2 border text-center">Semana 2</th>
                        <th class="p-2 border text-center">Semana 3</th>
                        <th class="p-2 border text-center">Semana 4</th>
                        <th class="p-2 border text-center">Total Mes</th>
                        <th class="p-2 border text-center">%</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Pedidos fijos — Barril (L)</td>
                        ${weeklyBarrilDemand.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(barrilTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((barrilTotal / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Overflow embotellado barril (bot)</td>
                        ${weeklyOverflowBottles.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(overflowTotalBottles)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((overflowTotalLiters / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Producción según pronósticos (L)</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(forecastTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((forecastTotal / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr class="font-bold bg-[#f8fafc]">
                        <td class="p-2 border font-semibold">PRODUCCIÓN TOTAL (L)</td>
                        ${weeklyProducedLiters.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(producedTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((producedTotal / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Capacidad producida en el mes (L)</td>
                        ${[0, 1, 2, 3].map(w => `
                            <td class="p-2 border text-center cursor-pointer hover:bg-green-50 transition-colors font-medium" title="Haz clic para editar la capacidad de esta semana" onclick="editWeeklyCapacity(${w})">
                                <span class="font-semibold text-gray-800">${customWeeklyCapacities[w]} L</span>
                                <span class="text-[10px] text-green-700 block font-semibold hover:underline mt-0.5"><i class="fas fa-edit"></i> Editar</span>
                            </td>
                        `).join('')}
                        <td class="p-2 border text-center font-bold">${monthlyCapacity} L</td>
                        <td class="p-2 border text-center font-semibold">100%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    if(demandTable) {
        const monthlyCapacity = customWeeklyCapacities.reduce((a, b) => a + b, 0);
        const barrilTotal = weeklyBarrilDemand.reduce((a,b)=>a+b,0);
        const forecastTotal = weeklyForecastLiters.reduce((a,b)=>a+b,0);
        const totalDemand = barrilTotal + forecastTotal;
        demandTable.innerHTML = `
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-[#005B3A] text-white">
                    <tr>
                        <th class="p-2 border">Canal</th>
                        <th class="p-2 border text-center">Semana 1</th>
                        <th class="p-2 border text-center">Semana 2</th>
                        <th class="p-2 border text-center">Semana 3</th>
                        <th class="p-2 border text-center">Semana 4</th>
                        <th class="p-2 border text-center">Total Mes</th>
                        <th class="p-2 border text-center">%</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Pedidos fijos — Barril (L)</td>
                        ${weeklyBarrilDemand.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(barrilTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((barrilTotal / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Pronósticos (L)</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(forecastTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((forecastTotal / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                    <tr class="font-bold bg-[#f8fafc]">
                        <td class="p-2 border font-semibold">TOTAL (L)</td>
                        ${weeklyBarrilDemand.map((_,i) => `<td class="p-2 border text-center">${formatDecimal(weeklyBarrilDemand[i] + weeklyForecastLiters[i])}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(totalDemand)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((totalDemand / (monthlyCapacity || 1)) * 100)}%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    if(inventoryTable) {
        const startBottles = finalProducts.reduce((sum,p) => sum + p.quantity, 0);
        const endBottles = finalProducts.reduce((sum,p) => sum + (invProjectedPT[p.id]?.[3] || 0), 0);
        const startLiters = finalProducts.reduce((sum,p) => sum + (p.quantity * (p.volumePerUnit || 0.33)), 0);
        const endLiters = finalProducts.reduce((sum,p) => sum + ((invProjectedPT[p.id]?.[3] || 0) * (p.volumePerUnit || 0.33)), 0);

        inventoryTable.innerHTML = `
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-[#005B3A] text-white">
                    <tr>
                        <th class="p-2 border">Concepto</th>
                        <th class="p-2 border text-center">Semana 0</th>
                        <th class="p-2 border text-center">Semana 1</th>
                        <th class="p-2 border text-center">Semana 2</th>
                        <th class="p-2 border text-center">Semana 3</th>
                        <th class="p-2 border text-center">Semana 4</th>
                        <th class="p-2 border text-center">Total Mes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Pronóstico ventas (botellas)</td>
                        <td class="p-2 border text-center">—</td>
                        ${weeklyForecastBottles.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(weeklyForecastBottles.reduce((a,b)=>a+b,0))}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Pronóstico ventas (litros)</td>
                        <td class="p-2 border text-center">—</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(weeklyForecastLiters.reduce((a,b)=>a+b,0))}</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Inventario PT (botellas) al INICIO</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(startBottles)}</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(startBottles)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Inventario PT (botellas) al FINAL</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(endBottles)}</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(endBottles)}</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Inventario PT (litros) al INICIO</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(startLiters)}</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(startLiters)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Inventario PT (litros) al FINAL</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(endLiters)}</td>
                        <td class="p-2 border text-center font-bold">${formatDecimal(endLiters)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    out.innerHTML = `<div class="text-green-700 font-bold bg-green-50 p-3 border border-green-200 rounded"><i class="fas fa-check-circle mr-1"></i> Cálculo MRP y MPS finalizado. Validaciones completadas.</div>`;
}

function editPlanningDemand(productId, weekIndex) {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    
    const isBarril = weekIndex < 2;
    const title = isBarril 
        ? `Editar Pedido Fijo (Barril) para ${product.name} en Semana ${weekIndex + 1} (Litros):`
        : `Editar Pronóstico (Botellas) para ${product.name} en Semana ${weekIndex + 1} (Unidades):`;
        
    // Calcular cantidad actual agrupada
    let currentQty = 0;
    const today = new Date();
    
    if (isBarril) {
        // Pedidos fijos
        const weekOrders = orders.filter(o => {
            if (o.productId !== productId) return false;
            const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000*60*60*24));
            const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
            return w === weekIndex;
        });
        const volumePerUnit = product.volumePerUnit || 1;
        const totalUnits = weekOrders.reduce((sum, o) => sum + o.qty, 0);
        currentQty = totalUnits * volumePerUnit;
    } else {
        // Pronósticos
        const weekForecasts = forecasts.filter(f => {
            if (f.productId !== productId) return false;
            const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000*60*60*24));
            const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
            return w === weekIndex;
        });
        currentQty = weekForecasts.reduce((sum, f) => sum + f.qty, 0);
    }
    
    const valInput = prompt(title, currentQty);
    if (valInput === null || valInput.trim() === "") return;
    
    const newQty = parseFloat(valInput);
    if (isNaN(newQty) || newQty < 0) {
        return showNotification('Cantidad inválida.', 'error');
    }
    
    // Guardar y Actualizar
    if (isBarril) {
        const volumePerUnit = product.volumePerUnit || 1;
        const newUnits = newQty / volumePerUnit;
        
        // Quitar pedidos anteriores de esta semana
        orders = orders.filter(o => {
            if (o.productId !== productId) return true;
            const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000*60*60*24));
            const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
            return w !== weekIndex;
        });
        
        if (newQty > 0) {
            const targetDate = getDateForWeekOffset(weekIndex);
            orders.push({
                id: Date.now(),
                productId,
                qty: newUnits,
                dueDate: targetDate,
                createdAt: new Date().toISOString()
            });
        }
    } else {
        // Quitar pronósticos anteriores de esta semana
        forecasts = forecasts.filter(f => {
            if (f.productId !== productId) return true;
            const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000*60*60*24));
            const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
            return w !== weekIndex;
        });
        
        if (newQty > 0) {
            const targetDate = getDateForWeekOffset(weekIndex);
            forecasts.push({
                id: Date.now(),
                productId,
                qty: newQty,
                targetDate
            });
        }
    }
    
    saveData();
    refreshAppUI();
    runProductionFlow();
    showNotification('Demanda actualizada y plan recalculado con éxito.', 'success');
}

function editWeeklyCapacity(weekIndex) {
    const currentVal = customWeeklyCapacities[weekIndex] || 720;
    const valInput = prompt(`Ingrese la capacidad de producción para la Semana ${weekIndex + 1} (en Litros):`, currentVal);
    if (valInput === null || valInput.trim() === "") return;
    
    const newVal = parseFloat(valInput);
    if (isNaN(newVal) || newVal <= 0) {
        return showNotification('Por favor ingrese un valor numérico válido mayor a 0.', 'error');
    }
    
    customWeeklyCapacities[weekIndex] = newVal;
    saveData();
    refreshAppUI();
    runProductionFlow();
    showNotification(`Capacidad de la Semana ${weekIndex + 1} actualizada a ${newVal} L`, 'success');
}

function createSection(title, text) {
    const container = document.createElement('div');
    container.className = 'mb-3';
    const h = document.createElement('div');
    h.className = 'font-semibold mb-1';
    h.textContent = title;
    const pre = document.createElement('pre');
    pre.className = 'text-xs bg-white p-2 border rounded';
    pre.textContent = text;
    container.appendChild(h);
    container.appendChild(pre);
    return container;
}

function getBatchesByProduct(productId) {
    return batches.filter(b => b.productId === productId && b.quantity > 0).sort((a,b) => new Date(a.manufactureDate) - new Date(b.manufactureDate));
}

function allocateFromBatches(productId, qtyNeeded) {
    // Consume lotes FIFO. Retorna true si se puede cumplir.
    const available = getBatchesByProduct(productId).reduce((s,b)=>s+b.quantity,0);
    if (available < qtyNeeded) {
        return false;
    }
    let remaining = qtyNeeded;
    // Recorremos lotes
    const sorted = getBatchesByProduct(productId);
    for (let batch of sorted) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        batch.quantity -= take;
        remaining -= take;
    }
    // Limpiar lotes con 0
    batches = batches.filter(b => b.quantity > 0);
    saveData();
    loadBatches();
    return true;
}


// --- Utilidades ---
function saveData() {
    const state = {
        clients,
        suppliers,
        inventory,
        warehouses,
        batches,
        orders,
        forecasts,
        recipes,
        tanks,
        purchaseOrders,
        productionHistory,
        weekCalculationMode,
        customWeeklyCapacities
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshAppUI() {
    loadClients();
    loadSuppliers();
    loadInventory();
    loadWarehouses();
    loadBatches();
    updateBatchProductSelect();
    updateWarehouseSelect();
    loadOrders();
    loadForecasts();
    loadRecipes();
    loadTanks();
    updateOrderProductSelect();
    updateForecastProductSelect();
    updateWizardProductSelect();
    updateWizardTankSelect();
    renderTrackingActive();
    renderTrackingHistory();
    if (!document.getElementById('tab-planeacion')?.classList.contains('hidden')) {
        runProductionFlow();
    }
    if (!document.getElementById('tab-semanal')?.classList.contains('hidden')) {
        renderWeeklyProductionTab();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function addDays(dateStr, days) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function diffDays(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function getAlerts() {
    const alerts = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    inventory.filter(p => p.type === 'raw').forEach(product => {
        if (product.safetyStock > 0 && product.quantity <= product.safetyStock) {
            alerts.push({
                type: 'Materia Prima',
                message: `Materia prima "${product.name}" (SKU: ${product.sku}) está en o por debajo del mínimo de alerta (${product.quantity}/${product.safetyStock}).`
            });
        }
    });

    tanks.forEach(tank => {
        (tank.schedule || []).forEach(schedule => {
            const prod = inventory.find(p => p.id === schedule.productId);
            const prodName = prod ? prod.name : 'Producto';
            const fermentationDays = schedule.fermentationDays != null ? schedule.fermentationDays : 8;
            const bottlingDays = schedule.bottlingDays != null ? schedule.bottlingDays : 2;
            const packagingDays = schedule.packagingDays != null ? schedule.packagingDays : 1;
            const fermentationEnd = schedule.fermentationEnd || addDays(schedule.start, fermentationDays);
            const bottlingEnd = schedule.bottlingEnd || addDays(fermentationEnd, bottlingDays);
            const packagingEnd = schedule.packagingEnd || addDays(bottlingEnd, packagingDays);

            if (todayStr > packagingEnd) {
                alerts.push({
                    type: 'Proceso',
                    message: `Proceso de ${prodName} en ${tank.name} ya finalizó (${packagingEnd}). Revisa embazado/empaquetado.`
                });
            } else {
                const daysToPackage = diffDays(todayStr, packagingEnd);
                if (daysToPackage <= 2) {
                    alerts.push({
                        type: 'Proceso',
                        message: `Proceso de ${prodName} en ${tank.name} finalizará en ${daysToPackage} día(s) (${packagingEnd}).`
                    });
                }
                const daysToFermentation = diffDays(todayStr, fermentationEnd);
                if (daysToFermentation >= 0 && daysToFermentation <= 1) {
                    alerts.push({
                        type: 'Proceso',
                        message: `Fermentación de ${prodName} en ${tank.name} termina pronto (${fermentationEnd}).`
                    });
                }
            }
        });
    });

    return alerts;
}

function renderNotificationBell() {
    const count = getAlerts().length;
    const badge = document.getElementById('notification-bell-count');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function openNotificationsModal() {
    const list = document.getElementById('notifications-list');
    const alerts = getAlerts();
    if (!list) return;

    if (alerts.length === 0) {
        list.innerHTML = `<div class="p-4 bg-green-50 border border-green-200 rounded text-green-700">No hay alertas en este momento.</div>`;
    } else {
        list.innerHTML = alerts.map(alert => `
            <div class="p-4 rounded border ${alert.type === 'Materia Prima' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}">
                <div class="font-bold text-sm mb-1">${alert.type}</div>
                <div class="text-sm">${alert.message}</div>
            </div>
        `).join('');
    }

    document.getElementById('notifications-modal').classList.remove('hidden');
}

function closeNotificationsModal() {
    document.getElementById('notifications-modal').classList.add('hidden');
}

// --- Tank Info Modal ---
function openTankInfoModal(id) {
    const tank = tanks.find(t => t.id === id);
    if (!tank) return;

    document.getElementById('tank-info-title').textContent = `Tanque: ${tank.name}`;
    const content = document.getElementById('tank-info-content');
    
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeSchedule = (tank.schedule || []).find(s => s.start <= todayStr && s.end >= todayStr);

    let html = `<p class="text-lg"><strong>Capacidad Total:</strong> ${tank.capacityLiters} L</p>`;

    if (activeSchedule) {
        const prod = inventory.find(p => p.id === activeSchedule.productId);
        const prodName = prod ? prod.name : 'Producto desconocido';
        const fermentationDays = activeSchedule.fermentationDays != null ? activeSchedule.fermentationDays : 8;
        const bottlingDays = activeSchedule.bottlingDays != null ? activeSchedule.bottlingDays : 2;
        const packagingDays = activeSchedule.packagingDays != null ? activeSchedule.packagingDays : 1;
        const fermentationEnd = activeSchedule.fermentationEnd || addDays(activeSchedule.start, fermentationDays);
        const bottlingEnd = activeSchedule.bottlingEnd || addDays(fermentationEnd, bottlingDays);
        const packagingEnd = activeSchedule.packagingEnd || addDays(bottlingEnd, packagingDays);
        
        const startDate = new Date(activeSchedule.start);
        const endDate = new Date(activeSchedule.end);
        const today = new Date();
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
        const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
        
        html += `
            <div class="mt-4 p-4 bg-amber-50 rounded-md border border-amber-200">
                <h3 class="font-bold text-amber-800 text-lg mb-2"><i class="fas fa-flask"></i> Proceso en Curso</h3>
                <p><strong>Producto:</strong> ${prodName}</p>
                <p><strong>Volumen en Proceso:</strong> ${activeSchedule.qty} L</p>
                <p><strong>Fecha de Inicio:</strong> ${activeSchedule.start}</p>
                <p><strong>Fin Fermentación:</strong> ${fermentationEnd} (${fermentationDays} días)</p>
                <p><strong>Fin Embazado:</strong> ${bottlingEnd} (${bottlingDays} días)</p>
                <p><strong>Fin Empaquetado:</strong> ${packagingEnd} (${packagingDays} días)</p>
                <p class="mt-2 font-semibold text-gray-700">Fecha Estimada de Fin Total: ${activeSchedule.end}</p>

                <div class="mt-4 text-sm font-semibold text-amber-700 flex justify-between">
                    <span>Día ${elapsedDays} de ${totalDays}</span>
                    <span>${progress.toFixed(0)}%</span>
                </div>
                <div class="w-full bg-amber-200 rounded-full h-3 mt-1 overflow-hidden">
                  <div class="bg-amber-600 h-3 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                </div>
            </div>
        `;

        // Ingredientes implementados
        const recipe = recipes.find(r => r.productId === activeSchedule.productId);
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
            html += `<div class="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 class="font-bold mb-2 text-gray-800"><i class="fas fa-clipboard-list"></i> Ingredientes Utilizados:</h3>
                <ul class="list-disc pl-5 space-y-1 text-gray-700">`;
            
            const totalUnits = prod && prod.volumePerUnit ? (activeSchedule.qty / prod.volumePerUnit) : activeSchedule.qty;

            recipe.ingredients.forEach(ing => {
                const ingProd = inventory.find(p => p.id === ing.ingredientProductId);
                const reqQty = ing.qtyPerUnit * totalUnits;
                html += `<li><strong>${ingProd ? ingProd.name : 'Ingrediente'}</strong>: ${formatDecimal(reqQty)}</li>`;
            });
            html += `</ul></div>`;
        }
        
        html += `<button onclick="openTankScheduleForm(${tank.id}, true)" class="mt-4 px-4 py-2 w-full bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-bold"><i class="fas fa-edit mr-2"></i> Editar Lote Actual</button>`;

    } else {
        html += `
            <div class="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                <h3 class="font-bold text-green-800 text-lg"><i class="fas fa-check-circle"></i> Tanque Libre</h3>
                <p class="text-green-700 mt-1">Este tanque está vacío y listo para un nuevo lote de producción.</p>
            </div>
            <button onclick="openTankScheduleForm(${tank.id}, false)" class="mt-4 px-4 py-2 w-full bg-[#005B3A] text-white rounded-md hover:bg-[#00422a] transition-colors font-bold"><i class="fas fa-fill-drip mr-2"></i> Llenar Tanque Manualmente</button>
        `;
    }

    content.innerHTML = html;
    document.getElementById('tank-info-modal').classList.remove('hidden');
}

function closeTankInfoModal() {
    document.getElementById('tank-info-modal').classList.add('hidden');
}

// --- Tank Schedule (Manual) ---
function openTankScheduleForm(tankId, isEdit) {
    closeTankInfoModal();
    const tank = tanks.find(t => t.id === tankId);
    if (!tank) return;

    document.getElementById('tank-schedule-form').reset();
    document.getElementById('tank-schedule-id').value = tankId;
    document.getElementById('tank-schedule-edit').value = isEdit ? '1' : '0';
    document.getElementById('tank-schedule-title').textContent = isEdit ? 'Editar Lote en Tanque' : 'Llenar Tanque Manualmente';

    // Poblar select de productos
    const select = document.getElementById('tank-schedule-product');
    select.innerHTML = '<option value="">-- Selecciona Producto --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        select.appendChild(opt);
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    
    if (isEdit) {
        const activeSchedule = (tank.schedule || []).find(s => s.start <= todayStr && s.end >= todayStr);
        if (activeSchedule) {
            select.value = activeSchedule.productId;
            document.getElementById('tank-schedule-qty').value = activeSchedule.qty;
            document.getElementById('tank-schedule-fermentation-days').value = activeSchedule.fermentationDays || 8;
            document.getElementById('tank-schedule-bottling-days').value = activeSchedule.bottlingDays || 2;
            document.getElementById('tank-schedule-packaging-days').value = activeSchedule.packagingDays || 1;
            document.getElementById('tank-schedule-start').value = activeSchedule.start;
            document.getElementById('tank-schedule-end').value = activeSchedule.end;
        }
    } else {
        document.getElementById('tank-schedule-fermentation-days').value = 8;
        document.getElementById('tank-schedule-bottling-days').value = 2;
        document.getElementById('tank-schedule-packaging-days').value = 1;
        document.getElementById('tank-schedule-start').value = todayStr;
        suggestTankScheduleEnd(); // Sugerir fecha final con tiempos default
    }

    document.getElementById('tank-schedule-modal').classList.remove('hidden');
}

function closeTankScheduleModal() {
    document.getElementById('tank-schedule-modal').classList.add('hidden');
}

function suggestTankScheduleEnd() {
    const startInput = document.getElementById('tank-schedule-start').value;
    if (startInput) {
        const fermentationDays = parseInt(document.getElementById('tank-schedule-fermentation-days').value) || 8;
        const bottlingDays = parseInt(document.getElementById('tank-schedule-bottling-days').value) || 2;
        const packagingDays = parseInt(document.getElementById('tank-schedule-packaging-days').value) || 1;
        const endInput = document.getElementById('tank-schedule-end');
        const startDate = new Date(`${startInput}T00:00:00`);
        const totalDays = fermentationDays + bottlingDays + packagingDays;
        startDate.setDate(startDate.getDate() + totalDays);
        endInput.value = startDate.toISOString().slice(0, 10);
    }
}

function saveTankSchedule(event) {
    event.preventDefault();
    const tankId = parseInt(document.getElementById('tank-schedule-id').value);
    const isEdit = document.getElementById('tank-schedule-edit').value === '1';
    
    const productId = parseInt(document.getElementById('tank-schedule-product').value);
    const qty = parseFloat(document.getElementById('tank-schedule-qty').value);
    const start = document.getElementById('tank-schedule-start').value;
    const end = document.getElementById('tank-schedule-end').value;
    const fermentationDays = parseInt(document.getElementById('tank-schedule-fermentation-days').value) || 8;
    const bottlingDays = parseInt(document.getElementById('tank-schedule-bottling-days').value) || 2;
    const packagingDays = parseInt(document.getElementById('tank-schedule-packaging-days').value) || 1;

    const tank = tanks.find(t => t.id === tankId);
    if (!tank) return;

    if (qty > tank.capacityLiters) {
        return showNotification(`La cantidad (${qty}L) supera la capacidad del tanque (${tank.capacityLiters}L).`, 'error');
    }
    
    if (new Date(start) >= new Date(end)) {
        return showNotification('La fecha de fin debe ser posterior a la fecha de inicio.', 'error');
    }

    const fermentationEnd = addDays(start, fermentationDays);
    const bottlingEnd = addDays(fermentationEnd, bottlingDays);
    const packagingEnd = addDays(bottlingEnd, packagingDays);

    tank.schedule = tank.schedule || [];

    const scheduleEntry = {
        start,
        end,
        productId,
        qty,
        fermentationDays,
        bottlingDays,
        packagingDays,
        fermentationEnd,
        bottlingEnd,
        packagingEnd
    };

    if (isEdit) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const idx = tank.schedule.findIndex(s => s.start <= todayStr && s.end >= todayStr);
        if (idx !== -1) {
            tank.schedule[idx] = scheduleEntry;
        }
    } else {
        tank.schedule.push(scheduleEntry);
    }

    saveData();
    refreshAppUI();
    closeTankScheduleModal();
    showNotification(isEdit ? 'Lote actualizado correctamente.' : 'Tanque llenado manualmente.', 'success');
}

// --- NUEVA LÓGICA DE PRODUCCIÓN (TABS, WIZARD Y SEGUIMIENTO) ---

function switchProductionTab(tabId) {
    const tabNueva = document.getElementById('tab-nueva');
    const tabSeguimiento = document.getElementById('tab-seguimiento');
    const tabSemanal = document.getElementById('tab-semanal');
    const tabPlaneacion = document.getElementById('tab-planeacion');
    const btnNueva = document.getElementById('tab-btn-nueva');
    const btnSeguimiento = document.getElementById('tab-btn-seguimiento');
    const btnSemanal = document.getElementById('tab-btn-semanal');
    const btnPlaneacion = document.getElementById('tab-btn-planeacion');

    // Hide all
    tabNueva.classList.add('hidden');
    tabSeguimiento.classList.add('hidden');
    if (tabSemanal) tabSemanal.classList.add('hidden');
    if (tabPlaneacion) tabPlaneacion.classList.add('hidden');
    
    // Reset buttons
    btnNueva.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    btnSeguimiento.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    if (btnSemanal) btnSemanal.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    if (btnPlaneacion) btnPlaneacion.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';

    if (tabId === 'nueva') {
        tabNueva.classList.remove('hidden');
        btnNueva.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
        updateWizardProductSelect();
        updateWizardTankSelect();
    } else if (tabId === 'seguimiento') {
        tabSeguimiento.classList.remove('hidden');
        btnSeguimiento.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
        renderTrackingActive();
        renderTrackingHistory();
        loadTanks();
    } else if (tabId === 'semanal') {
        if (tabSemanal) tabSemanal.classList.remove('hidden');
        if (btnSemanal) btnSemanal.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
        renderWeeklyProductionTab();
    } else if (tabId === 'planeacion') {
        if (tabPlaneacion) tabPlaneacion.classList.remove('hidden');
        if (btnPlaneacion) btnPlaneacion.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
        if (hasActiveProduction()) {
            runProductionFlow();
        } else {
            renderPlaneacionPlaceholder();
        }
    }
}

// -- Wizard (Paso a Paso) --

function updateWizardProductSelect() {
    const select = document.getElementById('wizard-product');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Selecciona Receta / Producto --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
}

function changeWeekMode(mode) {
    weekCalculationMode = mode;
    saveData();
    refreshAppUI();
}

function getWeekOfMonthLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d)) return 'Sin semana';
    const dayOfMonth = d.getDate();
    const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 es Domingo, 1 es Lunes...
    const startOffset = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);
    const weekOfMonth = Math.ceil((dayOfMonth + startOffset) / 7);
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthName = monthNames[d.getMonth()];
    return `${monthName} - Semana ${weekOfMonth}`;
}

function getRelativeWeekLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d)) return 'Sin semana';
    
    // Buscar la fecha de producción más antigua
    let minDate = d;
    productionHistory.forEach(hist => {
        const histDate = new Date(`${hist.startDate || hist.endDate}T00:00:00`);
        if (!isNaN(histDate) && histDate < minDate) {
            minDate = histDate;
        }
    });
    
    // Alinear la fecha mínima al lunes de esa semana
    const minDateAligned = new Date(minDate);
    const day = minDateAligned.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    minDateAligned.setDate(minDateAligned.getDate() + diffToMonday);
    
    const diffTime = d - minDateAligned;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return `Semana ${weekNumber}`;
}

function getWeekLabel(dateStr) {
    if (weekCalculationMode === 'relative') {
        return getRelativeWeekLabel(dateStr);
    } else {
        return getWeekOfMonthLabel(dateStr);
    }
}

function getWeekLabelForEntry(hist) {
    if (hist && hist.week) {
        const d = new Date(`${hist.endDate || hist.startDate}T00:00:00`);
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthName = !isNaN(d) ? monthNames[d.getMonth()] : 'Mes';
        
        if (weekCalculationMode === 'relative') {
            return `Semana ${hist.week}`;
        } else {
            return `${monthName} - Semana ${hist.week}`;
        }
    }
    return getWeekLabel(hist.endDate || hist.startDate);
}

function renderWeeklyProductionTab() {
    const productionContainer = document.getElementById('weekly-production-table');
    const forecastContainer = document.getElementById('forecast-adjustment-table');
    const historyEditor = document.getElementById('weekly-production-history-editor');
    if (!productionContainer || !forecastContainer || !historyEditor) return;

    const modeSelect = document.getElementById('week-mode-select');
    if (modeSelect) {
        modeSelect.value = weekCalculationMode;
    }

    updateWeeklyProductionProductSelect();
    updateWeeklyEditTankSelect();

    const weeklyMap = {};
    productionHistory.forEach(hist => {
        const week = getWeekLabelForEntry(hist);
        const key = `${week}|${hist.productId}`;
        const prod = inventory.find(p => p.id === hist.productId) || { name: 'Producto desconocido' };
        if (!weeklyMap[key]) {
            weeklyMap[key] = { week, productId: hist.productId, productName: prod.name, liters: 0, units: 0 };
        }
        weeklyMap[key].liters += hist.qtyLiters || 0;
        weeklyMap[key].units += hist.qtyUnits || 0;
    });

    const weeklyRows = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week) || a.productName.localeCompare(b.productName));

    if (weeklyRows.length === 0) {
        productionContainer.innerHTML = '<p class="text-gray-500 italic p-4">No hay producciones terminadas registradas para mostrar por semana.</p>';
    } else {
        let html = `<table class="w-full text-left border-collapse border border-gray-200 text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="p-2 border">Semana</th>
                    <th class="p-2 border">Producto</th>
                    <th class="p-2 border">Litros terminados</th>
                    <th class="p-2 border">Unidades terminadas</th>
                    <th class="p-2 border">Acciones</th>
                </tr>
            </thead>
            <tbody>`;
        weeklyRows.forEach(row => {
            html += `<tr>
                <td class="p-2 border">${row.week}</td>
                <td class="p-2 border">${row.productName}</td>
                <td class="p-2 border">${formatDecimal(row.liters)}</td>
                <td class="p-2 border">${formatDecimal(row.units)}</td>
                <td class="p-2 border"><button type="button" onclick="openWeeklyProductionHistoryEditor('${row.week}', ${row.productId})" class="text-[#005B3A] font-semibold text-sm hover:underline">Ver / Ajustar</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        productionContainer.innerHTML = html;
    }

    const weeklyEntries = productionHistory.map(hist => {
        const product = inventory.find(p => p.id === hist.productId);
        let days = hist.fermentationDays;
        if (days === undefined) {
            if (hist.startDate && hist.endDate) {
                const start = new Date(`${hist.startDate}T00:00:00`);
                const end = new Date(`${hist.endDate}T00:00:00`);
                const diffTime = Math.abs(end - start);
                days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 8;
            } else {
                days = 8;
            }
        }
        return {
            id: hist.id,
            week: getWeekLabelForEntry(hist),
            productName: product ? product.name : 'Producto desconocido',
            tankName: hist.tankName || 'Manual',
            fermentationDays: days,
            liters: hist.qtyLiters || 0,
            units: hist.qtyUnits || 0,
            endDate: hist.endDate || hist.startDate
        };
    });

    if (weeklyEntries.length === 0) {
        historyEditor.innerHTML = '<p class="text-gray-500 italic p-4">No hay registros de producción histórica para editar.</p>';
    } else {
        let html = `<div class="mb-4"><h3 class="text-lg font-bold text-gray-800">Registros de producción para ajustar</h3></div>
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="p-2 border">Semana</th>
                        <th class="p-2 border">Producto</th>
                        <th class="p-2 border">Tanque</th>
                        <th class="p-2 border">Días Ferm.</th>
                        <th class="p-2 border">Litros</th>
                        <th class="p-2 border">Unidades</th>
                        <th class="p-2 border">Fecha fin</th>
                        <th class="p-2 border">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
        weeklyEntries.forEach(entry => {
            html += `<tr>
                <td class="p-2 border">${entry.week}</td>
                <td class="p-2 border">${entry.productName}</td>
                <td class="p-2 border">${entry.tankName}</td>
                <td class="p-2 border">${entry.fermentationDays} días</td>
                <td class="p-2 border">${formatDecimal(entry.liters)}</td>
                <td class="p-2 border">${formatDecimal(entry.units)}</td>
                <td class="p-2 border">${entry.endDate}</td>
                <td class="p-2 border space-x-2">
                    <button type="button" onclick="editWeeklyProductionEntry(${entry.id})" class="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                    <button type="button" onclick="deleteWeeklyProductionEntry(${entry.id})" class="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        historyEditor.innerHTML = html;
    }

    const forecastsByWeek = forecasts.map(f => {
        const product = inventory.find(p => p.id === f.productId);
        const week = getWeekLabel(f.targetDate);
        const stock = product ? product.quantity || 0 : 0;
        const remaining = Math.max(0, f.qty - stock);
        return {
            week,
            productName: product ? product.name : 'Producto desconocido',
            forecastQty: f.qty,
            finishedStock: stock,
            remainingQty: remaining,
            targetDate: f.targetDate
        };
    });

    if (forecastsByWeek.length === 0) {
        forecastContainer.innerHTML = '<p class="text-gray-500 italic p-4">No hay pronósticos registrados para ajustar con el inventario de producto terminado.</p>';
    } else {
        let html = `<table class="w-full text-left border-collapse border border-gray-200 text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="p-2 border">Semana</th>
                    <th class="p-2 border">Producto</th>
                    <th class="p-2 border">Pronóstico</th>
                    <th class="p-2 border">Stock PT disponible</th>
                    <th class="p-2 border">Pronóstico ajustado</th>
                    <th class="p-2 border">Fecha objetivo</th>
                </tr>
            </thead>
            <tbody>`;
        forecastsByWeek.forEach(row => {
            html += `<tr>
                <td class="p-2 border">${row.week}</td>
                <td class="p-2 border">${row.productName}</td>
                <td class="p-2 border">${formatDecimal(row.forecastQty)}</td>
                <td class="p-2 border">${formatDecimal(row.finishedStock)}</td>
                <td class="p-2 border">${formatDecimal(row.remainingQty)}</td>
                <td class="p-2 border">${row.targetDate}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        forecastContainer.innerHTML = html;
    }
}

function updateWeeklyProductionProductSelect() {
    const select = document.getElementById('weekly-edit-product');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Selecciona producto --</option>';
    inventory.filter(p => p.type !== 'raw').forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.sku})`;
        select.appendChild(opt);
    });
    if (currentValue) select.value = currentValue;
}

function updateWeeklyEditTankSelect() {
    const select = document.getElementById('weekly-edit-tank');
    if (!select) return;
    const dateInput = document.getElementById('weekly-edit-date').value;
    const checkDate = dateInput || new Date().toISOString().slice(0, 10);
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Selecciona Tanque --</option>';
    
    tanks.forEach(t => {
        const isOccupied = (t.schedule || []).some(s => checkDate >= s.start && checkDate <= s.end);
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = `${t.name} (Capacidad: ${t.capacityLiters} L) - ${isOccupied ? 'Ocupado' : 'Libre'}`;
        if (isOccupied) {
            opt.className = 'text-red-600 font-semibold';
        } else {
            opt.className = 'text-green-600';
        }
        select.appendChild(opt);
    });
    if (currentValue) select.value = currentValue;
}

function resetWeeklyProductionForm() {
    document.getElementById('weekly-edit-product').value = '';
    document.getElementById('weekly-edit-date').value = '';
    document.getElementById('weekly-edit-week').value = '';
    document.getElementById('weekly-edit-tank').value = '';
    document.getElementById('weekly-edit-fermentation-days').value = '8';
    document.getElementById('weekly-edit-liters').value = '';
    document.getElementById('weekly-edit-units').value = '';
    document.getElementById('weekly-edit-id')?.remove();
    updateWeeklyEditTankSelect();
}

function getDateForWeekOffset(offset) {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff + offset * 7 + 3);
    return date.toISOString().slice(0, 10);
}

function openWeeklyProductionHistoryEditor(weekLabel, productId) {
    const entries = productionHistory.filter(hist => getWeekLabelForEntry(hist) === weekLabel && hist.productId === productId);
    if (!entries.length) return;
    const entry = entries[0];
    editWeeklyProductionEntry(entry.id);
}

function saveWeeklyProductionEntry() {
    const productId = parseInt(document.getElementById('weekly-edit-product').value);
    const dateInput = document.getElementById('weekly-edit-date').value;
    const weekSelect = document.getElementById('weekly-edit-week').value;
    const weekVal = weekSelect ? parseInt(weekSelect, 10) : null;
    const tankName = document.getElementById('weekly-edit-tank').value || 'Manual';
    const fermentationDays = parseInt(document.getElementById('weekly-edit-fermentation-days').value, 10) || 8;
    const liters = parseFloat(document.getElementById('weekly-edit-liters').value);
    const unitsInput = parseFloat(document.getElementById('weekly-edit-units').value);
    
    if (!productId || !dateInput || isNaN(liters) || liters <= 0) {
        return showNotification('Selecciona producto, fecha y cantidad válida (Litros).', 'error');
    }
    
    const product = inventory.find(p => p.id === productId);
    const unitVolume = product?.volumePerUnit || 0.33;
    const qtyUnits = !isNaN(unitsInput) && unitsInput > 0 ? unitsInput : Math.round(liters / unitVolume);

    // Calculate endDate from startDate and fermentationDays
    const start = new Date(`${dateInput}T00:00:00`);
    const end = new Date(start.getTime() + fermentationDays * 24 * 60 * 60 * 1000);
    const endDate = end.toISOString().slice(0, 10);

    const existingIdInput = document.getElementById('weekly-edit-id');
    if (existingIdInput && existingIdInput.value) {
        const entryId = parseInt(existingIdInput.value);
        const entry = productionHistory.find(hist => hist.id === entryId);
        if (entry) {
            entry.productId = productId;
            entry.qtyLiters = liters;
            entry.qtyUnits = qtyUnits;
            entry.startDate = dateInput;
            entry.endDate = endDate;
            entry.week = weekVal;
            entry.tankName = tankName;
            entry.fermentationDays = fermentationDays;
            saveData();
            refreshAppUI();
            resetWeeklyProductionForm();
            renderWeeklyProductionTab();
            showNotification('Registro de producción actualizado.', 'success');
            return;
        }
    }

    productionHistory.unshift({
        id: Date.now(),
        productId,
        qtyLiters: liters,
        qtyUnits,
        startDate: dateInput,
        endDate: endDate,
        week: weekVal,
        tankName: tankName,
        fermentationDays: fermentationDays
    });
    saveData();
    refreshAppUI();
    resetWeeklyProductionForm();
    renderWeeklyProductionTab();
    showNotification('Registro de producción semanal agregado.', 'success');
}

function editWeeklyProductionEntry(entryId) {
    const entry = productionHistory.find(hist => hist.id === entryId);
    if (!entry) return;
    document.getElementById('weekly-edit-product').value = entry.productId;
    document.getElementById('weekly-edit-date').value = entry.startDate || entry.endDate || '';
    document.getElementById('weekly-edit-week').value = entry.week || '';
    document.getElementById('weekly-edit-liters').value = formatDecimal(entry.qtyLiters);
    document.getElementById('weekly-edit-units').value = formatDecimal(entry.qtyUnits);

    // Load tank select
    updateWeeklyEditTankSelect();
    document.getElementById('weekly-edit-tank').value = entry.tankName || '';

    // Load fermentation days
    let fermentationDays = entry.fermentationDays;
    if (fermentationDays === undefined) {
        if (entry.startDate && entry.endDate) {
            const start = new Date(`${entry.startDate}T00:00:00`);
            const end = new Date(`${entry.endDate}T00:00:00`);
            const diffTime = Math.abs(end - start);
            fermentationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 8;
        } else {
            fermentationDays = 8;
        }
    }
    document.getElementById('weekly-edit-fermentation-days').value = fermentationDays;

    let hidden = document.getElementById('weekly-edit-id');
    if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = 'weekly-edit-id';
        document.body.appendChild(hidden);
    }
    hidden.value = entry.id;
}

function deleteWeeklyProductionEntry(entryId) {
    if (!confirm('¿Eliminar este registro de producción? Esta acción no se puede deshacer.')) return;
    productionHistory = productionHistory.filter(hist => hist.id !== entryId);
    saveData();
    renderWeeklyProductionTab();
    showNotification('Registro de producción eliminado.', 'success');
}

function updateWizardTankSelect() {
    const select = document.getElementById('wizard-tank');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona Tanque Libre --</option>';
    
    const todayStr = new Date().toISOString().slice(0, 10);
    tanks.forEach(t => {
        const isOccupied = (t.schedule || []).some(s => s.start <= todayStr && s.end >= todayStr);
        if (!isOccupied) {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.name} (Capacidad: ${t.capacityLiters} L)`;
            select.appendChild(opt);
        }
    });
}

function wizardCheckIngredients() {
    const prodId = parseInt(document.getElementById('wizard-product').value);
    const qty = parseFloat(document.getElementById('wizard-qty').value);
    const statusDiv = document.getElementById('wizard-mrp-status');
    
    if (!prodId || isNaN(qty) || qty <= 0) {
        statusDiv.innerHTML = '<span class="text-gray-500">Selecciona un producto y cantidad válida para verificar MRP.</span>';
        return false;
    }

    const recipe = recipes.find(r => r.productId === prodId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        statusDiv.innerHTML = '<span class="text-amber-600 font-bold"><i class="fas fa-exclamation-triangle"></i> El producto no tiene receta (BOM) definida. Ve a Configurar Recetas.</span>';
        return false;
    }

    let allAvailable = true;
    let missingItems = [];
    let html = '<ul class="space-y-1 text-sm">';
    const product = inventory.find(p => p.id === prodId);
    const totalVolume = qty; // La receta se define por unidad de volumen (L)
    const totalUnits = product && product.volumePerUnit ? (qty / product.volumePerUnit) : null;

    recipe.ingredients.forEach(ing => {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (raw) {
            const reqQty = ing.qtyPerUnit * totalVolume;
            const hasEnough = raw.quantity >= reqQty;
            if (!hasEnough) {
                allAvailable = false;
                missingItems.push({ raw, reqQty });
            }
            
            html += `<li class="${hasEnough ? 'text-green-700' : 'text-red-600 font-bold'} flex items-start justify-between gap-2">
                <span><i class="fas ${hasEnough ? 'fa-check' : 'fa-times'} mr-1"></i>
                ${raw.name}: Req. ${formatDecimal(reqQty)} (Stock: ${formatDecimal(raw.quantity)})</span>
                <button type="button" onclick="openEditProductModal(${raw.id}, ${reqQty})" class="text-blue-600 hover:text-blue-800 text-xs font-semibold rounded px-2 py-1 border border-blue-200 bg-blue-50">Editar</button>
            </li>`;
        }
    });
    if (missingItems.length > 0) {
        html = `
            <div class="mb-3">
                <label class="block text-sm font-semibold text-gray-700 mb-1">Selecciona el ingrediente faltante para revisar o ajustar</label>
                <div class="flex gap-2 mb-3 flex-wrap">
                    <select id="wizard-missing-item-select" class="p-2 border border-gray-300 rounded-md flex-1 text-sm">
                        ${missingItems.map(item => `<option value="${item.raw.id}|${item.reqQty}">${item.raw.name} — Req. ${formatDecimal(item.reqQty)} / Stock: ${formatDecimal(item.raw.quantity)}</option>`).join('')}
                    </select>
                    <button type="button" onclick="openSelectedWizardRawItem()" class="px-3 py-2 bg-[#005B3A] text-white rounded-md text-sm hover:bg-[#00422a]">Editar seleccionado</button>
                </div>
            </div>
        ` + html;
    }
    html += '</ul>';
    
    if (allAvailable) {
        html = '<div class="text-green-700 font-bold mb-2"><i class="fas fa-check-circle"></i> Hay suficiente materia prima.</div>' + html;
    } else {
        html = '<div class="text-red-600 font-bold mb-2"><i class="fas fa-times-circle"></i> Faltan ingredientes. Compra materia prima antes de iniciar.</div>' + html;
    }
    
    statusDiv.innerHTML = html;
    return allAvailable;
}

function openEditProductModal(productId, reqQty = null) {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    openAddProductModal(product.type, productId);
    const note = document.getElementById('product-demand-note');
    if (note) {
        if (reqQty != null) {
            note.classList.remove('hidden');
            note.textContent = `Cantidad requerida para esta producción: ${formatDecimal(reqQty)}`;
        } else {
            note.classList.add('hidden');
            note.textContent = '';
        }
    }
}

function openSelectedWizardRawItem() {
    const select = document.getElementById('wizard-missing-item-select');
    if (!select) return;
    const [idValue, qtyValue] = select.value.split('|');
    const rawId = parseInt(idValue);
    const reqQty = qtyValue ? parseFloat(qtyValue) : null;
    if (!rawId) return;
    openEditProductModal(rawId, reqQty);
}

function wizardStartProduction() {
    const prodId = parseInt(document.getElementById('wizard-product').value);
    const qty = parseFloat(document.getElementById('wizard-qty').value);
    const tankId = parseInt(document.getElementById('wizard-tank').value);
    
    if (!prodId || isNaN(qty) || qty <= 0 || !tankId) {
        return showNotification('Por favor, completa todos los pasos correctamente.', 'error');
    }

    const tank = tanks.find(t => t.id === tankId);
    if (qty > tank.capacityLiters) {
        return showNotification(`La cantidad (${qty}L) supera la capacidad del tanque (${tank.capacityLiters}L).`, 'error');
    }

    if (!wizardCheckIngredients()) {
        return showNotification('Stock insuficiente de materia prima. Revisa la Verificación MRP.', 'error');
    }

    // Descontar inventario
    const recipe = recipes.find(r => r.productId === prodId);
    const product = inventory.find(p => p.id === prodId);
    const totalUnits = product && product.volumePerUnit ? (qty / product.volumePerUnit) : qty;

    recipe.ingredients.forEach(ing => {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (raw) {
            raw.quantity -= (ing.qtyPerUnit * totalUnits);
        }
    });

    // Ocupar tanque
    const today = new Date();
    const fermentationDays = 8;
    const bottlingDays = 2;
    const packagingDays = 1;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + fermentationDays + bottlingDays + packagingDays);
    
    tank.schedule = tank.schedule || [];
    tank.schedule.push({
        start: today.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
        productId: prodId,
        qty: qty,
        fermentationDays,
        bottlingDays,
        packagingDays,
        fermentationEnd: addDays(today.toISOString().slice(0, 10), fermentationDays),
        bottlingEnd: addDays(addDays(today.toISOString().slice(0, 10), fermentationDays), bottlingDays),
        packagingEnd: endDate.toISOString().slice(0, 10)
    });

    saveData();
    loadInventory(); // actualiza MP
    showNotification('Producción iniciada. Tanque ocupado y materia prima descontada.', 'success');
    
    // Reset Form and Switch Tab
    document.getElementById('wizard-product').value = '';
    document.getElementById('wizard-qty').value = '';
    document.getElementById('wizard-mrp-status').innerHTML = 'Selecciona un producto y cantidad para verificar disponibilidad de materia prima.';
    
    switchProductionTab('seguimiento');
}

// -- Seguimiento (Tracking) --

function renderTrackingActive() {
    const container = document.getElementById('tracking-active-list');
    if (!container) return;
    container.innerHTML = '';
    
    const todayStr = new Date().toISOString().slice(0, 10);
    let activeFound = false;

    tanks.forEach(tank => {
        const activeIdx = (tank.schedule || []).findIndex(s => s.start <= todayStr && s.end >= todayStr);
        if (activeIdx !== -1) {
            activeFound = true;
            const schedule = tank.schedule[activeIdx];
            const prod = inventory.find(p => p.id === schedule.productId);
            
            // Calcular progreso
            const startDate = new Date(schedule.start);
            const endDate = new Date(schedule.end);
            const today = new Date();
            const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
            const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
            const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

            const div = document.createElement('div');
            div.className = 'p-4 border rounded-lg bg-amber-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4';
            div.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-bold text-amber-800 text-lg"><i class="fas fa-flask mr-2"></i> ${tank.name}</h3>
                    <p class="text-sm font-semibold text-gray-700">Producto: <span class="text-black">${prod ? prod.name : 'Desc.'}</span> (${schedule.qty} L)</p>
                    <p class="text-xs text-gray-600">Desde: ${schedule.start} | Estimado Fin: ${schedule.end}</p>
                    
                    <div class="mt-2 text-xs font-bold text-amber-700 flex justify-between">
                        <span>Progreso (${elapsedDays} de ${totalDays} días)</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="w-full bg-amber-200 rounded-full h-2 mt-1">
                      <div class="bg-amber-600 h-2 rounded-full" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <button onclick="finishProduction(${tank.id}, ${activeIdx})" class="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors shadow-md w-full md:w-auto"><i class="fas fa-flag-checkered mr-2"></i> Finalizar Ciclo</button>
                    <button onclick="deleteActiveProduction(${tank.id}, ${activeIdx})" class="px-4 py-2 mt-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200 transition-colors shadow-sm text-xs w-full"><i class="fas fa-trash-alt mr-1"></i> Cancelar</button>
                </div>
            `;
            container.appendChild(div);
        }
    });

    if (!activeFound) {
        container.innerHTML = '<p class="text-gray-500 italic p-4 text-center border rounded">No hay producciones activas en los tanques.</p>';
    }
}

function finishProduction(tankId, scheduleIdx) {
    if (!confirm('¿Seguro que deseas finalizar esta producción? El volumen se sumará al inventario y el tanque quedará libre.')) return;
    
    const tank = tanks.find(t => t.id === tankId);
    const schedule = tank.schedule[scheduleIdx];
    
    // Agregar a Bodega 1 por defecto (si existe, si no, crearla)
    let defaultWarehouse = warehouses[0];
    if (!defaultWarehouse) {
        defaultWarehouse = { id: 1, name: 'Bodega Principal', location: 'Default' };
        warehouses.push(defaultWarehouse);
    }
    
    // Calcular Lote y Unidades si es PT
    const product = inventory.find(p => p.id === schedule.productId);
    let qtyToAdd = schedule.qty;
    if (product && product.volumePerUnit) {
        qtyToAdd = Math.floor(schedule.qty / product.volumePerUnit); // Convertir Litros a Unidades
    }
    
    // Crear batch (Lote) en inventario
    createBatch({
        productId: schedule.productId,
        warehouseId: defaultWarehouse.id,
        lot: `L-${Date.now().toString().slice(-6)}`,
        qty: qtyToAdd,
        manufactureDate: new Date().toISOString().slice(0, 10)
    });
    
    // Añadir al historial
    productionHistory.unshift({
        id: Date.now(),
        productId: schedule.productId,
        qtyLiters: schedule.qty,
        qtyUnits: qtyToAdd,
        startDate: schedule.start,
        endDate: new Date().toISOString().slice(0, 10),
        tankName: tank.name
    });
    
    // Quitar del tanque
    tank.schedule.splice(scheduleIdx, 1);
    
    saveData();
    renderTrackingActive();
    renderTrackingHistory();
    loadTanks(); // Refresh visual tanks if active
    showNotification('Producción finalizada. Tanque liberado e inventario actualizado.', 'success');
}

function deleteActiveProduction(tankId, scheduleIdx) {
    if (!confirm('ATENCIÓN: ¿Deseas CANCELAR esta producción? Se vaciará el tanque pero NO se recuperará la materia prima.')) return;
    const tank = tanks.find(t => t.id === tankId);
    tank.schedule.splice(scheduleIdx, 1);
    saveData();
    renderTrackingActive();
    loadTanks();
    showNotification('Producción cancelada y tanque liberado.', 'info');
}

function deleteTrackingHistoryEntry(entryId) {
    if (!confirm('¿Seguro quieres eliminar este registro del historial de producción?')) return;
    productionHistory = productionHistory.filter(hist => hist.id !== entryId);
    saveData();
    renderTrackingHistory();
    if (document.getElementById('tab-semanal') && !document.getElementById('tab-semanal').classList.contains('hidden')) {
        renderWeeklyProductionTab();
    }
    showNotification('Registro eliminado del historial.', 'success');
}

function renderTrackingHistory() {
    const container = document.getElementById('tracking-history-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!productionHistory || productionHistory.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic p-4 text-center border rounded">No hay historial de producciones terminadas.</p>';
        return;
    }

    productionHistory.forEach(hist => {
        const prod = inventory.find(p => p.id === hist.productId);
        const div = document.createElement('div');
        div.className = 'p-3 border-b border-gray-100 hover:bg-gray-50 text-sm flex justify-between items-center';
        div.innerHTML = `
            <div>
                <span class="font-bold text-gray-800">${prod ? prod.name : 'Prod.'}</span>
                <span class="text-gray-500 ml-2">(${hist.qtyLiters}L &rarr; ${hist.qtyUnits} und)</span>
                <div class="text-xs text-gray-400 mt-1">Tanque: ${hist.tankName} | ${hist.startDate} al ${hist.endDate}</div>
            </div>
            <div class="flex items-center gap-2">
                <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Completado</span>
                <button onclick="deleteTrackingHistoryEntry(${hist.id})" class="text-red-600 hover:text-red-800 p-1" title="Eliminar del historial"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

