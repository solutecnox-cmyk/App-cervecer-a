/**
 * pmp-integration.js
 * Script de integración específico para sincronizar la tabla interactiva del PMP
 * con el sistema MPS/MRP existente
 * 
 * Uso: Incluir este archivo en Index.html después de los scripts del sistema
 */

(function() {
    'use strict';

    // Esperar a que el DOM esté completamente cargado
    document.addEventListener('DOMContentLoaded', initializePMPInteractive);

    async function initializePMPInteractive() {
        console.log('[PMP Interactive] Inicializando tabla interactiva del PMP...');

        // Importar la clase PMPInteractiveTable
        try {
            const { PMPInteractiveTable } = await import('./pmp-interactive.js');

            // Obtener la lista de productos del sistema
            const products = getProductsFromSystem();

            if (!products || products.length === 0) {
                console.warn('[PMP Interactive] No se encontraron productos. Usando datos de ejemplo.');
                products = getDefaultProducts();
            }

            // Crear instancia de la tabla
            const pmpTable = new PMPInteractiveTable('mps-table-container', {
                weeks: 4,
                pmpProduction: 120,
                pmpMinimum: 0
            });

            // Inicializar
            pmpTable.initialize(products);

            // Cargar datos guardados si existen
            const savedData = localStorage.getItem('pmp-interactive-data');
            if (savedData) {
                try {
                    pmpTable.setData(JSON.parse(savedData));
                } catch (e) {
                    console.warn('[PMP Interactive] No se pudieron cargar datos previos:', e);
                }
            }

            // Renderizar la tabla
            pmpTable.render();

            // Guardar datos antes de cerrar la página
            window.addEventListener('beforeunload', () => {
                pmpTable.saveToStorage();
            });

            // Exponer métodos útiles globalmente
            window.pmpInteractiveTable = pmpTable;

            // Agregar funciones de utilidad global
            window.exportPMPData = () => pmpTable.exportToCSV();
            window.getPMPData = () => pmpTable.getData();
            window.savePMPData = () => pmpTable.saveToStorage();

            console.log('[PMP Interactive] Tabla inicializada exitosamente');
            console.log('[PMP Interactive] Métodos disponibles: exportPMPData(), getPMPData(), savePMPData()');

        } catch (error) {
            console.error('[PMP Interactive] Error al inicializar:', error);
        }
    }

    /**
     * Obtiene la lista de productos del sistema existente
     */
    function getProductsFromSystem() {
        const products = [];

        // Opción 1: Desde window.inventory (si está disponible)
        if (window.inventory && Array.isArray(window.inventory)) {
            return window.inventory
                .filter(p => p.type === 'final' || !p.type)
                .map(p => ({
                    id: p.id || p.SKU,
                    name: p.name || p.Nombre || `Producto ${p.id}`
                }))
                .slice(0, 10); // Máximo 10 productos
        }

        // Opción 2: Desde mpsEngine si está disponible
        if (window.mpsEngine && window.mpsEngine.productos) {
            Object.entries(window.mpsEngine.productos).forEach(([id, prod]) => {
                products.push({
                    id: id,
                    name: prod.nombre || prod.name || id
                });
            });
            return products;
        }

        // Opción 3: Desde tabla HTML si existe
        const tableBody = document.querySelector('#inventory-final-table-body');
        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    products.push({
                        id: cells[0].textContent.trim() || `prod-${products.length}`,
                        name: cells[1].textContent.trim() || `Producto ${products.length}`
                    });
                }
            });
            return products;
        }

        return products;
    }

    /**
     * Retorna productos de ejemplo por defecto
     */
    function getDefaultProducts() {
        return [
            { id: 'cerveza_roja', name: 'Cerveza Roja' },
            { id: 'cerveza_negra', name: 'Cerveza Negra' },
            { id: 'cerveza_ipa', name: 'Cerveza IPA' },
            { id: 'cerveza_pilsen', name: 'Cerveza Pilsen' }
        ];
    }

    /**
     * Hook para sincronizar cambios en el PMP con el sistema MPS existente
     */
    window.syncPMPtoMPS = function() {
        if (!window.pmpInteractiveTable) {
            console.warn('PMP Interactive Table no está inicializada');
            return false;
        }

        const pmpData = window.pmpInteractiveTable.getData();

        // Sincronizar con mpsEngine si existe
        if (window.mpsEngine && window.customWeeklyBarrilDemand) {
            Object.entries(pmpData).forEach(([productId, weeks]) => {
                window.customWeeklyBarrilDemand[productId] = [];
                Object.entries(weeks).forEach(([week, data]) => {
                    window.customWeeklyBarrilDemand[productId][week] = data.pedido;
                });
            });
            console.log('[PMP Sync] Datos sincronizados a mpsEngine');
            return true;
        }

        console.warn('[PMP Sync] mpsEngine no disponible para sincronizar');
        return false;
    };

    /**
     * Hook para importar datos desde el sistema MPS actual
     */
    window.importDataToPMP = function() {
        if (!window.pmpInteractiveTable) {
            console.warn('PMP Interactive Table no está inicializada');
            return false;
        }

        if (window.customWeeklyBarrilDemand) {
            const newData = {};
            Object.entries(window.customWeeklyBarrilDemand).forEach(([productId, weeks]) => {
                newData[productId] = {};
                weeks.forEach((demand, week) => {
                    newData[productId][week] = {
                        pedido: demand || 0,
                        pronostico: 0,
                        inventarioInicial: 50,
                        pmp: 0,
                        inventarioFinal: 0
                    };
                });
            });
            window.pmpInteractiveTable.setData(newData);
            console.log('[PMP Import] Datos importados desde sistema MPS');
            return true;
        }

        console.warn('[PMP Import] No hay datos disponibles para importar');
        return false;
    };

})();
