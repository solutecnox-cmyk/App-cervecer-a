// --- Estado de la Aplicación ---
const STORAGE_KEY = 'erpState';
const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

let clients = savedState.clients || JSON.parse(localStorage.getItem('clients')) || [];
let inventory = savedState.inventory || JSON.parse(localStorage.getItem('inventory')) || [];
let cart = [];
let selectedProductId = null; // Para el buscador de productos en POS
let suppliers = savedState.suppliers || JSON.parse(localStorage.getItem('suppliers')) || [];
// Nuevas estructuras: bodegas y lotes (batches)
let warehouses = savedState.warehouses || JSON.parse(localStorage.getItem('warehouses')) || [];
let batches = savedState.batches || JSON.parse(localStorage.getItem('batches')) || []; // cada batch: {id, productId, warehouseId, lot, quantity, manufactureDate, createdAt}
// Producción: pedidos firmes, pronósticos, recetas (BOM), tanques y órdenes de compra
let orders = savedState.orders || JSON.parse(localStorage.getItem('orders')) || []; // {id, productId, qty, dueDate, createdAt}
let forecasts = savedState.forecasts || JSON.parse(localStorage.getItem('forecasts')) || []; // {id, productId, qty, targetDate}
let recipes = savedState.recipes || JSON.parse(localStorage.getItem('recipes')) || []; // {productId, ingredients: [{ingredientProductId, qtyPerUnit}]}
let editingRecipeProductId = null;
let editingTankId = null;
let tanks = savedState.tanks || JSON.parse(localStorage.getItem('tanks')) || []; // {id, name, capacityLiters, schedule: [{start, end, productId, qty}]}
let purchaseOrders = savedState.purchaseOrders || JSON.parse(localStorage.getItem('purchaseOrders')) || []; // {id, ingredientId, qty, status}
let productionHistory = savedState.productionHistory || JSON.parse(localStorage.getItem('productionHistory')) || []; // {id, productId, qty, startDate, endDate, tankName}

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
    loadClients();
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
    loadSuppliers();
    updateProductSupplierSelect();
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
function openAddProductModal() {
    document.getElementById('product-form').reset();
    updateProductSupplierSelect();
    handleProductTypeChange();
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function handleProductTypeChange() {
    const type = document.getElementById('product-type').value;
    const priceLabel = document.getElementById('product-price-label');
    const supplierDiv = document.getElementById('product-supplier-div');
    const safetyDiv = document.getElementById('product-safety-stock-div');
    
    if (type === 'raw') {
        priceLabel.textContent = 'Precio de Compra';
        supplierDiv.classList.remove('hidden');
        safetyDiv.classList.remove('hidden');
    } else {
        priceLabel.textContent = 'Precio de Venta';
        supplierDiv.classList.add('hidden');
        safetyDiv.classList.add('hidden');
        document.getElementById('product-supplier').value = '';
        document.getElementById('product-safety-stock').value = 0;
    }
}

function saveProduct(event) {
    event.preventDefault();
    const newProduct = {
        id: Date.now(),
        type: document.getElementById('product-type').value || 'final',
        sku: document.getElementById('product-sku').value,
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        supplierId: document.getElementById('product-supplier').value || null,
        quantity: parseFloat(document.getElementById('product-quantity').value),
        volumePerUnit: parseFloat(document.getElementById('product-volume').value) || 1,
        safetyStock: parseFloat(document.getElementById('product-safety-stock').value) || 0,
    };
    inventory.push(newProduct);
    saveData();
    loadInventory();
    closeProductModal();
    showNotification('Producto añadido al inventario.');
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
                    <td class="p-3 border-b">$${product.price.toFixed(2)}</td>
                    <td class="p-3 border-b ${stockClass}">${product.quantity}</td>
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
                    <td class="p-3 border-b">$${product.price.toFixed(2)}</td>
                    <td class="p-3 border-b ${stockClass}">${product.quantity}</td>
                    <td class="p-3 border-b ${stockClass}">${product.safetyStock != null ? product.safetyStock : '-'}</td>
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
    loadWarehouses();
    updateWarehouseSelect();
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
    loadBatches();
    loadInventory();
    updateBatchProductSelect();
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
    loadOrders();
    showNotification('Pedido registrado.', 'success');
}

function addForecastFromUI() {
    const productId = parseInt(document.getElementById('order-product-select').value);
    const qty = parseFloat(document.getElementById('order-qty').value) || 0;
    const targetDate = document.getElementById('order-date').value || new Date().toISOString().slice(0,10);
    if (!productId || qty <= 0) return showNotification('Completa producto y cantidad para el pronóstico.', 'error');
    forecasts.push({ id: Date.now(), productId, qty, targetDate });
    saveData();
    loadForecasts();
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

    // Poblar select de producto final
    const select = document.getElementById('recipe-product-select');
    select.innerHTML = '<option value="">-- Selecciona producto final --</option>';
    const finalProducts = inventory.filter(p => p.type !== 'raw');
    finalProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (SKU: ${p.sku})`;
        select.appendChild(opt);
    });

    if (recipeProductId) {
        const recipe = recipes.find(r => r.productId === recipeProductId);
        select.value = recipeProductId;
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
        <input type="number" required step="0.0001" placeholder="Cant. por unidad" class="w-1/3 p-2 border border-gray-300 rounded-md ingredient-qty">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 p-2"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

function saveRecipe(event) {
    event.preventDefault();
    const productId = parseInt(document.getElementById('recipe-product-select').value);
    if (!productId) return showNotification('Selecciona un producto final.', 'error');

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
    loadRecipes();
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
    loadTanks();
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
    const LITROS_POR_LOTE = 120; // 1 tanque = 1 lote = 120L
    const MAX_TANQUES_SEMANA = 6;
    
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
        
        // Simular demanda base para que los cálculos no den 0 si el usuario no ingresó datos
        demandBarril[p.id][0] = Math.floor(Math.random() * 50) + 50; // 50-100L Sem 1
        demandBarril[p.id][1] = Math.floor(Math.random() * 50) + 50; // 50-100L Sem 2
        demandBotellas[p.id][2] = Math.floor(Math.random() * 200) + 200; // 200-400 botellas Sem 3
        demandBotellas[p.id][3] = Math.floor(Math.random() * 200) + 200; // 200-400 botellas Sem 4

        weeklyBarrilDemand[0] += demandBarril[p.id][0];
        weeklyBarrilDemand[1] += demandBarril[p.id][1];
    });

    // Agregar pedidos reales
    orders.forEach(o => {
        const diffDays = Math.floor((new Date(o.dueDate) - new Date()) / (1000*60*60*24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        if (demandBarril[o.productId]) {
            const volume = o.qty * (inventory.find(p=>p.id===o.productId)?.volumePerUnit || 1);
            demandBarril[o.productId][w] += volume;
            weeklyBarrilDemand[w] += volume;
        }
    });

    forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - new Date()) / (1000*60*60*24));
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

            if (w < 2) {
                // Semanas 1 y 2: Canal Barril
                const demandaL = demandBarril[p.id][w];
                const demandaBotEquiv = Math.round(demandaL / unitVolume);
                // Necesitamos cubrir demandaL. Si es > 0, lanzamos lotes
                const lotesNecesarios = Math.ceil(demandaL / LITROS_POR_LOTE);
                litrosProducir = lotesNecesarios * LITROS_POR_LOTE;
                
                // Lo que sobra de los barriles se envasa
                const overflowLitros = Math.max(0, litrosProducir - demandaL);
                overflowBotellas = Math.floor(overflowLitros / unitVolume);
                currentBotellas += overflowBotellas;
                
                weeklyOverflowBottles[w] += overflowBotellas;
                weeklyOverflowLiters[w] += overflowLitros;
                weeklyProducedLiters[w] += litrosProducir;

                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Demanda: ${demandaL.toFixed(0)} L / ${demandaBotEquiv} bot<br>Overflow: +${overflowBotellas} bot / ${overflowLitros.toFixed(1)} L</span>`;
            } else {
                // Semanas 3 y 4: Canal Botellas
                const demandaB = demandBotellas[p.id][w];
                const demandaLitros = demandaB * unitVolume;
                currentBotellas -= demandaB; // Restamos demanda proyectada
                
                if (currentBotellas < 0) {
                    // Necesitamos producir
                    const deficitBotellas = Math.abs(currentBotellas);
                    const deficitLitros = deficitBotellas * unitVolume;
                    const lotesNecesarios = Math.ceil(deficitLitros / LITROS_POR_LOTE);
                    litrosProducir = lotesNecesarios * LITROS_POR_LOTE;
                    
                    const botellasNuevas = Math.floor(litrosProducir / unitVolume);
                    currentBotellas += botellasNuevas;
                }
                
                weeklyProducedLiters[w] += litrosProducir;
                detail = `${litrosProducir} L<br><span class="text-xs text-gray-500">Demanda: ${demandaB.toFixed(0)} bot / ${demandaLitros.toFixed(1)} L<br>Inv. Fin: ${currentBotellas} bot / ${(currentBotellas * unitVolume).toFixed(1)} L</span>`;
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
            <td class="p-2 border text-center">${pmpDetails[0]}</td>
            <td class="p-2 border text-center">${pmpDetails[1]}</td>
            <td class="p-2 border text-center">${pmpDetails[2]}</td>
            <td class="p-2 border text-center">${pmpDetails[3]}</td>
            <td class="p-2 border text-center font-bold">${mpsPlan[p.id].reduce((a,b)=>a+b,0)} L</td>
        </tr>`;
    });
    
    // Fila de validación de capacidad (CRP)
    mpsHtml += `<tr class="bg-gray-100">
        <td class="p-2 border font-bold text-right text-gray-600">Lotes a Iniciar (CRP):</td>`;
    
    let isOverCapacity = false;
    for(let w=0; w<4; w++) {
        let l = lotesPorSemana[w];
        let alertClass = l > MAX_TANQUES_SEMANA ? 'text-red-600 font-bold bg-red-100' : 'text-green-600 font-bold';
        if (l > MAX_TANQUES_SEMANA) isOverCapacity = true;
        mpsHtml += `<td class="p-2 border text-center ${alertClass}">${l} / ${MAX_TANQUES_SEMANA} Tanques</td>`;
    }
    mpsHtml += `<td class="p-2 border"></td></tr></tbody></table>`;

    if (isOverCapacity) {
        mpsHtml = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 font-bold">
            <i class="fas fa-exclamation-triangle"></i> ALERTA CRÍTICA: Se ha excedido la capacidad máxima de ${MAX_TANQUES_SEMANA} tanques por semana. Ajusta los pedidos o el pronóstico.
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
                Req: <span class="text-red-600 font-semibold">${reqBruto.toFixed(2)}</span><br>
                Inv: <span class="text-blue-600 font-semibold">${invProyectado.toFixed(2)}</span>
                ${aPedirEn}
            </td>`;
            inv = invProyectado;
        }
        
        mrpHtml += `<tr>
            <td class="p-2 border font-semibold">${rm.name}<br><span class="text-[10px] text-gray-500">SS: ${rm.safetyStock} | Lote: ${rm.purchaseUnit} | LT: ${rm.leadTime} Sem</span></td>
            <td class="p-2 border text-center bg-gray-50 font-bold">${rm.quantity.toFixed(2)}</td>
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
                <p class="text-3xl font-black text-blue-600">${Math.round((lotesPorSemana.reduce((a,b)=>a+b,0) / (MAX_TANQUES_SEMANA*4))*100)}%</p>
            </div>
            <div class="flex-1 bg-amber-50 p-4 rounded-lg border border-amber-200 text-center shadow-sm">
                <p class="text-sm text-amber-800 font-bold mb-1">Overflow embotellado</p>
                <p class="text-3xl font-black text-amber-600">${weeklyOverflowBottles.reduce((a,b)=>a+b,0)} Bot / ${weeklyOverflowLiters.reduce((a,b)=>a+b,0).toFixed(1)} L</p>
            </div>
            <div class="flex-1 bg-purple-50 p-4 rounded-lg border border-purple-200 text-center shadow-sm">
                <p class="text-sm text-purple-800 font-bold mb-1">Inv. Final PT Proyectado</p>
                <p class="text-3xl font-black text-purple-600">${finalInvTotal} Bot / ${finalInvLiters.toFixed(1)} L</p>
            </div>
        `;
    }

    const volumeTable = document.getElementById('production-volume-table');
    const demandTable = document.getElementById('production-demand-table');
    const inventoryTable = document.getElementById('production-inventory-table');

    if(volumeTable) {
        const monthlyCapacity = MAX_TANQUES_SEMANA * LITROS_POR_LOTE * 4;
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
                        ${weeklyBarrilDemand.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${barrilTotal.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((barrilTotal / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Overflow embotellado barril (bot)</td>
                        ${weeklyOverflowBottles.map(v => `<td class="p-2 border text-center">${v}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${overflowTotalBottles}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((overflowTotalLiters / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Producción según pronósticos (L)</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${forecastTotal.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((forecastTotal / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr class="font-bold bg-[#f8fafc]">
                        <td class="p-2 border font-semibold">PRODUCCIÓN TOTAL (L)</td>
                        ${weeklyProducedLiters.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${producedTotal.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((producedTotal / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Capacidad producida en el mes (L)</td>
                        <td class="p-2 border text-center" colspan="4">${monthlyCapacity}</td>
                        <td class="p-2 border text-center font-bold">${monthlyCapacity}</td>
                        <td class="p-2 border text-center font-semibold">100%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    if(demandTable) {
        const monthlyCapacity = MAX_TANQUES_SEMANA * LITROS_POR_LOTE * 4;
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
                        ${weeklyBarrilDemand.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${barrilTotal.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((barrilTotal / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Pronósticos (L)</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${forecastTotal.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((forecastTotal / monthlyCapacity) * 100)}%</td>
                    </tr>
                    <tr class="font-bold bg-[#f8fafc]">
                        <td class="p-2 border font-semibold">TOTAL (L)</td>
                        ${weeklyBarrilDemand.map((_,i) => `<td class="p-2 border text-center">${(weeklyBarrilDemand[i] + weeklyForecastLiters[i]).toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${totalDemand.toFixed(0)}</td>
                        <td class="p-2 border text-center font-semibold">${Math.round((totalDemand / monthlyCapacity) * 100)}%</td>
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
                        ${weeklyForecastBottles.map(v => `<td class="p-2 border text-center">${v.toFixed(0)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${weeklyForecastBottles.reduce((a,b)=>a+b,0).toFixed(0)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Pronóstico ventas (litros)</td>
                        <td class="p-2 border text-center">—</td>
                        ${weeklyForecastLiters.map(v => `<td class="p-2 border text-center">${v.toFixed(1)}</td>`).join('')}
                        <td class="p-2 border text-center font-bold">${weeklyForecastLiters.reduce((a,b)=>a+b,0).toFixed(1)}</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Inventario PT (botellas) al INICIO</td>
                        <td class="p-2 border text-center font-bold">${startBottles}</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${startBottles}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Inventario PT (botellas) al FINAL</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${endBottles}</td>
                        <td class="p-2 border text-center font-bold">${endBottles}</td>
                    </tr>
                    <tr class="bg-gray-50">
                        <td class="p-2 border font-semibold">Inventario PT (litros) al INICIO</td>
                        <td class="p-2 border text-center font-bold">${startLiters.toFixed(1)}</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${startLiters.toFixed(1)}</td>
                    </tr>
                    <tr>
                        <td class="p-2 border font-semibold">Inventario PT (litros) al FINAL</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center">—</td>
                        <td class="p-2 border text-center font-bold">${endLiters.toFixed(1)}</td>
                        <td class="p-2 border text-center font-bold">${endLiters.toFixed(1)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    out.innerHTML = `<div class="text-green-700 font-bold bg-green-50 p-3 border border-green-200 rounded"><i class="fas fa-check-circle mr-1"></i> Cálculo MRP y MPS finalizado. Validaciones completadas.</div>`;
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
        productionHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
                const reqQty = (ing.qtyPerUnit * totalUnits).toFixed(2);
                html += `<li><strong>${ingProd ? ingProd.name : 'Ingrediente'}</strong>: ${reqQty}</li>`;
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
    loadTanks();
    renderTrackingActive();
    closeTankScheduleModal();
    showNotification(isEdit ? 'Lote actualizado correctamente.' : 'Tanque llenado manualmente.', 'success');
}

// --- NUEVA LÓGICA DE PRODUCCIÓN (TABS, WIZARD Y SEGUIMIENTO) ---

function switchProductionTab(tabId) {
    const tabNueva = document.getElementById('tab-nueva');
    const tabSeguimiento = document.getElementById('tab-seguimiento');
    const tabPlaneacion = document.getElementById('tab-planeacion');
    const btnNueva = document.getElementById('tab-btn-nueva');
    const btnSeguimiento = document.getElementById('tab-btn-seguimiento');
    const btnPlaneacion = document.getElementById('tab-btn-planeacion');

    // Hide all
    tabNueva.classList.add('hidden');
    tabSeguimiento.classList.add('hidden');
    if (tabPlaneacion) tabPlaneacion.classList.add('hidden');
    
    // Reset buttons
    btnNueva.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
    btnSeguimiento.className = 'py-2 px-6 font-bold text-gray-500 hover:text-[#005B3A] border-b-2 border-transparent hover:border-gray-300 transition-all';
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
    } else if (tabId === 'planeacion') {
        if (tabPlaneacion) tabPlaneacion.classList.remove('hidden');
        if (btnPlaneacion) btnPlaneacion.className = 'py-2 px-6 font-bold text-[#005B3A] border-b-2 border-[#005B3A]';
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
    let html = '<ul class="space-y-1 text-sm">';
    const product = inventory.find(p => p.id === prodId);
    const totalUnits = product && product.volumePerUnit ? (qty / product.volumePerUnit) : qty;

    recipe.ingredients.forEach(ing => {
        const raw = inventory.find(p => p.id === ing.ingredientProductId);
        if (raw) {
            const reqQty = ing.qtyPerUnit * totalUnits;
            const hasEnough = raw.quantity >= reqQty;
            if (!hasEnough) allAvailable = false;
            
            html += `<li class="${hasEnough ? 'text-green-700' : 'text-red-600 font-bold'}">
                <i class="fas ${hasEnough ? 'fa-check' : 'fa-times'} mr-1"></i>
                ${raw.name}: Req. ${reqQty.toFixed(2)} (Stock: ${raw.quantity.toFixed(2)})
            </li>`;
        }
    });
    html += '</ul>';
    
    if (allAvailable) {
        html = '<div class="text-green-700 font-bold mb-2"><i class="fas fa-check-circle"></i> Hay suficiente materia prima.</div>' + html;
    } else {
        html = '<div class="text-red-600 font-bold mb-2"><i class="fas fa-times-circle"></i> Faltan ingredientes. Compra materia prima antes de iniciar.</div>' + html;
    }
    
    statusDiv.innerHTML = html;
    return allAvailable;
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
            <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Completado</span>
        `;
        container.appendChild(div);
    });
}

