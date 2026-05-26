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
    return Math.floor(n / LITERS_PER_BOTTLE);
}

export function getProductVolumePerUnit(product) {
    return product?.volumePerUnit || LITERS_PER_BOTTLE;
}

export function getWeekIndexFromToday(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date)) return 0;
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
}

export function addDays(dateStr, days) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return getLocalDateStr(date);
}

export function diffDays(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}
