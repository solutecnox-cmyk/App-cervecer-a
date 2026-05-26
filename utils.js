// Utilidades comunes exportadas como módulo ES
export const LITERS_PER_BOTTLE = 0.33;
export const DEFAULT_WEEKLY_CAPACITY_L = 720;

export function formatDecimal(value, digits = 8) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return num.toFixed(digits).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}

export function getLocalDateStr(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function litersToBottles(liters) {
    const n = Number(liters);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const size = window.systemParameters?.tamanoBotella || LITERS_PER_BOTTLE;
    return Math.floor(n / size);
}

export function getProductVolumePerUnit(product) {
    const size = window.systemParameters?.tamanoBotella || LITERS_PER_BOTTLE;
    return product?.volumePerUnit || size;
}

export function getWeekOfMonthLabel(dateStr) {
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

export function getRelativeWeekLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d)) return 'Sin semana';

    let minDate = d;
    if (window.productionHistory && window.productionHistory.length > 0) {
        window.productionHistory.forEach(hist => {
            const histDate = new Date(`${hist.startDate || hist.endDate}T00:00:00`);
            if (!isNaN(histDate) && histDate < minDate) {
                minDate = histDate;
            }
        });
    }

    const minDateAligned = new Date(minDate);
    const day = minDateAligned.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    minDateAligned.setDate(minDateAligned.getDate() + diffToMonday);

    const diffTime = d - minDateAligned;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return `Semana ${weekNumber}`;
}

export function getWeekLabel(dateStr) {
    const mode = window.weekCalculationMode || 'default';
    if (mode === 'relative') {
        return getRelativeWeekLabel(dateStr);
    } else {
        return getWeekOfMonthLabel(dateStr);
    }
}

export function getDateForWeekOffset(offset) {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff + offset * 7 + 3); // Miércoles de la semana respectiva
    return getLocalDateStr(date);
}

export function getWeekIndexFromToday(dateStr) {
    const mode = window.weekCalculationMode || 'default';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date)) return 0;

    if (mode === 'month') {
        const targetLabel = getWeekLabel(dateStr);
        for (let w = 0; w < 4; w++) {
            const planningDate = getDateForWeekOffset(w);
            const planningLabel = getWeekLabel(planningDate);
            if (targetLabel === planningLabel) {
                return w;
            }
        }
    }

    // Modo relativo o fallback por diferencia de días
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
}

export function diffDays(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return getLocalDateStr(date);
}
