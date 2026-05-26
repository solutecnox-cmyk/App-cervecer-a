// tanks.js
// tanks.js
// Implementación de openTankInfoModal trasladada desde funciones.js
export function openTankInfoModal(id) {
    const tank = window.tanks.find(t => t.id === id);
    if (!tank) return;

    document.getElementById('tank-info-title').textContent = `Tanque: ${tank.name}`;
    const content = document.getElementById('tank-info-content');

    const todayStr = window.getLocalDateStr();
    let activeSchedule = (tank.schedule || []).find(s => s.start <= todayStr);
    let isFuture = false;

    if (!activeSchedule) {
        activeSchedule = (tank.schedule || []).find(s => s.start > todayStr);
        if (activeSchedule) isFuture = true;
    }

    let html = `<p class="text-lg"><strong>Capacidad Total:</strong> ${tank.capacityLiters} L</p>`;

    if (activeSchedule) {
        const prod = window.inventory.find(p => p.id === activeSchedule.productId);
        const prodName = prod ? prod.name : 'Producto desconocido';
        const fermentationDays = activeSchedule.fermentationDays != null ? activeSchedule.fermentationDays : 8;
        const bottlingDays = activeSchedule.bottlingDays != null ? activeSchedule.bottlingDays : 2;
        const packagingDays = activeSchedule.packagingDays != null ? activeSchedule.packagingDays : 1;
        const fermentationEnd = activeSchedule.fermentationEnd || window.addDays(activeSchedule.start, fermentationDays);
        const bottlingEnd = activeSchedule.bottlingEnd || window.addDays(fermentationEnd, bottlingDays);
        const packagingEnd = activeSchedule.packagingEnd || window.addDays(bottlingEnd, packagingDays);

        const startDate = new Date(`${activeSchedule.start}T00:00:00`);
        const endDate = new Date(`${activeSchedule.end}T00:00:00`);
        const today = new Date();
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
        const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        if (isFuture) {
            const daysToStart = window.diffDays(todayStr, activeSchedule.start);
            html += `
                <div class="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 class="font-bold text-blue-800 text-lg mb-2"><i class="fas fa-calendar-alt"></i> Lote Programado</h3>`;
        }
        // (Resumen reducido) Añadir detalles básicos de fechas y progreso
        html += `<div class="mt-3">Producto: ${prodName}</div>`;
        html += `<div class="mt-2">Progreso: ${Math.round(progress)}%</div>`;
    }

    if (content) content.innerHTML = html;
    document.getElementById('tank-info-modal').classList.remove('hidden');
}
