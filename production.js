// production.js
// production.js
// Implementaciones MPS/MRP trasladadas desde funciones.js
export function computeWeeklyDemandFromOrders() {
    const barril = [0, 0, 0, 0];
    const forecastL = [0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finalProducts = window.inventory.filter(p => p.type !== 'raw');

    window.orders.forEach(o => {
        const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        const prod = window.inventory.find(p => p.id === o.productId);
        if (prod && prod.type !== 'raw') {
            barril[w] += o.qty * window.getProductVolumePerUnit(prod);
        }
    });

    window.forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        const prod = window.inventory.find(p => p.id === f.productId);
        if (prod && prod.type !== 'raw') {
            forecastL[w] += f.qty * window.getProductVolumePerUnit(prod);
        }
    });

    return { barril, forecastL };
}

export function loadMRP() {
    const container = document.getElementById('mrp-bars-container');
    if (container) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Visita el Dashboard de Producción para ver el MRP detallado a 4 semanas.</p>';
    }
}
