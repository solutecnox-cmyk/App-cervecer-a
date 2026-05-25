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
    const product = inventory.find(p => p.id === productId);
    if (product) {
        product.quantity += qty;
        saveData();
        loadInventory();
        showNotification(`Se reabastecieron ${qty} unidades de ${product.name}`, 'success');
        runProductionFlow();
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
        const whBatches = batches.filter(b => b.warehouseId === w.id && b.quantity > 0);

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
    const manufactureDate = document.getElementById('batch-manufacture-date').value || getLocalDateStr();
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

    const prod = inventory.find(p => p.id === productId);
    if (prod) {
        prod.quantity = (prod.quantity || 0) + qty;
    }
    saveData();
    refreshAppUI();
    showNotification('Lote registrado y stock actualizado.', 'success');
}

function loadBatches() {
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
    updateOrderProductSelect();
}

// --- Orders & Forecasts ---
function addOrderFromUI() {
    const productId = parseInt(document.getElementById('order-product-select').value);
    const qty = parseFloat(document.getElementById('order-qty').value) || 0;
    const date = document.getElementById('order-date').value || getLocalDateStr();
    if (!productId || qty <= 0) return showNotification('Completa producto y cantidad para el pedido.', 'error');
    orders.push({ id: Date.now(), productId, qty, dueDate: date, createdAt: new Date().toISOString() });
    saveData();
    refreshAppUI();
    showNotification('Pedido registrado.', 'success');
}

function addForecastFromUI() {
    const productId = parseInt(document.getElementById('order-product-select').value);
    const qty = parseFloat(document.getElementById('order-qty').value) || 0;
    const targetDate = document.getElementById('order-date').value || getLocalDateStr();
    if (!productId || qty <= 0) return showNotification('Completa producto y cantidad para el pronóstico.', 'error');
    forecasts.push({ id: Date.now(), productId, qty, targetDate });
    saveData();
    refreshAppUI();
    showNotification('Pronóstico agregado.', 'success');
}

function loadOrders() {
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
        addIngredientRow();
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

    let prod = inventory.find(p => p.name.toLowerCase() === productName.toLowerCase());
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
            volumePerUnit: LITERS_PER_BOTTLE,
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

    const todayStr = getLocalDateStr();

    tanks.forEach(tank => {
        let statusBgColor = 'bg-[#005B3A]';
        let statusText = 'Libre';

        let activeSchedule = (tank.schedule || []).find(s => {
            return s.start <= todayStr;
        });

        if (activeSchedule) {
            const prod = inventory.find(p => p.id === activeSchedule.productId);
            const isOverdue = todayStr > activeSchedule.end;
            if (isOverdue) {
                statusBgColor = 'bg-green-600';
                statusText = `Listo:<br>${prod ? prod.name : 'Prod.'}`;
            } else {
                statusBgColor = 'bg-amber-500';
                statusText = `Fermentando:<br>${prod ? prod.name : 'Prod.'}`;
            }
        } else {
            const futureSchedule = (tank.schedule || []).find(s => s.start > todayStr);
            if (futureSchedule) {
                const prod = inventory.find(p => p.id === futureSchedule.productId);
                statusBgColor = 'bg-blue-500';
                statusText = `Reservado:<br>${prod ? prod.name : 'Prod.'}`;
                activeSchedule = futureSchedule;
            }
        }

        const div = document.createElement('div');
        div.className = 'relative flex flex-col items-center group cursor-pointer';
        div.innerHTML = `
            <svg viewBox="0 0 100 150" class="w-24 h-36 drop-shadow-md">
                <rect x="25" y="110" width="4" height="30" fill="#9ca3af"/>
                <rect x="71" y="110" width="4" height="30" fill="#9ca3af"/>
                <line x1="25" y1="130" x2="75" y2="130" stroke="#9ca3af" stroke-width="2"/>
                <path d="M15,20 L85,20 L85,90 L55,120 L45,120 L15,90 Z" fill="#e5e7eb" stroke="#6b7280" stroke-width="2"/>
                <path d="M15,20 Q50,-5 85,20 Z" fill="#d1d5db" stroke="#6b7280" stroke-width="2"/>
                <path d="M50,120 L50,135 L60,135" fill="none" stroke="#6b7280" stroke-width="3"/>
            </svg>
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
                ${activeSchedule ? `
                    <div class="mt-1 font-semibold text-gray-700">
                        ${activeSchedule.start > todayStr ? `Inicia: ${activeSchedule.start}` : todayStr > activeSchedule.end ? '<span class="text-green-600">Listo para Finalizar</span>' : `Fin: ${activeSchedule.end}`}
                    </div>
                ` : ''}
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
    out.innerHTML = '<div class="text-blue-600 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Calculando Plan Maestro de Producción y Requerimientos...</div>';

    const mpsContainer = document.getElementById('mps-table-container');
    const mrpContainer = document.getElementById('mrp-table-container');
    const kpiContainer = document.getElementById('kpi-container');

    const finalProducts = inventory.filter(p => p.type !== 'raw');
    const rawMaterials = inventory.filter(p => p.type === 'raw');

    // Parámetros del Sistema
    const LITROS_POR_LOTE = 120;
    const MAX_TANQUES_SEMANA = 6;

    const scheduledProduction = {};
    const scheduleEntries = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    const demandBarril = {};
    const demandBotellas = {};
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

    const getWeekIndexForHistoryEntry = (hist) => {
        if (hist.week !== null && hist.week !== undefined && hist.week >= 1 && hist.week <= 4) {
            return hist.week - 1;
        }
        return getWeekIndexFromDate(hist.startDate || hist.endDate);
    };

    orders.forEach(o => {
        const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        if (demandBarril[o.productId]) {
            const prod = inventory.find(p => p.id === o.productId);
            const volume = o.qty * getProductVolumePerUnit(prod);
            demandBarril[o.productId][w] += volume;
        }
    });

    forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        if (demandBotellas[f.productId]) {
            demandBotellas[f.productId][w] += f.qty;
            weeklyForecastBottles[w] += f.qty;
            const prod = inventory.find(p => p.id === f.productId);
            weeklyForecastLiters[w] += f.qty * getProductVolumePerUnit(prod);
        }
    });

    for (let w = 0; w < 4; w++) {
        weeklyBarrilDemand[w] = finalProducts.reduce((sum, p) => sum + demandBarril[p.id][w], 0);
    }

    productionHistory.forEach(hist => {
        const wIdx = getWeekIndexForHistoryEntry(hist);
        if (wIdx >= 0 && wIdx <= 3) {
            weeklyBarrilDemand[wIdx] += hist.fixedOrders || 0;
            weeklyOverflowBottles[wIdx] += hist.overflowBottles || 0;
            const prod = inventory.find(p => p.id === hist.productId);
            weeklyOverflowLiters[wIdx] += (hist.overflowBottles || 0) * getProductVolumePerUnit(prod);
        }
    });

    if (weeklyDemandOverridesActive) {
        for (let w = 0; w < 4; w++) {
            weeklyBarrilDemand[w] = Number(customWeeklyBarrilDemand[w]) || 0;
            weeklyForecastLiters[w] = Number(customWeeklyForecastLiters[w]) || 0;
        }
    } else {
        for (let w = 0; w < 4; w++) {
            if (customWeeklyBarrilDemand[w] > 0) weeklyBarrilDemand[w] = customWeeklyBarrilDemand[w];
            if (customWeeklyForecastLiters[w] > 0) weeklyForecastLiters[w] = customWeeklyForecastLiters[w];
        }
    }

    for (let w = 0; w < 4; w++) {
        if (customWeeklyOverflowLiters[w] > 0) {
            weeklyOverflowLiters[w] = customWeeklyOverflowLiters[w];
        } else if (customWeeklyOverflowBottles[w] > 0) {
            weeklyOverflowLiters[w] = customWeeklyOverflowBottles[w] * LITERS_PER_BOTTLE;
        }
    }

    // Inventario inicial PT en litros
    const initialInvLiters = finalProducts.reduce(
        (sum, p) => sum + (p.quantity * getProductVolumePerUnit(p)), 0
    );
    const weeklyDemandTotal = [0, 1, 2, 3].map(w => weeklyBarrilDemand[w] + weeklyForecastLiters[w]);

    const weeklyInventoryInitial = [0, 0, 0, 0];
    const weeklyInventoryFinal = [0, 0, 0, 0];
    const weeklyForecastProduction = [0, 0, 0, 0];
    const weeklyTotalProduction = [0, 0, 0, 0];
    const weeklyBalance = [0, 0, 0, 0];
    const weeklyDeficit = [false, false, false, false];
    const weeklyCapacityUtilization = [0, 0, 0, 0];
    const weeklyForecastCoversDemand = [false, false, false, false];

    let rollingInv = initialInvLiters;
    for (let w = 0; w < 4; w++) {
        weeklyInventoryInitial[w] = rollingInv;
        const produccionBase = weeklyBarrilDemand[w] + weeklyOverflowLiters[w];
        const demanda = weeklyDemandTotal[w];
        const capSemana = customWeeklyCapacities[w] || DEFAULT_WEEKLY_CAPACITY_L;

        if ((produccionBase + rollingInv) >= demanda) {
            weeklyForecastProduction[w] = 0;
            weeklyForecastCoversDemand[w] = demanda > 0;
        } else {
            weeklyForecastProduction[w] = Math.max(0, demanda - (produccionBase + rollingInv));
            weeklyForecastCoversDemand[w] = false;
        }

        weeklyTotalProduction[w] = produccionBase + weeklyForecastProduction[w];
        weeklyInventoryFinal[w] = Math.max(0, rollingInv + weeklyTotalProduction[w] - demanda);
        weeklyBalance[w] = weeklyInventoryFinal[w] - rollingInv;
        weeklyDeficit[w] = weeklyTotalProduction[w] > capSemana;
        weeklyCapacityUtilization[w] = capSemana > 0
            ? Math.round((weeklyTotalProduction[w] / capSemana) * 1000) / 10
            : 0;
        rollingInv = weeklyInventoryFinal[w];
    }

    // 2. Calcular MPS
    let totalLiters = 0;
    let totalBottlesGen = 0;
    let lotesPorSemana = [0, 0, 0, 0];
    const mpsPlan = {};
    const invProjectedPT = {};

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
    });

    productionHistory.forEach(hist => {
        if (hist.isActive === true) return;
        const wIdx = getWeekIndexForHistoryEntry(hist);
        if (wIdx >= 0 && wIdx <= 3 && mpsPlan[hist.productId]) {
            mpsPlan[hist.productId][wIdx] += hist.qtyLiters || 0;
            weeklyProducedLiters[wIdx] += hist.qtyLiters || 0;
        }
    });

    tanks.forEach(tank => {
        (tank.schedule || []).forEach(schedule => {
            const wIdx = getWeekIndexFromDate(schedule.start);
            if (wIdx >= 0 && wIdx <= 3 && mpsPlan[schedule.productId]) {
                mpsPlan[schedule.productId][wIdx] += schedule.qty || 0;
                weeklyProducedLiters[wIdx] += schedule.qty || 0;
            }
        });
    });

    finalProducts.forEach(p => {
        let currentBotellas = p.quantity;
        let pmpDetails = [];

        for (let w = 0; w < 4; w++) {
            const unitVolume = getProductVolumePerUnit(p);
            const litrosProducir = mpsPlan[p.id][w];
            const producedUnits = Math.round(litrosProducir / unitVolume);

            let detail = "";
            if (w < 2) {
                const demandaL = demandBarril[p.id][w];
                const overflowLitros = Math.max(0, litrosProducir - demandaL);
                const overflowBotellas = Math.floor(overflowLitros / unitVolume);
                currentBotellas += overflowBotellas;
                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Demanda: ${formatDecimal(demandaL)} L<br>Overflow: +${formatDecimal(overflowBotellas)} bot</span>`;
            } else {
                currentBotellas += producedUnits;
                const demandaB = demandBotellas[p.id][w];
                currentBotellas -= demandaB;
                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Demanda: ${formatDecimal(demandaB)} bot<br>Inv. Fin: ${formatDecimal(currentBotellas)} bot</span>`;
            }

            invProjectedPT[p.id][w] = currentBotellas;
            lotesPorSemana[w] += Math.ceil(litrosProducir / LITROS_POR_LOTE);
            totalLiters += litrosProducir;
            pmpDetails.push(detail);
        }

        mpsHtml += `<tr>
            <td class="p-2 border font-semibold">${p.name}</td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50" onclick="editPlanningDemand(${p.id}, 0)">${pmpDetails[0]}</td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50" onclick="editPlanningDemand(${p.id}, 1)">${pmpDetails[1]}</td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50" onclick="editPlanningDemand(${p.id}, 2)">${pmpDetails[2]}</td>
            <td class="p-2 border text-center cursor-pointer hover:bg-green-50" onclick="editPlanningDemand(${p.id}, 3)">${pmpDetails[3]}</td>
            <td class="p-2 border text-center font-bold">${mpsPlan[p.id].reduce((a, b) => a + b, 0)} L</td>
        </tr>`;
    });

    mpsHtml += `<tr class="bg-gray-100">
        <td class="p-2 border font-bold text-right text-gray-600">Lotes a Iniciar (CRP):</td>`;
    let isOverCapacity = false;
    for (let w = 0; w < 4; w++) {
        let l = lotesPorSemana[w];
        const maxTanksThisWeek = customWeeklyCapacities[w] / LITROS_POR_LOTE;
        let alertClass = l > maxTanksThisWeek ? 'text-red-600 font-bold bg-red-100' : 'text-green-600 font-bold';
        if (l > maxTanksThisWeek) isOverCapacity = true;
        mpsHtml += `<td class="p-2 border text-center ${alertClass}">${l} / ${maxTanksThisWeek} Tanques</td>`;
    }
    mpsHtml += `<td class="p-2 border"></td></tr></tbody></table>`;

    if (isOverCapacity) {
        mpsHtml = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 font-bold">
            <i class="fas fa-exclamation-triangle"></i> ALERTA CRÍTICA: Se ha excedido la capacidad máxima de producción.
        </div>` + mpsHtml;
    }

    if (mpsContainer) mpsContainer.innerHTML = mpsHtml;

    // 3. Calcular MRP
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

        for (let w = 0; w < 4; w++) {
            let reqBruto = 0;
            finalProducts.forEach(p => {
                const recipe = recipes.find(r => r.productId === p.id);
                if (recipe) {
                    const ing = recipe.ingredients.find(i => i.ingredientProductId === rm.id);
                    if (ing) {
                        reqBruto += ing.qtyPerUnit * mpsPlan[p.id][w];
                    }
                }
            });

            let invProyectado = inv - reqBruto;
            let reqNeto = 0;
            let ordenLanzada = 0;
            let aPedirEn = "";

            if (invProyectado <= rm.safetyStock) {
                reqNeto = rm.safetyStock - invProyectado + reqBruto;
                ordenLanzada = Math.ceil(reqNeto / rm.purchaseUnit) * rm.purchaseUnit;
                invProyectado += ordenLanzada;

                let dt = rm.leadTime;
                let semanaLanzamiento = (w + 1) - dt;

                if (semanaLanzamiento <= 0) {
                    aPedirEn = `<div class="mt-1 text-[10px] bg-red-100 text-red-800 p-1 rounded font-bold">¡URGENTE! ${ordenLanzada.toFixed(0)}</div>
                    <button onclick="quickRestock(${rm.id}, ${ordenLanzada})" class="w-full text-[10px] bg-blue-500 text-white py-0.5 px-1 rounded font-bold"><i class="fas fa-truck-loading"></i> Recargar</button>`;
                } else {
                    aPedirEn = `<div class="mt-1 text-[10px] bg-amber-100 text-amber-800 p-1 rounded font-bold">Pedir Sem ${semanaLanzamiento}: ${ordenLanzada.toFixed(0)}</div>
                    <button onclick="quickRestock(${rm.id}, ${ordenLanzada})" class="w-full text-[10px] bg-blue-500 text-white py-0.5 px-1 rounded font-bold"><i class="fas fa-truck-loading"></i> Recargar</button>`;
                }
            }

            cellsHtml += `<td class="p-2 border text-center text-xs">
                Req: <span class="text-red-600">${formatDecimal(reqBruto)}</span><br>
                Inv: <span class="text-blue-600">${formatDecimal(invProyectado)}</span>
                ${aPedirEn}
            </td>`;
            inv = invProyectado;
        }

        mrpHtml += `<tr>
            <td class="p-2 border font-semibold">${rm.name}</td>
            <td class="p-2 border text-center bg-gray-50 font-bold">${formatDecimal(rm.quantity)}</td>
            ${cellsHtml}
        </tr>`;
    });
    mrpHtml += `</tbody></table>`;

    if (mrpContainer) mrpContainer.innerHTML = mrpHtml;

    const volumeTable = document.getElementById('production-volume-table');
    const weeklyVolumeTable = document.getElementById('weekly-volume-table-container');
    const demandTable = document.getElementById('production-demand-table');

    // 4. Renderizar Tabla de Volúmenes
    if (volumeTable || weeklyVolumeTable) {
        const barrilTotal = weeklyBarrilDemand.reduce((a, b) => a + b, 0);
        const overflowTotalLiters = weeklyOverflowLiters.reduce((a, b) => a + b, 0);
        const forecastProdTotal = weeklyForecastProduction.reduce((a, b) => a + b, 0);
        const producedTotal = weeklyTotalProduction.reduce((a, b) => a + b, 0);
        const pctRow = (val) => Math.round((val / (producedTotal || 1)) * 100);

        const forecastCell = (w) => {
            if (weeklyForecastCoversDemand[w]) {
                return `<td class="p-2 border text-center text-blue-600 font-semibold" title="Inventario cubre la demanda">Inv. cubre demanda</td>`;
            }
            return `<td class="p-2 border text-center">${formatDecimal(weeklyForecastProduction[w])} L</td>`;
        };

        const tableHtml = `
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-[#1a1a2e] text-white">
                    <tr>
                        <th class="p-2 border">Concepto</th>
                        <th class="p-2 border text-center">Semana 1</th>
                        <th class="p-2 border text-center">Semana 2</th>
                        <th class="p-2 border text-center">Semana 3</th>
                        <th class="p-2 border text-center">Semana 4</th>
                        <th class="p-2 border text-center bg-[#005B3A]">Total Mes</th>
                        <th class="p-2 border text-center">%</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold text-[13px]">🔵 Pedidos Fijos — Barril (L)</td>
                        ${[0, 1, 2, 3].map(w => `<td class="p-2 border text-center">${formatDecimal(weeklyBarrilDemand[w])} L</td>`).join('')}
                        <td class="p-2 border text-center font-bold bg-green-50">${formatDecimal(barrilTotal)} L</td>
                        <td class="p-2 border text-center font-semibold">${pctRow(barrilTotal)}%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold text-[13px]">🟠 Overflow Embotellado (L)</td>
                        ${[0, 1, 2, 3].map(w => `<td class="p-2 border text-center">${formatDecimal(weeklyOverflowLiters[w])} L</td>`).join('')}
                        <td class="p-2 border text-center font-bold bg-green-50">${formatDecimal(overflowTotalLiters)} L</td>
                        <td class="p-2 border text-center font-semibold">${pctRow(overflowTotalLiters)}%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold text-[13px]">🟢 Producción según pronóstico (L)</td>
                        ${[0, 1, 2, 3].map(w => forecastCell(w)).join('')}
                        <td class="p-2 border text-center font-bold bg-green-50">${formatDecimal(forecastProdTotal)} L</td>
                        <td class="p-2 border text-center font-semibold">${pctRow(forecastProdTotal)}%</td>
                    </tr>
                    <tr class="bg-[#1a1a2e] text-white">
                        <td class="p-2 border font-bold text-sm">⚡ PRODUCCIÓN TOTAL PLANIFICADA (L)</td>
                        ${[0, 1, 2, 3].map(w => `<td class="p-2 border text-center">${formatDecimal(weeklyTotalProduction[w])} L</td>`).join('')}
                        <td class="p-2 border text-center font-bold bg-[#005B3A]">${formatDecimal(producedTotal)} L</td>
                        <td class="p-2 border text-center font-bold">100%</td>
                    </tr>
                    <tr class="bg-blue-50">
                        <td class="p-2 border font-semibold text-[13px] text-blue-900">📊 Litros producidos (plan)</td>
                        ${[0, 1, 2, 3].map(w => `<td class="p-2 border text-center font-bold text-blue-800">${formatDecimal(weeklyTotalProduction[w])} L</td>`).join('')}
                        <td class="p-2 border text-center font-bold text-blue-800">${formatDecimal(producedTotal)} L</td>
                        <td class="p-2 border text-center font-bold">100%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold text-[13px]">⚙️ % Utilización capacidad</td>
                        ${[0, 1, 2, 3].map(w => `<td class="p-2 border text-center font-semibold ${weeklyCapacityUtilization[w] > 100 ? 'text-red-600' : 'text-blue-700'}">${weeklyCapacityUtilization[w]}%</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${weeklyCapacityUtilization.reduce((a, b) => a + b, 0) > 0 ? Math.round((producedTotal / (customWeeklyCapacities.reduce((a, b) => a + b, 0) || 1)) * 100) : 0}%</td>
                        <td class="p-2 border text-center text-gray-500 text-xs">Cap. ${DEFAULT_WEEKLY_CAPACITY_L} L/sem</td>
                    </tr>
                </tbody>
            </table>
        `;
        if (volumeTable) volumeTable.innerHTML = tableHtml;
        if (weeklyVolumeTable) weeklyVolumeTable.innerHTML = tableHtml;
    }

    const initialInvTable = document.getElementById('production-initial-inventory-table');
    if (initialInvTable) {
        let totalUnits = 0;
        let totalLitersInv = 0;
        let rowsHtml = finalProducts.map(p => {
            const units = p.quantity || 0;
            const liters = units * getProductVolumePerUnit(p);
            const bottles = litersToBottles(liters);
            totalUnits += units;
            totalLitersInv += liters;
            return `<tr>
                <td class="p-2 border font-semibold">${p.name}</td>
                <td class="p-2 border text-center">${p.sku || '—'}</td>
                <td class="p-2 border text-center">${formatDecimal(units)}</td>
                <td class="p-2 border text-center">${formatDecimal(liters)} L</td>
                <td class="p-2 border text-center">${bottles} bot</td>
            </tr>`;
        }).join('');

        initialInvTable.innerHTML = `
            <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                <thead class="bg-[#005B3A] text-white">
                    <tr>
                        <th class="p-2 border">Producto terminado</th>
                        <th class="p-2 border text-center">SKU</th>
                        <th class="p-2 border text-center">Unidades en stock</th>
                        <th class="p-2 border text-center">Litros</th>
                        <th class="p-2 border text-center">Botellas</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="5" class="p-4 text-center text-gray-500 italic">Sin productos terminados en inventario.</td></tr>'}
                    <tr class="bg-gray-100 font-bold">
                        <td class="p-2 border text-right" colspan="2">TOTAL INVENTARIO INICIAL</td>
                        <td class="p-2 border text-center">${formatDecimal(totalUnits)}</td>
                        <td class="p-2 border text-center text-[#005B3A]">${formatDecimal(totalLitersInv)} L</td>
                        <td class="p-2 border text-center text-[#005B3A]">${litersToBottles(totalLitersInv)} bot</td>
                    </tr>
                </tbody>
            </table>
            <p class="text-xs text-gray-500 mt-2">Base para la proyección de las 4 semanas. Semana 1 inicia con <strong>${formatDecimal(initialInvLiters)} L</strong> (${litersToBottles(initialInvLiters)} bot) consolidados.</p>
        `;
    }

    if (demandTable) {
        const barrilTotal = weeklyBarrilDemand.reduce((a, b) => a + b, 0);
        const forecastTotal = weeklyForecastLiters.reduce((a, b) => a + b, 0);
        const totalDemand = barrilTotal + forecastTotal;
        const pctDemand = (val) => Math.round((val / (totalDemand || 1)) * 100);
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
                        <td class="p-2 border text-center font-semibold">${pctDemand(barrilTotal)}%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Pronósticos (L)</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${formatDecimal(v)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(forecastTotal)}</td>
                        <td class="p-2 border text-center font-semibold">${pctDemand(forecastTotal)}%</td>
                    </tr>
                    <tr class="font-bold bg-[#f8fafc]">
                        <td class="p-2 border font-semibold">TOTAL (L)</td>
                        ${weeklyBarrilDemand.map((_, i) => `<td class="p-2 border text-center">${formatDecimal(weeklyBarrilDemand[i] + weeklyForecastLiters[i])}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${formatDecimal(totalDemand)}</td>
                        <td class="p-2 border text-center font-semibold">100%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    if (kpiContainer) {
        const totalProduced = weeklyTotalProduction.reduce((a, b) => a + b, 0);
        const totalDemandKpi = weeklyDemandTotal.reduce((a, b) => a + b, 0);
        const finalInventory = weeklyInventoryFinal[3];
        const finalInventoryBottles = litersToBottles(finalInventory);
        const hasDeficit = weeklyDeficit.some(d => d);
        const demandBarrilMes = weeklyBarrilDemand.reduce((a, b) => a + b, 0);
        const demandForecastMes = weeklyForecastLiters.reduce((a, b) => a + b, 0);
        const totalDemandaGeneral = demandBarrilMes + demandForecastMes || 1;
        const pctPedidosFijos = Math.round((demandBarrilMes / totalDemandaGeneral) * 100);
        const pctPronosticos = Math.round((demandForecastMes / totalDemandaGeneral) * 100);
        const utilSemanas = weeklyCapacityUtilization.map((u, i) => `S${i + 1}: ${u}%`).join(' · ');

        kpiContainer.innerHTML = `
            <div class="flex-1 bg-green-50 p-4 rounded-lg border border-green-200 text-center shadow-sm">
                <p class="text-xs text-green-800 font-bold mb-1">Producción Total Planificada</p>
                <p class="text-2xl font-black text-green-600">${formatDecimal(totalProduced)} L</p>
                <p class="text-xs text-gray-600 mt-1">Demanda mes: ${formatDecimal(totalDemandKpi)} L</p>
            </div>
            <div class="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-200 text-center shadow-sm">
                <p class="text-xs text-blue-800 font-bold mb-1">% Utilización Capacidad</p>
                <p class="text-lg font-black text-blue-600 leading-tight">${utilSemanas}</p>
                <p class="text-xs text-gray-600 mt-1">Fórmula: Producido ÷ ${DEFAULT_WEEKLY_CAPACITY_L} L</p>
            </div>
            <div class="flex-1 bg-purple-50 p-4 rounded-lg border border-purple-200 text-center shadow-sm">
                <p class="text-xs text-purple-800 font-bold mb-2">Participación por Tipo</p>
                <div class="space-y-1 text-xs text-gray-700">
                    <p>🔵 Pedidos fijos: ${pctPedidosFijos}%</p>
                    <p>🟢 Pronósticos: ${pctPronosticos}%</p>
                </div>
            </div>
            <div class="flex-1 ${hasDeficit ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} p-4 rounded-lg border text-center shadow-sm">
                <p class="text-xs ${hasDeficit ? 'text-red-800' : 'text-emerald-800'} font-bold mb-1">Inv. Final Proyectado</p>
                <p class="text-2xl font-black ${hasDeficit ? 'text-red-600' : 'text-emerald-600'}">${formatDecimal(finalInventory)} L</p>
                <p class="text-sm font-bold ${hasDeficit ? 'text-red-600' : 'text-emerald-600'}">${finalInventoryBottles} bot</p>
                <p class="text-xs ${hasDeficit ? 'text-red-700' : 'text-emerald-700'} font-semibold mt-1">${hasDeficit ? '⚠️ Excede capacidad semanal' : '✅ Dentro de capacidad'}</p>
            </div>
        `;
    }

    try {
        const barrilDemMes = weeklyBarrilDemand.reduce((a, b) => a + b, 0);
        const forecastDemMes = weeklyForecastLiters.reduce((a, b) => a + b, 0);
        const demandaGeneralMes = barrilDemMes + forecastDemMes;
        window._lastProductionCalc = {
            litrosProducidosSemanas: weeklyTotalProduction,
            litrosProducidosTotal: weeklyTotalProduction.reduce((a, b) => a + b, 0),
            litrosProducidosPorcentajes: weeklyTotalProduction.map(v =>
                Math.round((v / (weeklyTotalProduction.reduce((a, b) => a + b, 0) || 1)) * 100)
            ),
            resumenDemandaSemanas: {
                pedidosFijos: weeklyBarrilDemand,
                pronosticos: weeklyForecastLiters,
                totalPorSemana: weeklyDemandTotal
            },
            produccionTotalPlanificada: weeklyTotalProduction,
            inventarioFinalProyectado: {
                litros: weeklyInventoryFinal[3],
                botellas: litersToBottles(weeklyInventoryFinal[3])
            },
            utilizacionCapacidadSemanal: weeklyCapacityUtilization,
            participacionPorTipo: {
                pedidosFijosPct: Math.round((barrilDemMes / (demandaGeneralMes || 1)) * 100),
                pronosticosPct: Math.round((forecastDemMes / (demandaGeneralMes || 1)) * 100)
            },
            weeklyProducedLiters,
            weeklyForecastProduction,
            weeklyOverflowLiters
        };
        window.getProductionPlanningReport = () => JSON.stringify(window._lastProductionCalc, null, 2);
    } catch (e) { console.error('debug export failed', e); }

    out.innerHTML = `<div class="text-green-700 font-bold bg-green-50 p-3 border border-green-200 rounded"><i class="fas fa-check-circle mr-1"></i> Cálculo MRP y MPS finalizado. Validaciones completadas.</div>`;
}

function editPlanningDemand(productId, weekIndex) {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;

    const isBarril = weekIndex < 2;
    const title = isBarril
        ? `Editar Pedido Fijo (Barril) para ${product.name} en Semana ${weekIndex + 1} (Litros):`
        : `Editar Pronóstico (Botellas) para ${product.name} en Semana ${weekIndex + 1} (Unidades):`;

    let currentQty = 0;
    const today = new Date();

    if (isBarril) {
        const weekOrders = orders.filter(o => {
            if (o.productId !== productId) return false;
            const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
            const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
            return w === weekIndex;
        });
        const volumePerUnit = product.volumePerUnit || 1;
        const totalUnits = weekOrders.reduce((sum, o) => sum + o.qty, 0);
        currentQty = totalUnits * volumePerUnit;
    } else {
        const weekForecasts = forecasts.filter(f => {
            if (f.productId !== productId) return false;
            const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
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

    if (isBarril) {
        const volumePerUnit = product.volumePerUnit || 1;
        const newUnits = newQty / volumePerUnit;

        orders = orders.filter(o => {
            if (o.productId !== productId) return true;
            const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
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
        forecasts = forecasts.filter(f => {
            if (f.productId !== productId) return true;
            const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
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
    renderForecastAdjustmentTable(document.getElementById('forecast-adjustment-table'));
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

function editWeeklyVolumeTableValue(type, weekIndex) {
    let currentVal = 0;
    let label = "";
    if (type === 'barril') {
        currentVal = customWeeklyBarrilDemand[weekIndex];
        label = "Pedidos fijos — Barril (L)";
    } else if (type === 'overflow_bottles') {
        currentVal = customWeeklyOverflowBottles[weekIndex];
        label = "Overflow embotellado barril (bot)";
    } else if (type === 'forecast') {
        currentVal = customWeeklyForecastLiters[weekIndex];
        label = "Producción según pronósticos (L)";
    }

    const valInput = prompt(`Ingrese el valor para ${label} en la Semana ${weekIndex + 1}:`, currentVal);
    if (valInput === null || valInput.trim() === "") return;

    const newVal = parseFloat(valInput);
    if (isNaN(newVal) || newVal < 0) {
        return showNotification('Por favor ingrese un valor numérico válido mayor o igual a 0.', 'error');
    }

    if (type === 'barril') {
        customWeeklyBarrilDemand[weekIndex] = newVal;
    } else if (type === 'overflow_bottles') {
        customWeeklyOverflowBottles[weekIndex] = newVal;
        customWeeklyOverflowLiters[weekIndex] = newVal * LITERS_PER_BOTTLE;
    } else if (type === 'forecast') {
        customWeeklyForecastLiters[weekIndex] = newVal;
    }

    saveData();
    refreshAppUI();
    runProductionFlow();
    showNotification(`Valor de ${label} para la Semana ${weekIndex + 1} actualizado a ${newVal}`, 'success');
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
    return batches.filter(b => b.productId === productId && b.quantity > 0).sort((a, b) => new Date(a.manufactureDate) - new Date(b.manufactureDate));
}

function allocateFromBatches(productId, qtyNeeded) {
    const available = getBatchesByProduct(productId).reduce((s, b) => s + b.quantity, 0);
    if (available < qtyNeeded) {
        return false;
    }
    let remaining = qtyNeeded;
    const sorted = getBatchesByProduct(productId);
    for (let batch of sorted) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        batch.quantity -= take;
        remaining -= take;
    }
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
        customWeeklyCapacities,
        customWeeklyBarrilDemand,
        customWeeklyForecastLiters,
        customWeeklyOverflowBottles,
        customWeeklyOverflowLiters,
        weeklyDemandOverridesActive
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

    runProductionFlow();

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
    return getLocalDateStr(date);
}

function diffDays(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function getAlerts() {
    const alerts = [];
    const todayStr = getLocalDateStr();

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
    const modal = document.getElementById('notifications-modal');
    const list = document.getElementById('notifications-list');
    if (!modal || !list) return;

    const alerts = getAlerts();
    if (alerts.length === 0) {
        list.innerHTML = '<p class="text-gray-500 italic text-center py-6">No hay alertas pendientes.</p>';
    } else {
        list.innerHTML = alerts.map(alert => {
            const iconClass = alert.type === 'Materia Prima'
                ? 'fa-boxes text-amber-600'
                : 'fa-industry text-blue-600';
            return `
                <div class="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p class="text-xs font-bold text-gray-500 uppercase mb-1">
                        <i class="fas ${iconClass} mr-1"></i> ${alert.type}
                    </p>
                    <p class="text-sm text-gray-800">${alert.message}</p>
                </div>
            `;
        }).join('');
    }

    modal.classList.remove('hidden');
    renderNotificationBell();
}

function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) modal.classList.add('hidden');
}

// --- Tank Info Modal ---
function openTankInfoModal(id) {
    const tank = tanks.find(t => t.id === id);
    if (!tank) return;

    document.getElementById('tank-info-title').textContent = `Tanque: ${tank.name}`;
    const content = document.getElementById('tank-info-content');

    const todayStr = getLocalDateStr();
    let activeSchedule = (tank.schedule || []).find(s => s.start <= todayStr);
    let isFuture = false;

    if (!activeSchedule) {
        activeSchedule = (tank.schedule || []).find(s => s.start > todayStr);
        if (activeSchedule) isFuture = true;
    }

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

        const startDate = new Date(`${activeSchedule.start}T00:00:00`);
        const endDate = new Date(`${activeSchedule.end}T00:00:00`);
        const today = new Date();
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
        const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        if (isFuture) {
            const daysToStart = diffDays(todayStr, activeSchedule.start);
            html += `
                <div class="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 class="font-bold text-blue-800 text-lg mb-2"><i class="fas fa-calendar-alt"></i> Lote Programado</h3>
                    <p><strong>Producto:</strong> ${prodName}</p>
                    <p><strong>Volumen Planificado:</strong> ${activeSchedule.qty} L</p>
                    <p><strong>Fecha de Inicio:</strong> ${activeSchedule.start}</p>
                    <p><strong>Fin Fermentación:</strong> ${fermentationEnd} (${fermentationDays} días)</p>
                    <p><strong>Tiempos:</strong> Embazado: ${bottlingDays}d | Empaquetado: ${packagingDays}d</p>
                    <p class="mt-2 font-semibold text-blue-700 text-sm">Inicia en ${daysToStart} día(s) (${activeSchedule.start})</p>
                </div>
            `;
        } else {
            const isOverdue = todayStr > activeSchedule.end;
            html += `
                <div class="mt-4 p-4 ${isOverdue ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} rounded-md border">
                    <h3 class="font-bold ${isOverdue ? 'text-green-800' : 'text-amber-800'} text-lg mb-2"><i class="fas fa-flask"></i> ${isOverdue ? 'Proceso Completado' : 'Proceso en Curso'}</h3>
                    <p><strong>Producto:</strong> ${prodName}</p>
                    <p><strong>Volumen en Proceso:</strong> ${activeSchedule.qty} L</p>
                    <p><strong>Fecha de Inicio:</strong> ${activeSchedule.start}</p>
                    <p><strong>Fin Fermentación:</strong> ${fermentationEnd} (${fermentationDays} días)</p>
                    <p><strong>Fin Embazado:</strong> ${bottlingEnd} (${bottlingDays} días)</p>
                    <p><strong>Fin Empaquetado:</strong> ${packagingEnd} (${packagingDays} días)</p>
                    <p class="mt-2 font-semibold text-gray-700">Fecha Estimada de Fin Total: ${activeSchedule.end}</p>

                    <div class="mt-4 text-sm font-semibold ${isOverdue ? 'text-green-700' : 'text-amber-700'} flex justify-between">
                        <span>${isOverdue ? 'Completado' : `Día ${elapsedDays} de ${totalDays}`}</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="w-full ${isOverdue ? 'bg-green-200' : 'bg-amber-200'} rounded-full h-3 mt-1 overflow-hidden">
                      <div class="${isOverdue ? 'bg-green-600' : 'bg-amber-600'} h-3 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }

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

        const scheduleIdx = (tank.schedule || []).indexOf(activeSchedule);
        html += `
            <div class="flex gap-2 mt-4">
                ${!isFuture ? `<button onclick="finishProduction(${tank.id}, ${scheduleIdx})" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-bold"><i class="fas fa-flag-checkered mr-2"></i> Finalizar Ciclo</button>` : ''}
                <button onclick="openTankScheduleForm(${tank.id}, true)" class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-bold"><i class="fas fa-edit mr-2"></i> Editar Lote</button>
            </div>
        `;

    } else {
        html += `
            <div class="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                <h3 class="font-bold text-green-800 text-lg"><i class="fas fa-check-circle"></i> Tanque Libre</h3>
                <p class="text-green-700 mt-1">Este tanque está vacío y listo para un nuevo lote de producción.</p>
            </div>
            <button onclick="openTankScheduleForm(${tank.id}, false)" class="mt-4 px-4 py-2 w-full bg-green-700 text-white rounded-md hover:bg-green-800 font-bold"><i class="fas fa-fill-drip mr-2"></i> Llenar Tanque Manualmente</button>
        `;
    }

    content.innerHTML = html;
    document.getElementById('tank-info-modal').classList.remove('hidden');
}

function deleteActiveProduction(tankId, scheduleIdx) {
    if (!confirm('ATENCIÓN: ¿Deseas CANCELAR esta producción? Se vaciará el tanque pero NO se recuperará la materia prima.')) return;
    const tank = tanks.find(t => t.id === tankId);
    const schedule = tank.schedule[scheduleIdx];

    if (schedule.id) {
        productionHistory = productionHistory.filter(hist => hist.id !== schedule.id);
    }

    tank.schedule.splice(scheduleIdx, 1);
    saveData();
    refreshAppUI();
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

    const select = document.getElementById('tank-schedule-product');
    select.innerHTML = '<option value="">-- Selecciona Producto --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        select.appendChild(opt);
    });

    const todayStr = getLocalDateStr();

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
        suggestTankScheduleEnd();
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
        endInput.value = getLocalDateStr(startDate);
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
        const todayStr = getLocalDateStr();
        const idx = tank.schedule.findIndex(s => s.start <= todayStr);
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

    if (tabNueva) tabNueva.classList.add('hidden');
    if (tabSeguimiento) tabSeguimiento.classList.add('hidden');
    if (tabSemanal) tabSemanal.classList.add('hidden');
    if (tabPlaneacion) tabPlaneacion.classList.add('hidden');

    if (btnNueva) btnNueva.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    if (btnSeguimiento) btnSeguimiento.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    if (btnSemanal) btnSemanal.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    if (btnPlaneacion) btnPlaneacion.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';

    if (tabId === 'nueva') {
        if (tabNueva) tabNueva.classList.remove('hidden');
        if (btnNueva) btnNueva.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
        updateWizardProductSelect();
        updateWizardTankSelect();
    } else if (tabId === 'seguimiento') {
        if (tabSeguimiento) tabSeguimiento.classList.remove('hidden');
        if (btnSeguimiento) btnSeguimiento.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
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
        runProductionFlow();
    }
}

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
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const startOffset = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);
    const weekOfMonth = Math.ceil((dayOfMonth + startOffset) / 7);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthName = monthNames[d.getMonth()];
    return `${monthName} - Semana ${weekOfMonth}`;
}

function getRelativeWeekLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d)) return 'Sin semana';

    let minDate = d;
    productionHistory.forEach(hist => {
        const histDate = new Date(`${hist.startDate || hist.endDate}T00:00:00`);
        if (!isNaN(histDate) && histDate < minDate) {
            minDate = histDate;
        }
    });

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

function computeWeeklyDemandFromOrders() {
    const barril = [0, 0, 0, 0];
    const forecastL = [0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finalProducts = inventory.filter(p => p.type !== 'raw');

    orders.forEach(o => {
        const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        const prod = inventory.find(p => p.id === o.productId);
        if (prod && prod.type !== 'raw') {
            barril[w] += o.qty * getProductVolumePerUnit(prod);
        }
    });

    forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        const prod = inventory.find(p => p.id === f.productId);
        if (prod && prod.type !== 'raw') {
            forecastL[w] += f.qty * getProductVolumePerUnit(prod);
        }
    });

    return { barril, forecastL };
}

function renderWeeklyDemandAdjustment() {
    const container = document.getElementById('weekly-demand-adjustment-table');
    if (!container) return;

    const computed = computeWeeklyDemandFromOrders();
    const displayBarril = weeklyDemandOverridesActive ? customWeeklyBarrilDemand : computed.barril;
    const displayForecast = weeklyDemandOverridesActive ? customWeeklyForecastLiters : computed.forecastL;

    const statusLabel = weeklyDemandOverridesActive
        ? '<span class="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">Usando valores guardados en MPS/MRP</span>'
        : '<span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">Vista desde pedidos/pronósticos — guarda para fijar valores manuales</span>';

    let html = `<div class="mb-3">${statusLabel}</div>
        <table class="w-full text-left border-collapse border border-gray-200 text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="p-2 border">Semana</th>
                    <th class="p-2 border text-center">Pedidos fijos (L)</th>
                    <th class="p-2 border text-center">Pronóstico ventas (L)</th>
                    <th class="p-2 border text-center">Demanda total (L)</th>
                </tr>
            </thead>
            <tbody>`;

    for (let w = 0; w < 4; w++) {
        const pedidos = customWeeklyBarrilDemand[w] ?? 0;
        const pronostico = customWeeklyForecastLiters[w] ?? 0;
        html += `<tr>
            <td class="p-2 border font-semibold">Semana ${w + 1}</td>
            <td class="p-2 border text-center">
                <input type="number" min="0" step="0.01" id="weekly-demand-pedidos-${w}"
                    value="${pedidos}" class="w-full max-w-[140px] mx-auto p-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-[#005B3A]">
            </td>
            <td class="p-2 border text-center">
                <input type="number" min="0" step="0.01" id="weekly-demand-pronostico-${w}"
                    value="${pronostico}" class="w-full max-w-[140px] mx-auto p-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-[#005B3A]">
            </td>
            <td class="p-2 border text-center font-bold text-gray-700" id="weekly-demand-total-${w}">${formatDecimal(pedidos + pronostico)} L</td>
        </tr>`;
    }

    const totalPedidos = displayBarril.reduce((a, b) => a + (Number(b) || 0), 0);
    const totalPron = displayForecast.reduce((a, b) => a + (Number(b) || 0), 0);
    html += `<tr class="bg-[#005B3A] text-white font-bold">
            <td class="p-2 border">Total mes</td>
            <td class="p-2 border text-center" id="weekly-demand-total-pedidos">${formatDecimal(totalPedidos)} L</td>
            <td class="p-2 border text-center" id="weekly-demand-total-pronostico">${formatDecimal(totalPron)} L</td>
            <td class="p-2 border text-center" id="weekly-demand-total-general">${formatDecimal(totalPedidos + totalPron)} L</td>
        </tr>
    </tbody></table>`;

    container.innerHTML = html;

    for (let w = 0; w < 4; w++) {
        const pedidosInput = document.getElementById(`weekly-demand-pedidos-${w}`);
        const pronInput = document.getElementById(`weekly-demand-pronostico-${w}`);
        const updateRowTotal = () => {
            const p = parseFloat(pedidosInput?.value) || 0;
            const pr = parseFloat(pronInput?.value) || 0;
            const totalCell = document.getElementById(`weekly-demand-total-${w}`);
            if (totalCell) totalCell.textContent = `${formatDecimal(p + pr)} L`;
            let tp = 0;
            let tf = 0;
            for (let i = 0; i < 4; i++) {
                tp += parseFloat(document.getElementById(`weekly-demand-pedidos-${i}`)?.value) || 0;
                tf += parseFloat(document.getElementById(`weekly-demand-pronostico-${i}`)?.value) || 0;
            }
            const elP = document.getElementById('weekly-demand-total-pedidos');
            const elF = document.getElementById('weekly-demand-total-pronostico');
            const elG = document.getElementById('weekly-demand-total-general');
            if (elP) elP.textContent = `${formatDecimal(tp)} L`;
            if (elF) elF.textContent = `${formatDecimal(tf)} L`;
            if (elG) elG.textContent = `${formatDecimal(tp + tf)} L`;
        };
        pedidosInput?.addEventListener('input', updateRowTotal);
        pronInput?.addEventListener('input', updateRowTotal);
    }
}

function saveWeeklyDemandAdjustment() {
    for (let w = 0; w < 4; w++) {
        const pedidos = document.getElementById(`weekly-demand-pedidos-${w}`);
        const pronostico = document.getElementById(`weekly-demand-pronostico-${w}`);
        customWeeklyBarrilDemand[w] = Math.max(0, parseFloat(pedidos?.value) || 0);
        customWeeklyForecastLiters[w] = Math.max(0, parseFloat(pronostico?.value) || 0);
    }
    weeklyDemandOverridesActive = true;
    saveData();
    renderWeeklyDemandAdjustment();
    renderForecastAdjustmentTable(document.getElementById('forecast-adjustment-table'));
    runProductionFlow();
    showNotification('Demanda semanal guardada. Las tablas MPS/MRP se actualizaron.', 'success');
}

function importWeeklyDemandFromOrders() {
    const computed = computeWeeklyDemandFromOrders();
    customWeeklyBarrilDemand = [...computed.barril];
    customWeeklyForecastLiters = [...computed.forecastL];
    weeklyDemandOverridesActive = true;
    saveData();
    renderWeeklyDemandAdjustment();
    renderForecastAdjustmentTable(document.getElementById('forecast-adjustment-table'));
    runProductionFlow();
    showNotification('Valores importados desde pedidos fijos y pronósticos registrados.', 'success');
}

function renderWeeklyProductionTab() {
    const productionContainer = document.getElementById('weekly-production-table');
    const forecastContainer = document.getElementById('forecast-adjustment-table');
    const historyEditor = document.getElementById('weekly-production-history-editor');
    if (!productionContainer || !forecastContainer || !historyEditor) return;

    renderWeeklyDemandAdjustment();

    const modeSelect = document.getElementById('week-mode-select');
    if (modeSelect) {
        modeSelect.value = weekCalculationMode;
    }

    updateWeeklyProductionProductSelect();
    updateWeeklyEditTankSelect();
    updateWeeklyLitersSplitPreview();

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

    renderForecastAdjustmentTable(forecastContainer);
}

function renderForecastAdjustmentTable(container) {
    if (!container) return;

    const finalProducts = inventory.filter(p => p.type !== 'raw');
    const stockByProduct = {};
    finalProducts.forEach(p => {
        stockByProduct[p.id] = getFinishedProductStockLiters(p.id);
    });

    const detailRows = forecasts
        .map(f => {
            const product = inventory.find(p => p.id === f.productId);
            if (!product || product.type === 'raw') return null;
            const weekIndex = getWeekIndexFromToday(f.targetDate);
            const forecastLiters = f.qty * getProductVolumePerUnit(product);
            return {
                weekIndex,
                weekLabel: `Semana ${weekIndex + 1}`,
                productId: f.productId,
                productName: product.name,
                forecastLiters,
                forecastUnits: f.qty,
                targetDate: f.targetDate
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.weekIndex - b.weekIndex || a.productName.localeCompare(b.productName));

    const rollingStock = { ...stockByProduct };
    const productRows = detailRows.map(row => {
        const stockAvail = rollingStock[row.productId] || 0;
        const adjustedLiters = Math.max(0, row.forecastLiters - stockAvail);
        const covers = row.forecastLiters > 0 && stockAvail >= row.forecastLiters;
        rollingStock[row.productId] = Math.max(0, stockAvail - row.forecastLiters);
        return { ...row, stockLiters: stockAvail, adjustedLiters, covers };
    });

    const weeklyForecastL = getWeeklyForecastLitersForPlanning();
    const initialInvLiters = finalProducts.reduce((sum, p) => sum + getFinishedProductStockLiters(p.id), 0);
    let rollingInvGlobal = initialInvLiters;
    const weeklySummaryRows = [0, 1, 2, 3].map(w => {
        const forecastL = weeklyForecastL[w] || 0;
        const stockBefore = rollingInvGlobal;
        const adjustedL = Math.max(0, forecastL - stockBefore);
        const covers = forecastL > 0 && stockBefore >= forecastL;
        rollingInvGlobal = Math.max(0, stockBefore - forecastL);
        return {
            weekLabel: `Semana ${w + 1}`,
            forecastL,
            stockLiters: stockBefore,
            adjustedL,
            covers
        };
    });

    let html = '';

    if (productRows.length > 0) {
        html += `<p class="text-xs text-gray-600 mb-2">Detalle por producto (desde pronósticos registrados). Stock PT se consume en orden de semana.</p>
            <table class="w-full text-left border-collapse border border-gray-200 text-sm mb-6">
            <thead class="bg-gray-50">
                <tr>
                    <th class="p-2 border">Semana</th>
                    <th class="p-2 border">Producto</th>
                    <th class="p-2 border text-center">Pronóstico (L)</th>
                    <th class="p-2 border text-center">Stock PT disp. (L)</th>
                    <th class="p-2 border text-center">Pronóstico ajustado (L)</th>
                    <th class="p-2 border text-center">Estado</th>
                    <th class="p-2 border text-center">Fecha</th>
                </tr>
            </thead>
            <tbody>`;
        productRows.forEach(row => {
            html += `<tr>
                <td class="p-2 border font-semibold">${row.weekLabel}</td>
                <td class="p-2 border">${row.productName}</td>
                <td class="p-2 border text-center">${formatDecimal(row.forecastLiters)} L<br><span class="text-xs text-gray-500">${formatDecimal(row.forecastUnits)} und</span></td>
                <td class="p-2 border text-center">${formatDecimal(row.stockLiters)} L</td>
                <td class="p-2 border text-center font-semibold ${row.covers ? 'text-blue-600' : 'text-amber-700'}">${formatDecimal(row.adjustedLiters)} L</td>
                <td class="p-2 border text-center text-xs">${row.covers ? '<span class="text-blue-600 font-semibold">Inv. cubre demanda</span>' : (row.forecastLiters > 0 ? 'Requiere producción' : '—')}</td>
                <td class="p-2 border text-center text-xs">${row.targetDate}</td>
            </tr>`;
        });
        html += '</tbody></table>';
    }

    html += `<p class="text-xs text-gray-600 mb-2">Resumen consolidado por semana (alineado con planeación MPS/MRP y demanda semanal guardada).</p>
        <table class="w-full text-left border-collapse border border-gray-200 text-sm">
        <thead class="bg-[#005B3A] text-white">
            <tr>
                <th class="p-2 border">Semana</th>
                <th class="p-2 border text-center">Pronóstico ventas (L)</th>
                <th class="p-2 border text-center">Inv. PT disponible (L)</th>
                <th class="p-2 border text-center">Pronóstico ajustado (L)</th>
                <th class="p-2 border text-center">Inv. PT (bot)</th>
                <th class="p-2 border text-center">Estado</th>
            </tr>
        </thead>
        <tbody>`;

    weeklySummaryRows.forEach(row => {
        html += `<tr class="bg-gray-50">
            <td class="p-2 border font-bold">${row.weekLabel}</td>
            <td class="p-2 border text-center">${formatDecimal(row.forecastL)} L</td>
            <td class="p-2 border text-center text-blue-700">${formatDecimal(row.stockLiters)} L</td>
            <td class="p-2 border text-center font-semibold ${row.covers ? 'text-blue-600' : 'text-amber-700'}">${formatDecimal(row.adjustedL)} L</td>
            <td class="p-2 border text-center text-gray-600">${litersToBottles(row.stockLiters)} bot</td>
            <td class="p-2 border text-center text-xs">${row.covers ? '<span class="text-blue-600 font-semibold">Inv. cubre demanda</span>' : (row.forecastL > 0 ? 'Requiere producción' : 'Sin pronóstico')}</td>
        </tr>`;
    });

    const totalForecast = weeklyForecastL.reduce((a, b) => a + b, 0);
    html += `<tr class="bg-gray-100 font-bold">
            <td class="p-2 border">Total mes</td>
            <td class="p-2 border text-center">${formatDecimal(totalForecast)} L</td>
            <td class="p-2 border text-center">${formatDecimal(initialInvLiters)} L</td>
            <td class="p-2 border text-center">—</td>
            <td class="p-2 border text-center">${litersToBottles(initialInvLiters)} bot</td>
            <td class="p-2 border text-center text-xs text-gray-500">Inventario inicial PT</td>
        </tr>
    </tbody></table>`;

    if (productRows.length === 0 && totalForecast === 0) {
        html = `<p class="text-gray-500 italic p-4 mb-3">No hay pronóstico en litros para las 4 semanas. Registra pronósticos en Planeación (celdas MPS) o completa la tabla <strong>Demanda semanal para planeación</strong> y pulsa Guardar.</p>` + html;
    }

    container.innerHTML = html;
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
    const checkDate = dateInput || getLocalDateStr();

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

function weeklyWeekChanged() {
    const weekSelect = document.getElementById('weekly-edit-week');
    const dateInput = document.getElementById('weekly-edit-date');
    if (!weekSelect || !dateInput) return;
    const weekVal = weekSelect.value;
    if (weekVal) {
        const offset = parseInt(weekVal, 10) - 1;
        dateInput.value = getDateForWeekOffset(offset);
    }
    updateWeeklyEditTankSelect();
    weeklyProductionCheckIngredients();
}

function getWeeklyLitersSplit() {
    const totalLiters = parseFloat(document.getElementById('weekly-edit-liters')?.value) || 0;
    let fixedLiters = parseFloat(document.getElementById('weekly-edit-fixed-liters')?.value) || 0;
    if (fixedLiters < 0) fixedLiters = 0;
    if (fixedLiters > totalLiters) fixedLiters = totalLiters;
    
    // TODO se fermenta (totalLiters)
    // Los litros fijos son los que se asignan a pedidos firmes del inventario final
    // El resto va al pronóstico de ventas
    const forecastLiters = Math.max(0, totalLiters - fixedLiters);
    
    return { 
        totalLiters,      // Lo que se fermenta
        fixedLiters,      // Lo que se asigna a pedidos fijos (sale del inventario final)
        fermentLiters: totalLiters,  // Lo que va al tanque (es todo)
        forecastLiters    // Lo que va al pronóstico
    };
}

function updateWeeklyLitersSplitPreview() {
    const preview = document.getElementById('weekly-liters-split-preview');
    if (!preview) return;
    const { totalLiters, fixedLiters, fermentLiters, forecastLiters } = getWeeklyLitersSplit();
    if (totalLiters <= 0) {
        preview.innerHTML = '<span class="text-gray-600">Ingresa litros totales y litros fijos para ver el reparto.</span>';
        return;
    }
    preview.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-800">
            <p><span class="font-bold text-amber-700">Litros fijos (pedidos):</span> ${formatDecimal(fixedLiters)} L</p>
            <p><span class="font-bold text-[#005B3A]">A fermentar (tanque):</span> ${formatDecimal(fermentLiters)} L</p>
            <p><span class="font-bold text-blue-700">A pronóstico ventas:</span> ${formatDecimal(forecastLiters)} L</p>
        </div>
        <p class="text-xs text-gray-600 mt-1">Fórmula: Total a fermentar = ${formatDecimal(totalLiters)} L | Pronóstico = Total - Fijos = ${formatDecimal(forecastLiters)} L</p>
    `;
}

function getWeeklyIndexFromForm() {
    const weekSelect = document.getElementById('weekly-edit-week')?.value;
    if (weekSelect) return Math.max(0, Math.min(3, parseInt(weekSelect, 10) - 1));
    const dateInput = document.getElementById('weekly-edit-date')?.value;
    if (dateInput) return getWeekIndexFromToday(dateInput);
    return 0;
}

function applyWeeklyLitersSplitToDemand(productId, weekIndex, fixedLiters, forecastLiters, targetDate, previousFixed = 0, previousForecast = 0) {
    if (weekIndex < 0 || weekIndex > 3) return;
    const product = inventory.find(p => p.id === productId);
    if (!product || product.type === 'raw') return;
    const unitVolume = getProductVolumePerUnit(product);

    customWeeklyBarrilDemand[weekIndex] = Math.max(0, (Number(customWeeklyBarrilDemand[weekIndex]) || 0) - previousFixed + fixedLiters);
    customWeeklyForecastLiters[weekIndex] = Math.max(0, (Number(customWeeklyForecastLiters[weekIndex]) || 0) - previousForecast + forecastLiters);
    weeklyDemandOverridesActive = true;

    orders = orders.filter(o => {
        if (o.productId !== productId) return true;
        return getWeekIndexFromToday(o.dueDate) !== weekIndex;
    });
    forecasts = forecasts.filter(f => {
        if (f.productId !== productId) return true;
        return getWeekIndexFromToday(f.targetDate) !== weekIndex;
    });

    if (fixedLiters > 0) {
        orders.push({
            id: Date.now(),
            productId,
            qty: fixedLiters / unitVolume,
            dueDate: targetDate,
            createdAt: new Date().toISOString()
        });
    }
    if (forecastLiters > 0) {
        forecasts.push({
            id: Date.now() + 1,
            productId,
            qty: forecastLiters / unitVolume,
            targetDate
        });
    }
}

function resetWeeklyProductionForm() {
    document.getElementById('weekly-edit-product').value = '';
    document.getElementById('weekly-edit-date').value = '';
    document.getElementById('weekly-edit-week').value = '';
    document.getElementById('weekly-edit-tank').value = '';
    document.getElementById('weekly-edit-fermentation-days').value = '8';
    document.getElementById('weekly-edit-liters').value = '';
    document.getElementById('weekly-edit-fixed-liters').value = '';
    document.getElementById('weekly-edit-units').value = '';
    updateWeeklyLitersSplitPreview();

    const statusDiv = document.getElementById('weekly-mrp-status');
    if (statusDiv) {
        statusDiv.innerHTML = '<span class="text-gray-500">Selecciona un producto y cantidad válida para verificar la materia prima.</span>';
    }
    document.getElementById('weekly-edit-id')?.remove();

    const submitBtn = document.getElementById('weekly-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Iniciar Producción Activa';
    }

    updateWeeklyEditTankSelect();
}

function getDateForWeekOffset(offset) {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff + offset * 7 + 3);
    return getLocalDateStr(date);
}

function openWeeklyProductionHistoryEditor(weekLabel, productId) {
    const entries = productionHistory.filter(hist => getWeekLabelForEntry(hist) === weekLabel && hist.productId === productId);
    if (!entries.length) return;
    const entry = entries[0];
    editWeeklyProductionEntry(entry.id);
}

function editWeeklyProductionEntry(entryId) {
    const entry = productionHistory.find(hist => hist.id === entryId);
    if (!entry) return;
    document.getElementById('weekly-edit-product').value = entry.productId;
    document.getElementById('weekly-edit-date').value = entry.startDate || entry.endDate || '';
    document.getElementById('weekly-edit-week').value = entry.week || '';
    const fixedL = entry.fixedOrders || 0;
    const fermentL = entry.qtyLiters || 0;
    document.getElementById('weekly-edit-liters').value = formatDecimal(fermentL);
    document.getElementById('weekly-edit-fixed-liters').value = formatDecimal(fixedL);
    document.getElementById('weekly-edit-units').value = formatDecimal(entry.qtyUnits);
    updateWeeklyLitersSplitPreview();

    updateWeeklyEditTankSelect();
    document.getElementById('weekly-edit-tank').value = entry.tankName || '';

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

    const submitBtn = document.getElementById('weekly-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Cambios';
    }

    weeklyProductionCheckIngredients();
}

function deleteWeeklyProductionEntry(entryId) {
    if (!confirm('¿Eliminar este registro de producción? Esta acción no se puede deshacer.')) return;

    tanks.forEach(t => {
        t.schedule = (t.schedule || []).filter(s => s.id !== entryId);
    });

    productionHistory = productionHistory.filter(hist => hist.id !== entryId);
    saveData();
    refreshAppUI();
    showNotification('Registro de producción eliminado.', 'success');
}

function weeklyProductionCheckIngredients() {
    const prodId = parseInt(document.getElementById('weekly-edit-product').value);
    const { totalLiters, fermentLiters } = getWeeklyLitersSplit();
    const qty = fermentLiters;
    const statusDiv = document.getElementById('weekly-mrp-status');
    if (!statusDiv) return false;

    if (!prodId || isNaN(totalLiters) || totalLiters <= 0) {
        statusDiv.innerHTML = '<span class="text-gray-500">Selecciona un producto y cantidad válida para verificar la materia prima.</span>';
        return false;
    }

    if (fermentLiters <= 0) {
        statusDiv.innerHTML = '<span class="text-blue-700 font-semibold"><i class="fas fa-info-circle"></i> No se requiere materia prima ni tanque (los litros totales son 0).</span>';
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

    recipe.ingredients.forEach(ing => {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (raw) {
            const reqQty = ing.qtyPerUnit * qty;
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
                    <select id="weekly-missing-item-select" class="p-2 border border-gray-300 rounded-md flex-1 text-sm bg-white">
                        ${missingItems.map(item => `<option value="${item.raw.id}|${item.reqQty}">${item.raw.name} — Req. ${formatDecimal(item.reqQty)} / Stock: ${formatDecimal(item.raw.quantity)}</option>`).join('')}
                    </select>
                    <button type="button" onclick="openSelectedWeeklyRawItem()" class="px-3 py-2 bg-[#005B3A] text-white rounded-md text-sm hover:bg-[#00422a]">Editar seleccionado</button>
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

function openSelectedWeeklyRawItem() {
    const select = document.getElementById('weekly-missing-item-select');
    if (!select) return;
    const [idValue, qtyValue] = select.value.split('|');
    const rawId = parseInt(idValue);
    const reqQty = qtyValue ? parseFloat(qtyValue) : null;
    if (!rawId) return;
    openEditProductModal(rawId, reqQty);
}

function startWeeklyProductionActive() {
    const prodId = parseInt(document.getElementById('weekly-edit-product').value);
    const { totalLiters, fixedLiters, forecastLiters } = getWeeklyLitersSplit();
    const tankName = document.getElementById('weekly-edit-tank').value;
    const dateInput = document.getElementById('weekly-edit-date').value;
    const fermentationDays = parseInt(document.getElementById('weekly-edit-fermentation-days').value) || 8;

    // Los litros a fermentar son los TOTALES (todo se fermenta)
    const litersToFerment = totalLiters;
    const fixedOrders = fixedLiters;
    const forecastLitersValue = forecastLiters;

    const weekSelect = document.getElementById('weekly-edit-week').value;
    const weekVal = weekSelect ? parseInt(weekSelect, 10) : null;
    const weekIndex = getWeeklyIndexFromForm();

    if (!prodId || isNaN(totalLiters) || totalLiters <= 0 || !dateInput) {
        return showNotification('Por favor, selecciona producto, fecha y cantidad válida (Litros totales).', 'error');
    }

    if (litersToFerment <= 0) {
        return showNotification('Los litros totales deben ser mayores a 0 para fermentar.', 'error');
    }

    if (!tankName) {
        return showNotification('Selecciona un tanque para los litros que van a fermentación.', 'error');
    }

    let tank = tanks.find(t => t.name === tankName);
    if (!tank) {
        return showNotification('Tanque no encontrado.', 'error');
    }

    if (litersToFerment > tank.capacityLiters) {
        return showNotification(`Los litros a fermentar (${litersToFerment} L) superan la capacidad del tanque (${tank.capacityLiters} L).`, 'error');
    }

    const existingIdInput = document.getElementById('weekly-edit-id');
    const isEdit = existingIdInput && existingIdInput.value;
    const entryId = isEdit ? parseInt(existingIdInput.value, 10) : Date.now();

    const isOccupied = (tank.schedule || []).some(s => {
        if (isEdit && s.id === entryId) return false;
        return dateInput >= s.start && dateInput <= s.end;
    });
    if (isOccupied) {
        return showNotification(`El tanque ${tank.name} ya está ocupado en la fecha seleccionada.`, 'error');
    }

    // Si es edición, devolvemos temporalmente el stock del lote original
    if (isEdit) {
        const oldEntry = productionHistory.find(hist => hist.id === entryId);
        if (oldEntry && oldEntry.qtyLiters > 0) {
            const oldRecipe = recipes.find(r => r.productId === oldEntry.productId);
            if (oldRecipe) {
                oldRecipe.ingredients.forEach(ing => {
                    const raw = inventory.find(p => p.id === ing.ingredientProductId);
                    if (raw) {
                        raw.quantity += (ing.qtyPerUnit * oldEntry.qtyLiters);
                    }
                });
            }
        }
    }

    // Verificar stock con los ingredientes
    if (!checkIngredientsForProduction(prodId, litersToFerment)) {
        if (isEdit) {
            const oldEntry = productionHistory.find(hist => hist.id === entryId);
            if (oldEntry && oldEntry.qtyLiters > 0) {
                const oldRecipe = recipes.find(r => r.productId === oldEntry.productId);
                if (oldRecipe) {
                    oldRecipe.ingredients.forEach(ing => {
                        const raw = inventory.find(p => p.id === ing.ingredientProductId);
                        if (raw) {
                            raw.quantity -= (ing.qtyPerUnit * oldEntry.qtyLiters);
                        }
                    });
                }
            }
        }
        return showNotification('Stock insuficiente de materia prima. Revisa la Verificación MRP.', 'error');
    }

    const product = inventory.find(p => p.id === prodId);
    const unitVolume = getProductVolumePerUnit(product);
    const unitsInput = parseFloat(document.getElementById('weekly-edit-units').value);
    const qtyUnits = !isNaN(unitsInput) && unitsInput > 0
        ? unitsInput
        : Math.round(litersToFerment / unitVolume);

    // Descontar materia prima
    const recipe = recipes.find(r => r.productId === prodId);
    if (recipe) {
        recipe.ingredients.forEach(ing => {
            const raw = inventory.find(p => p.id === ing.ingredientProductId);
            if (raw) {
                raw.quantity -= (ing.qtyPerUnit * litersToFerment);
            }
        });
    }

    // Calcular fechas
    const startDate = dateInput;
    const bottlingDays = 2;
    const packagingDays = 1;
    const totalDays = fermentationDays + bottlingDays + packagingDays;
    const endDate = addDays(startDate, totalDays);

    const scheduleEntry = {
        id: entryId,
        start: startDate,
        end: endDate,
        productId: prodId,
        qty: litersToFerment,
        fermentationDays,
        bottlingDays,
        packagingDays,
        fermentationEnd: addDays(startDate, fermentationDays),
        bottlingEnd: addDays(addDays(startDate, fermentationDays), bottlingDays),
        packagingEnd: endDate
    };

    if (isEdit) {
        tanks.forEach(t => {
            t.schedule = (t.schedule || []).filter(s => s.id !== entryId);
        });
    }
    tank.schedule = tank.schedule || [];
    tank.schedule.push(scheduleEntry);

    const historyPayload = {
        id: entryId,
        productId: prodId,
        qtyLiters: litersToFerment,
        qtyUnits: qtyUnits,
        startDate: startDate,
        endDate: endDate,
        week: weekVal,
        tankName: tank.name,
        fermentationDays: fermentationDays,
        fixedOrders: fixedOrders,
        overflowBottles: 0,
        isActive: true
    };

    if (isEdit) {
        const histIdx = productionHistory.findIndex(h => h.id === entryId);
        if (histIdx !== -1) {
            productionHistory[histIdx] = historyPayload;
        } else {
            productionHistory.unshift(historyPayload);
        }
        showNotification('Registro actualizado. Fijos: ' + formatDecimal(fixedOrders) + ' L · Pronóstico: ' + formatDecimal(forecastLitersValue) + ' L', 'success');
    } else {
        productionHistory.unshift(historyPayload);
        showNotification(`Producción iniciada: ${formatDecimal(litersToFerment)} L a fermentar. Pedidos fijos: ${formatDecimal(fixedOrders)} L · Pronóstico: ${formatDecimal(forecastLitersValue)} L`, 'success');
    }

    let previousFixed = 0;
    let previousForecast = 0;
    if (isEdit) {
        const oldEntry = productionHistory.find(h => h.id === entryId);
        if (oldEntry) {
            previousFixed = oldEntry.fixedOrders || 0;
            previousForecast = oldEntry.qtyLiters || 0;
        }
    }
    applyWeeklyLitersSplitToDemand(prodId, weekIndex, fixedOrders, forecastLitersValue, dateInput, previousFixed, previousForecast);

    saveData();
    refreshAppUI();
    renderWeeklyDemandAdjustment();
    renderForecastAdjustmentTable(document.getElementById('forecast-adjustment-table'));
    runProductionFlow();
    resetWeeklyProductionForm();
}

// Función auxiliar para verificar ingredientes
function checkIngredientsForProduction(productId, litersToProduce) {
    const recipe = recipes.find(r => r.productId === productId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        return false;
    }

    for (const ing of recipe.ingredients) {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (!raw) return false;
        const reqQty = ing.qtyPerUnit * litersToProduce;
        if (raw.quantity < reqQty) {
            return false;
        }
    }
    return true;
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

function updateWizardTankSelect() {
    const select = document.getElementById('wizard-tank');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona Tanque Libre --</option>';

    const todayStr = getLocalDateStr();
    tanks.forEach(t => {
        const isOccupied = (t.schedule || []).some(s => s.start <= todayStr);
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
    const totalVolume = qty;

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

    const recipe = recipes.find(r => r.productId === prodId);
    recipe.ingredients.forEach(ing => {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (raw) {
            raw.quantity -= (ing.qtyPerUnit * qty);
        }
    });

    const today = new Date();
    const fermentationDays = 8;
    const bottlingDays = 2;
    const packagingDays = 1;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + fermentationDays + bottlingDays + packagingDays);

    const entryId = Date.now();
    const todayStr = getLocalDateStr(today);
    const endStr = getLocalDateStr(endDate);

    tank.schedule = tank.schedule || [];
    tank.schedule.push({
        id: entryId,
        start: todayStr,
        end: endStr,
        productId: prodId,
        qty: qty,
        fermentationDays,
        bottlingDays,
        packagingDays,
        fermentationEnd: addDays(todayStr, fermentationDays),
        bottlingEnd: addDays(addDays(todayStr, fermentationDays), bottlingDays),
        packagingEnd: endStr
    });

    const product = inventory.find(p => p.id === prodId);
    const unitVolume = getProductVolumePerUnit(product);
    const qtyUnits = Math.round(qty / unitVolume);

    const getWeekIndexFromDateLocal = (dateStr) => {
        const date = new Date(`${dateStr}T00:00:00`);
        if (isNaN(date)) return 0;
        const diffDays = Math.floor((date - new Date()) / (1000 * 60 * 60 * 24));
        return Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
    };
    const weekVal = getWeekIndexFromDateLocal(todayStr) + 1;

    productionHistory.unshift({
        id: entryId,
        productId: prodId,
        qtyLiters: qty,
        qtyUnits: qtyUnits,
        startDate: todayStr,
        endDate: endStr,
        week: weekVal,
        tankName: tank.name,
        fermentationDays: fermentationDays,
        fixedOrders: 0,
        overflowBottles: 0,
        isActive: true
    });

    saveData();
    refreshAppUI();

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

    const todayStr = getLocalDateStr();
    let activeFound = false;

    tanks.forEach(tank => {
        (tank.schedule || []).forEach((schedule, scheduleIdx) => {
            activeFound = true;
            const prod = inventory.find(p => p.id === schedule.productId);

            const isFuture = schedule.start > todayStr;
            const isOverdue = todayStr > schedule.end;

            let statusBadge = '';
            let cardBg = '';
            let progress = 0;
            let elapsedDays = 0;
            let totalDays = 0;

            if (isFuture) {
                const daysToStart = diffDays(todayStr, schedule.start);
                statusBadge = `<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded border border-blue-300 flex items-center gap-1"><i class="fas fa-calendar-alt"></i> Programado (Inicia en ${daysToStart}d)</span>`;
                cardBg = 'bg-blue-50/50 border-blue-200';
            } else {
                const startDate = new Date(`${schedule.start}T00:00:00`);
                const endDate = new Date(`${schedule.end}T00:00:00`);
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                elapsedDays = Math.max(0, Math.floor((todayMidnight - startDate) / (1000 * 60 * 60 * 24)));
                progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

                if (isOverdue) {
                    statusBadge = '<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-300 flex items-center gap-1"><i class="fas fa-check-circle"></i> Listo para Finalizar</span>';
                    cardBg = 'bg-green-50/50 border-green-200';
                } else {
                    statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded border border-amber-300 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> En Proceso (${progress.toFixed(0)}%)</span>`;
                    cardBg = 'bg-amber-50 border-amber-200';
                }
            }

            const div = document.createElement('div');
            div.className = `p-4 border rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardBg}`;

            let leftCol = `
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-bold text-gray-800 text-lg"><i class="fas fa-flask mr-2 ${isFuture ? 'text-blue-500' : isOverdue ? 'text-green-600' : 'text-amber-500'}"></i> ${tank.name}</h3>
                        ${statusBadge}
                    </div>
                    <p class="text-sm font-semibold text-gray-700">Producto: <span class="text-black">${prod ? prod.name : 'Desc.'}</span> (${schedule.qty} L)</p>
                    <p class="text-xs text-gray-600">Desde: ${schedule.start} | Estimado Fin: ${schedule.end}</p>
            `;

            if (!isFuture) {
                leftCol += `
                    <div class="mt-2 text-xs font-bold text-gray-700 flex justify-between">
                        <span>Progreso (${elapsedDays} de ${totalDays} días)</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1 overflow-hidden">
                      <div class="${isOverdue ? 'bg-green-600' : 'bg-amber-600'} h-2 rounded-full" style="width: ${progress}%"></div>
                    </div>
                `;
            }
            leftCol += `</div>`;

            let rightCol = `
                <div class="flex-shrink-0">
                    <button onclick="finishProduction(${tank.id}, ${scheduleIdx})" ${isFuture ? 'disabled' : ''} class="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors shadow-md w-full md:w-auto ${isFuture ? 'opacity-50 cursor-not-allowed' : ''}"><i class="fas fa-flag-checkered mr-2"></i> Finalizar Ciclo</button>
                    <button onclick="deleteActiveProduction(${tank.id}, ${scheduleIdx})" class="px-4 py-2 mt-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200 transition-colors shadow-sm text-xs w-full"><i class="fas fa-trash-alt mr-1"></i> Cancelar</button>
                </div>
            `;

            div.innerHTML = leftCol + rightCol;
            container.appendChild(div);
        });
    });

    if (!activeFound) {
        container.innerHTML = '<p class="text-gray-500 italic p-4 text-center border rounded">No hay producciones activas en los tanques.</p>';
    }
}

function finishProduction(tankId, scheduleIdx) {
    if (!confirm('¿Seguro que deseas finalizar esta producción? El volumen se sumará al inventario y el tanque quedará libre.')) return;

    const tank = tanks.find(t => t.id === tankId);
    const schedule = tank.schedule[scheduleIdx];

    let defaultWarehouse = warehouses[0];
    if (!defaultWarehouse) {
        defaultWarehouse = { id: 1, name: 'Bodega Principal', location: 'Default' };
        warehouses.push(defaultWarehouse);
    }

    const product = inventory.find(p => p.id === schedule.productId);
    let qtyToAdd = schedule.qty;
    if (product && product.volumePerUnit) {
        qtyToAdd = Math.floor(schedule.qty / product.volumePerUnit);
    }

    createBatch({
        productId: schedule.productId,
        warehouseId: defaultWarehouse.id,
        lot: `L-${Date.now().toString().slice(-6)}`,
        qty: qtyToAdd,
        manufactureDate: getLocalDateStr()
    });

    const existingEntry = productionHistory.find(hist => hist.id === schedule.id);
    if (existingEntry) {
        existingEntry.isActive = false;
        existingEntry.endDate = getLocalDateStr();
        existingEntry.qtyUnits = qtyToAdd;
    } else {
        productionHistory.unshift({
            id: schedule.id || Date.now(),
            productId: schedule.productId,
            qtyLiters: schedule.qty,
            qtyUnits: qtyToAdd,
            startDate: schedule.start,
            endDate: getLocalDateStr(),
            tankName: tank.name,
            isActive: false
        });
    }

    tank.schedule.splice(scheduleIdx, 1);

    saveData();
    refreshAppUI();
    showNotification('Producción finalizada. Tanque liberado e inventario actualizado.', 'success');
}
