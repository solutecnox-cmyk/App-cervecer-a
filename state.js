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
    customWeeklyCapacities: (savedState.customWeeklyCapacities && savedState.customWeeklyCapacities.length > 0) ? savedState.customWeeklyCapacities : [720, 720, 720, 720],
    customWeeklyBarrilDemand: (savedState.customWeeklyBarrilDemand && savedState.customWeeklyBarrilDemand.length > 0) ? savedState.customWeeklyBarrilDemand : [600, 600, 0, 0],
    customWeeklyForecastLiters: (savedState.customWeeklyForecastLiters && savedState.customWeeklyForecastLiters.length > 0) ? savedState.customWeeklyForecastLiters : [168, 168.3, 168.3, 168.63],
    customWeeklyOverflowBottles: (savedState.customWeeklyOverflowBottles && savedState.customWeeklyOverflowBottles.length > 0) ? savedState.customWeeklyOverflowBottles : [363.63, 363.63, 0, 0],
    customWeeklyOverflowLiters: (savedState.customWeeklyOverflowLiters && savedState.customWeeklyOverflowLiters.length > 0) ? savedState.customWeeklyOverflowLiters : [120, 120, 0, 0],
    weeklyDemandOverridesActive: savedState.weeklyDemandOverridesActive || false,
    recipes: savedState.recipes || [],
    systemParameters: savedState.systemParameters || {
        numeroTanques: 6,
        capacidadTanque: 120,
        diasFermentacion: 7,
        capacidadSemanalTotal: 720,
        numeroSabores: 6,
        tamanoBotella: 0.33,
        horizontePlanificacion: 4,
        barreraDemanda: 14
    }
};

window._initialState = initial;

export default null;
