// state.js
// Inicializa el estado compartido y lo expone en `window._initialState`.
const STORAGE_KEY = 'erpState';
const savedState = (() => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
})();

const initial = {
    clients: savedState.clients || (() => { try { return JSON.parse(localStorage.getItem('clients')) || []; } catch (e) { return []; } })(),
    suppliers: savedState.suppliers || (() => { try { return JSON.parse(localStorage.getItem('suppliers')) || []; } catch (e) { return []; } })(),
    inventory: savedState.inventory || (() => { try { return JSON.parse(localStorage.getItem('inventory')) || []; } catch (e) { return []; } })(),
    warehouses: savedState.warehouses || (() => { try { return JSON.parse(localStorage.getItem('warehouses')) || []; } catch (e) { return []; } })(),
    batches: savedState.batches || (() => { try { return JSON.parse(localStorage.getItem('batches')) || []; } catch (e) { return []; } })(),
    orders: savedState.orders || (() => { try { return JSON.parse(localStorage.getItem('orders')) || []; } catch (e) { return []; } })(),
    forecasts: savedState.forecasts || (() => { try { return JSON.parse(localStorage.getItem('forecasts')) || []; } catch (e) { return []; } })(),
    purchaseOrders: savedState.purchaseOrders || (() => { try { return JSON.parse(localStorage.getItem('purchaseOrders')) || []; } catch (e) { return []; } })(),
    productionHistory: savedState.productionHistory || (() => { try { return JSON.parse(localStorage.getItem('productionHistory')) || []; } catch (e) { return []; } })(),
    tanks: savedState.tanks || (() => { try { return JSON.parse(localStorage.getItem('tanks')) || []; } catch (e) { return []; } })(),
    weekCalculationMode: savedState.weekCalculationMode || 'default',
    customWeeklyCapacities: savedState.customWeeklyCapacities || [],
    customWeeklyBarrilDemand: savedState.customWeeklyBarrilDemand || [],
    customWeeklyForecastLiters: savedState.customWeeklyForecastLiters || [],
    customWeeklyOverflowBottles: savedState.customWeeklyOverflowBottles || [],
    customWeeklyOverflowLiters: savedState.customWeeklyOverflowLiters || [],
    weeklyDemandOverridesActive: savedState.weeklyDemandOverridesActive || false,
    recipes: savedState.recipes || []
};

window._initialState = initial;

export default null;
