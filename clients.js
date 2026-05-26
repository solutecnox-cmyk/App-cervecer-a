// Clientes: funciones originalmente en funciones.js
export function openAddClientModal() {
    document.getElementById('client-form').reset();
    document.getElementById('client-modal').classList.remove('hidden');
}
export function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
}
export function saveClient(event) {
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
    window.clients.push(newClient);
    window.saveData();
    window.refreshAppUI();
    closeClientModal();
    window.showNotification('Cliente registrado con éxito.');
}
export function loadClients() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!window.clients || window.clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay clientes registrados.NonNullNeon</td></tr>';
        return;
    }
    window.clients.forEach(client => {
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
export function deleteClient(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        window.clients = window.clients.filter(c => c.id !== id);
        window.saveData();
        loadClients();
        window.showNotification('Cliente eliminado.');
    }
}
