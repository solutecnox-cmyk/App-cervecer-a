// --- Estado de la Aplicación ---
const STORAGE_KEY = 'erpState';
const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

let clients = savedState.clients || JSON.parse(localStorage.getItem('clients')) || [];
let inventory = savedState.inventory || JSON.parse(localStorage.getItem('inventory')) || [];
let cart = [];
let selectedProductId = null; // Para el buscador de productos en POS
let suppliers = savedState.suppliers || JSON.parse(localStorage.getItem('suppliers')) || [];

function formatDecimal(value, digits = 8) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return num.toFixed(digits).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}

function getLocalDateStr(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Litros por botella 330 mL — 145 L ≈ 442 bot, 99 L ≈ 300 bot */
const LITERS_PER_BOTTLE = 0.328;
const DEFAULT_WEEKLY_CAPACITY_L = 720;

function litersToBottles(liters) {
    const n = Number(liters);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n / LITERS_PER_BOTTLE);
}

function getProductVolumePerUnit(product) {
    return product?.volumePerUnit || LITERS_PER_BOTTLE;
}

function getWeekIndexFromToday(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date)) return 0;
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
}

function getFinishedProductStockLiters(productId) {
    const product = inventory.find(p => p.id === productId);
    if (!product || product.type === 'raw') return 0;
    return (product.quantity || 0) * getProductVolumePerUnit(product);
}

function getWeeklyForecastLitersForPlanning() {
    if (weeklyDemandOverridesActive) {
        return customWeeklyForecastLiters.map(v => Number(v) || 0);
    }
    return computeWeeklyDemandFromOrders().forecastL;
}

function getWeeklyBarrilLitersForPlanning() {
    if (weeklyDemandOverridesActive) {
        return customWeeklyBarrilDemand.map(v => Number(v) || 0);
    }
    return computeWeeklyDemandFromOrders().barril;
}

let warehouses = savedState.warehouses || JSON.parse(localStorage.getItem('warehouses')) || [];
let batches = savedState.batches || JSON.parse(localStorage.getItem('batches')) || []; // cada batch: {id, productId, warehouseId, lot, quantity, manufactureDate, createdAt}

// Producción: pedidos firmes, pronósticos, recetas (BOM), tanques y órdenes de compra
let orders = savedState.orders || JSON.parse(localStorage.getItem('orders')) || []; // {id, productId, qty, dueDate, createdAt}
let forecasts = savedState.forecasts || JSON.parse(localStorage.getItem('forecasts')) || []; // {id, productId, qty, targetDate}

let defaultRecipes = [
    {
        "productId": 201,
        "ingredients": [
            { "ingredientProductId": 101, "qtyPerUnit": 0.225 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.00496 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000670833 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    },
    {
        "productId": 202,
        "ingredients": [
            { "ingredientProductId": 101, "qtyPerUnit": 0.217 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.0045 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000670833 },
            { "ingredientProductId": 107, "qtyPerUnit": 0.045833333 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    },
    {
        "productId": 203,
        "ingredients": [
            { "ingredientProductId": 102, "qtyPerUnit": 0.2 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.001375 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000575 },
            { "ingredientProductId": 107, "qtyPerUnit": 0.0375 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    },
    {
        "productId": 204,
        "ingredients": [
            { "ingredientProductId": 102, "qtyPerUnit": 0.183 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.00138 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000575 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    },
    {
        "productId": 205,
        "ingredients": [
            { "ingredientProductId": 103, "qtyPerUnit": 0.233 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.001125 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000670833 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    },
    {
        "productId": 206,
        "ingredients": [
            { "ingredientProductId": 104, "qtyPerUnit": 0.192 },
            { "ingredientProductId": 105, "qtyPerUnit": 0.001 },
            { "ingredientProductId": 106, "qtyPerUnit": 0.000575 },
            { "ingredientProductId": 108, "qtyPerUnit": 3 },
            { "ingredientProductId": 109, "qtyPerUnit": 3 },
            { "ingredientProductId": 110, "qtyPerUnit": 3.1667 }
        ]
    }
];

let recipes = savedState.recipes || JSON.parse(localStorage.getItem('recipes')) || defaultRecipes;
let editingRecipeProductId = null;
let editingTankId = null;
let editingNewProductId = null;
let editingProductId = null;
let tanks = savedState.tanks || JSON.parse(localStorage.getItem('tanks')) || [];
let purchaseOrders = savedState.purchaseOrders || JSON.parse(localStorage.getItem('purchaseOrders')) || [];
let productionHistory = savedState.productionHistory || JSON.parse(localStorage.getItem('productionHistory')) || [];
let weekCalculationMode = savedState.weekCalculationMode || 'month';
let customWeeklyCapacities = savedState.customWeeklyCapacities || [720, 720, 720, 720];
let customWeeklyBarrilDemand = savedState.customWeeklyBarrilDemand || [0, 0, 0, 0];
let customWeeklyForecastLiters = savedState.customWeeklyForecastLiters || [0, 0, 0, 0];
let customWeeklyOverflowBottles = savedState.customWeeklyOverflowBottles || [0, 0, 0, 0];
let customWeeklyOverflowLiters = savedState.customWeeklyOverflowLiters || [0, 0, 0, 0];
let weeklyDemandOverridesActive = savedState.weeklyDemandOverridesActive || false;


// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    if (inventory.length === 0) {
        seedSampleData();
    }
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
    renderNotificationBell();
    showSection('produccion');
    switchProductionTab('semanal');
});

function confirmResetSampleData() {
    if (confirm('¿Estás seguro de que deseas cargar los datos de ejemplo? Esto reemplazará los datos actuales de inventario, recetas, proveedores, clientes, tanques y órdenes.')) {
        seedSampleData();
        refreshAppUI();
    }
}

function seedSampleData() {
    suppliers = [
        { id: 1, type: 'empresa', nit: '900.000.001-1', name: 'Proveedor Bogotá', phone: '3001111111', email: 'bogota@proveedor.com' },
        { id: 2, type: 'empresa', nit: '900.000.002-2', name: 'Proveedor Armenia', phone: '3002222222', email: 'armenia@proveedor.com' }
    ];

    inventory = [
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
        { id: 201, type: 'final', sku: 'PT-IPA-P', name: 'IPA Pijao', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE },
        { id: 202, type: 'final', sku: 'PT-IPA-H', name: 'IPA Honey', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE },
        { id: 203, type: 'final', sku: 'PT-HGA', name: 'Honey Golden Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE },
        { id: 204, type: 'final', sku: 'PT-GOL', name: 'Golden Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE },
        { id: 205, type: 'final', sku: 'PT-POR', name: 'Porter', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE },
        { id: 206, type: 'final', sku: 'PT-IRA', name: 'Iris Red Ale', price: 10000, supplierId: null, quantity: 50, volumePerUnit: LITERS_PER_BOTTLE }
    ];

    recipes = JSON.parse(JSON.stringify(defaultRecipes));

    clients = [
        { id: 1, numDoc: '900111', razonSocial: 'Bar Armenia', nombreComercial: 'Gastrobar AR', ciudad: 'Armenia', correo: 'contacto@bararmenia.com' },
        { id: 2, numDoc: '900222', razonSocial: 'Bar Manizales', nombreComercial: 'Gastrobar MZ', ciudad: 'Manizales', correo: 'contacto@barmanizales.com' }
    ];

    warehouses = [
        { id: 1, name: 'Bodega Principal', location: 'Planta Alta' },
        { id: 2, name: 'Bodega Frío', location: 'Sótano' }
    ];
    batches = [
        { id: 1, productId: 201, warehouseId: 1, lot: 'L-001', quantity: 20, manufactureDate: getLocalDateStr(), createdAt: new Date().toISOString() },
        { id: 2, productId: 202, warehouseId: 2, lot: 'L-002', quantity: 30, manufactureDate: getLocalDateStr(), createdAt: new Date().toISOString() }
    ];

    orders = [
        { id: 1, productId: 201, qty: 10, dueDate: getLocalDateStr(), createdAt: new Date().toISOString() }
    ];
    forecasts = [
        { id: 1, productId: 203, qty: 50, targetDate: getLocalDateStr() }
    ];
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 2);
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 5);

    tanks = [
        {
            id: 1,
            name: 'Tanque Fermentador 1',
            capacityLiters: 1000,
            schedule: []
        },
        { id: 2, name: 'Tanque Maduración 1', capacityLiters: 1000, schedule: [] }
    ];

    saveData();
    showNotification('Datos iniciales del modelo de Cervecería B&E cargados correctamente.', 'success');
}

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
        volumeHelp.textContent = 'Ej: 0.328 para botella 330 mL — se usa en cálculos de planeación (MPS/MRP).';
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

function openProductCreatedModal(id) {
    const prod = inventory.find(p => p.id === id);
    if (!prod) return;
    document.getElementById('product-created-sku').value = prod.sku || '';
    document.getElementById('product-created-name').value = prod.name || '';
    document.getElementById('product-created-price').value = prod.price || 0;
    document.getElementById('product-created-volume').value = prod.volumePerUnit || LITERS_PER_BOTTLE;
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
    prod.price = parseFloat(document.getElementById('product-created-price').value) || 0;
    prod.volumePerUnit = parseFloat(document.getElementById('product-created-volume').value) || prod.volumePerUnit || LITERS_PER_BOTTLE;
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
    loadMRP();
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
    if (!product) return;

    const input = prompt(`Ajustar inventario de ${product.name}.\nCantidad actual: ${product.quantity}\nIngresa el valor a SUMAR o RESTAR (ej: 5 para sumar, -2 para restar):`, "0");
    if (input !== null && input.trim() !== "") {
        const qty = parseFloat(input);
        if (!isNaN(qty)) {
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
    const product = inventory.find(p => p.id ===
