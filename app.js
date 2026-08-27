// Estado global de la aplicación
const state = {
    parentColumns: [],
    parentData: [],
    workbookData: null,
    workbookInstance: null
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

// Excel / CSV Importer DOM
const excelFileInput = document.getElementById('excel-file-input');
const sheetSelectorContainer = document.getElementById('sheet-selector-container');
const sheetSelect = document.getElementById('sheet-select');
const loadSheetBtn = document.getElementById('load-sheet-btn');

// 1. Añadir columna manual al esquema principal
addColBtn.addEventListener('click', () => {
    const name = colNameInput.value.trim();
    const type = colTypeSelect.value;
    
    if (!name) return alert('Ingresa un nombre para la columna');
    
    state.parentColumns.push({ name, type });
    colNameInput.value = '';
    renderColumnsList();
});

function renderColumnsList() {
    if (state.parentColumns.length === 0) {
        columnsList.innerHTML = '<em>Aún no hay columnas definidas.</em>';
        return;
    }
    columnsList.innerHTML = '';
    state.parentColumns.forEach((col) => {
        const li = document.createElement('li');
        li.textContent = `${col.name} (${col.type})`;
        columnsList.appendChild(li);
    });
}

// 2. Generar la matriz editable (Filas x Columnas)
createTableBtn.addEventListener('click', () => {
    if (state.parentColumns.length === 0) return alert('Define al menos una columna primero.');
    
    schemaBuilder.classList.add('hidden');
    document.getElementById('import-section').classList.add('hidden');
    dataView.classList.remove('hidden');
    
    renderEditableTable();
});

function renderEditableTable(existingData = null) {
    let html = '<table><thead><tr>';
    state.parentColumns.forEach(col => {
        html += `<th>${col.name}</th>`;
    });
    html += '<th>Acciones</th></tr></thead><tbody id="table-body">';
    
    if (existingData && existingData.length > 0) {
        existingData.forEach(row => {
            html += generateRowHtmlWithValues(row);
        });
    } else {
        // Generar 3 filas vacías iniciales por defecto
        for (let i = 0; i < 3; i++) {
            html += generateRowHtml();
        }
    }
    
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function generateRowHtml(values = {}) {
    let rowHtml = '<tr>';
    state.parentColumns.forEach(col => {
        let inputType = 'text';
        if (col.type === 'number') inputType = 'number';
        if (col.type === 'date') inputType = 'date';
        
        const val = values[col.name] !== undefined ? values[col.name] : '';
        
        if (col.type === 'boolean') {
            const checked = val ? 'checked' : '';
            rowHtml += `<td><input type="checkbox" class="cell-input" ${checked}></td>`;
        } else {
            rowHtml += `<td><input type="${inputType}" class="cell-input" value="${val}"></td>`;
        }
    });
    rowHtml += '<td><button class="btn-secondary" onclick="this.closest(\'tr\').remove()" style="padding: 5px 10px;">Eliminar</button></td></tr>';
    return rowHtml;
}

function generateRowHtmlWithValues(rowObj) {
    return generateRowHtml(rowObj);
}

document.getElementById('add-row-btn').addEventListener('click', () => {
    const tbody = document.getElementById('table-body');
    tbody.insertAdjacentHTML('beforeend', generateRowHtml());
});

// 3. Importar archivo Excel o CSV usando SheetJS
excelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            state.workbookInstance = workbook;

            // Mostrar selector de hojas si hay múltiples
            sheetSelect.innerHTML = '';
            workbook.SheetNames.forEach(sheetName => {
                const opt = document.createElement('option');
                opt.value = sheetName;
                opt.textContent = sheetName;
                sheetSelect.appendChild(opt);
            });

            sheetSelectorContainer.classList.remove('hidden');
        } catch (error) {
            alert('Error al leer el archivo. Asegúrate de que sea un Excel o CSV válido.');
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
});

loadSheetBtn.addEventListener('click', () => {
    const selectedSheetName = sheetSelect.value;
    const worksheet = state.workbookInstance.Sheets[selectedSheetName];
    
    // Convertir hoja a JSON (matriz de filas/columnas)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length === 0) return alert('La hoja seleccionada está vacía.');

    // La primera fila se asume como nombres de columnas
    const rawHeaders = jsonData[0];
    state.parentColumns = rawHeaders.map(header => ({
        name: String(header || 'Columna'),
        type: 'string' // Inferencia base como texto
    }));

    renderColumnsList();

    // Procesar las filas de datos siguientes
    state.parentData = [];
    for (let i = 1; i < jsonData.length; i++) {
        const rowArr = jsonData[i];
        if (rowArr.length === 0) continue;
        const rowObj = {};
        state.parentColumns.forEach((col, index) => {
            rowObj[col.name] = rowArr[index] !== undefined ? rowArr[index] : '';
        });
        state.parentData.push(rowObj);
    }

    // Ocultar sección de importación, mostrar esquema e ir directo a la matriz con datos precargados
    document.getElementById('import-section').classList.add('hidden');
    schemaBuilder.classList.add('hidden');
    dataView.classList.remove('hidden');

    renderEditableTable(state.parentData);
    alert(`¡Hoja "${selectedSheetName}" cargada con éxito (${state.parentData.length} registros)!`);
});

// 4. Activar vista de pivote / derivación
openPivotBtn.addEventListener('click', () => {
    collectParentDataFromDOM();

    if (state.parentData.length === 0) {
        return alert('No hay datos en la matriz principal para derivar.');
    }

    document.getElementById('record-count').textContent = state.parentData.length;

    // Rellenar selector de columnas para filtro pivote
    const filterColSelect = document.getElementById('pivot-filter-col');
    filterColSelect.innerHTML = '';
    state.parentColumns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.name;
        opt.textContent = col.name;
        filterColSelect.appendChild(opt);
    });

    pivotView.classList.remove('hidden');
});

function collectParentDataFromDOM() {
    const rows = document.querySelectorAll('#table-body tr');
    state.parentData = [];
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.cell-input');
        const rowData = {};
        state.parentColumns.forEach((col, index) => {
            const input = inputs[index];
            if (col.type === 'boolean') {
                rowData[col.name] = input.checked;
            } else {
                rowData[col.name] = input.value;
            }
        });
        state.parentData.push(rowData);
    });
}

// Motor lógico para generar la sub-base derivada
document.getElementById('generate-child-btn').addEventListener('click', () => {
    collectParentDataFromDOM();

    const childName = document.getElementById('new-child-name').value.trim() || 'SubBase_Derivada';
    const filterCol = document.getElementById('pivot-filter-col').value;
    const filterVal = document.getElementById('pivot-filter-val').value.trim().toLowerCase();

    // Filtrar los datos principales basados en el pivote condicional
    const filteredData = state.parentData.filter(row => {
        if (!filterVal) return true; // Si está vacío, pasa todo
        const cellValue = String(row[filterCol] || '').toLowerCase();
        return cellValue.includes(filterVal);
    });

    const childContainer = document.getElementById('child-table-container');
    
    if (filteredData.length === 0) {
        childContainer.innerHTML = `<p style="color: #e74c3c;">No se encontraron registros que coincidan con el criterio pivote en la columna <strong>${filterCol}</strong>.</p>`;
        return;
    }

    // Renderizar la tabla hija resultante
    let childHtml = `<h3>Resultado: ${childName} (${filteredData.length} registros filtrados)</h3>`;
    childHtml += '<table><thead><tr>';
    state.parentColumns.forEach(col => {
        childHtml += `<th>${col.name}</th>`;
    });
    childHtml += '</tr></thead><tbody>';

    filteredData.forEach(row => {
        childHtml += '<tr>';
        state.parentColumns.forEach(col => {
            childHtml += `<td>${row[col.name]}</td>`;
        });
        childHtml += '</tr>';
    });

    childHtml += '</tbody></table>';
    childContainer.innerHTML = childHtml;
});
