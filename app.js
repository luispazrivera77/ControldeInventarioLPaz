// Estado global de la aplicación
const state = {
    parentColumns: [],
    parentData: [],
    derivedTables: []
};

// Referencias del DOM
const colNameInput = document.getElementById('col-name');
const colTypeSelect = document.getElementById('col-type');
const addColBtn = document.getElementById('add-col-btn');
const columnsList = document.getElementById('columns-list');
const createTableBtn = document.getElementById('create-table-btn');
const schemaBuilder = document.getElementById('schema-builder');
const dataView = document.getElementById('data-view');
const tableContainer = document.getElementById('table-container');
const openPivotBtn = document.getElementById('open-pivot-btn');
const pivotView = document.getElementById('pivot-view');

// 1. Añadir columna al esquema principal
addColBtn.addEventListener('click', () => {
    const name = colNameInput.value.trim();
    const type = colTypeSelect.value;
    
    if (!name) return alert('Ingresa un nombre para la columna');
    
    state.parentColumns.push({ name, type });
    colNameInput.value = '';
    
    renderColumnsList();
});

function renderColumnsList() {
    columnsList.innerHTML = '';
    state.parentColumns.forEach((col, index) => {
        const li = document.createElement('li');
        li.textContent = `${col.name} (${col.type})`;
        columnsList.appendChild(li);
    });
}

// 2. Generar la matriz editable (Filas x Columnas)
createTableBtn.addEventListener('click', () => {
    if (state.parentColumns.length === 0) return alert('Define al menos una columna primero.');
    
    schemaBuilder.classList.add('hidden');
    dataView.classList.remove('hidden');
    
    renderEditableTable();
});

function renderEditableTable() {
    let html = '<table><thead><tr>';
    state.parentColumns.forEach(col => {
        html += `<th>${col.name}</th>`;
    });
    html += '<th>Acciones</th></tr></thead><tbody id="table-body">';
    
    // Generar 3 filas iniciales de ejemplo
    for (let i = 0; i < 3; i++) {
        html += generateRowHtml();
    }
    
    html += '</tbody></table><button id="add-row-btn" style="margin-top:10px;">Añadir Fila</button>';
    tableContainer.innerHTML = html;
    
    document.getElementById('add-row-btn').addEventListener('click', () => {
        const tbody = document.getElementById('table-body');
        tbody.insertAdjacentHTML('beforeend', generateRowHtml());
    });
}

function generateRowHtml() {
    let rowHtml = '<tr>';
    state.parentColumns.forEach(col => {
        let inputType = 'text';
        if (col.type === 'number') inputType = 'number';
        if (col.type === 'date') inputType = 'date';
        if (col.type === 'boolean') inputType = 'checkbox';
        
        rowHtml += `<td><input type="${inputType}" class="cell-input"></td>`;
    });
    rowHtml += '<td><button onclick="this.closest(\'tr\').remove()">Eliminar</button></td></tr>';
    return rowHtml;
}

// 3. Activar vista de pivote / derivación
openPivotBtn.addEventListener('click', () => {
    // Recolectar datos actuales de la tabla
    const rows = document.querySelectorAll('#table-body tr');
    state.parentData = [];
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.cell-input');
        const rowData = {};
        state.parentColumns.forEach((col, index) => {
            const input = inputs[index];
            rowData[col.name] = col.type === 'boolean' ? input.checked : input.value;
        });
        state.parentData.push(rowData);
    });

    pivotView.classList.remove('hidden');
    pivotView.innerHTML = `
        <h2>3. Motor de Derivación (Pivote)</h2>
        <p>Registros cargados en la base principal: <strong>${state.parentData.length}</strong></p>
        <p><em>Aquí puedes aplicar filtros condicionales o proyectar un nuevo esquema hijo. (Base lista para respaldar en GitHub).</em></p>
    `;
});
