export const STORAGE_KEY = 'erpState';

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('saveState failed', e);
    }
}

export function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        console.error('loadState failed', e);
        return {};
    }
}
