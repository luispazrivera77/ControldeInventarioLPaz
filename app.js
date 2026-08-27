const state = {
    parentColumns: [],
    parentData: [],
    derivedCount: 0,
    workbookInstance: null
};

// Navegación tipo SPA
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.app-view');
const pageTitle = document.getElementById('page-title');

function switchView(targetId) {
    views.forEach(v => v.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');

    navItems.forEach(btn => {
        if (btn.getAttribute('data-target') === targetId) {
            btn.classList.add('active');
            pageTitle.textContent = btn.textContent.trim().replace(/^[^\w\s]+/, '').trim();
        } else {
            btn.classList.remove('active');
        }
    });
    updateStats();
}

navItems.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-target')));
});

function updateStats() {
    document.getElementById('stat-records').textContent = document.querySelectorAll('#table-body tr').length || state.parentData.length;
    document.getElementById('stat-columns').textContent = state.parentColumns.length;
    document.getElementById('stat-derived').textContent = state.derivedCount;
}

// Lógica de Columnas y Matriz
document.getElementById('add-col-btn').addEventListener('click', () => {
    const name = document.getElementById('col-name').value.trim();
    const type = document.getElementById('col-type').value;
    if (!name) return alert('Ingresa un nombre');
    state.parentColumns.push({ name, type });
    document.getElementById('col-name').value = '';
    renderColumnsList();
});

function renderColumnsList() {
    const list = document.getElementById('columns-list');
    if (state.parentColumns.length === 0) {
        list.innerHTML = '<em>Sin columnas</em>';
        return;
    }
    list.innerHTML = state.parentColumns.map(c => `<li>${c.name} (${c.type})</li>`).join('');
}

document.getElementById('create-table-btn').addEventListener('click', () => {
    if (state.parentColumns.length === 0) return alert('Define columnas primero');
    renderEditableTable();
    switchView('view-data');
});

function renderEditableTable(data = null) {
    let html = '<table><thead><tr>';
    state.parentColumns.forEach(c => html += `<th>${c.name}</th>`);
    html += '<th>Acciones</th></tr></thead><tbody id="table-body">';

    const rowsToGen = data || [{}, {}, {}];
    rowsToGen.forEach(row => html += generateRowHtml(row));
    html += '</tbody></table>';
    
    document.getElementById('table-container').innerHTML = html;
    updateStats();
}

function generateRowHtml(values = {}) {
    let html = '<tr>';
    state.parentColumns.forEach(col => {
        const val = values[col.name] !== undefined ? values[col.name] : '';
        const inputType = col.type === 'number' ? 'number' : (col.type === 'date' ? 'date' : 'text');
        if (col.type === 'boolean') {
            html += `<td><input type="checkbox" class="cell-input" ${val ? 'checked' : ''}></td>`;
        } else {
            html += `<td><input type="${inputType}" class="cell-input" value="${val}"></td>`;
        }
    });
    html += `<td><button class="btn btn-secondary" style="padding:4px 8px;" onclick="this.closest('tr').remove(); updateStats();">X</button></td></tr>`;
    return html;
}

document.getElementById('add-row-btn').addEventListener('click', () => {
    document.getElementById('table-body').insertAdjacentHTML('beforeend', generateRowHtml());
    updateStats();
});

// Importar Excel
const excelInput = document.getElementById('excel-file-input');
excelInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        state.workbookInstance = wb;
        const select = document.getElementById('sheet-select');
        select.innerHTML = wb.SheetNames.map(s => `<option value="${s}">${s}</option>`).join('');
        document.getElementById('sheet-selector-container').classList.remove('hidden');
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById('load-sheet-btn').addEventListener('click', () => {
    const sheetName = document.getElementById('sheet-select').value;
    const ws = state.workbookInstance.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (json.length === 0) return alert('Hoja vacía');

    state.parentColumns = json[0].map(h => ({ name: String(h || 'Col'), type: 'string' }));
    state.parentData = json.slice(1).map(row => {
        const obj = {};
        state.parentColumns.forEach((col, i) => obj[col.name] = row[i] !== undefined ? row[i] : '');
        return obj;
    });

    renderEditableTable(state.parentData);
    switchView('view-data');
});

// Motor Pivote / Derivación
document.querySelector('[data-target="view-pivot"]').addEventListener('click', () => {
    collectDOMData();
    const sel = document.getElementById('pivot-filter-col');
    sel.innerHTML = state.parentColumns.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
});

function collectDOMData() {
    const rows = document.querySelectorAll('#table-body tr');
    state.parentData = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.cell-input');
        const obj = {};
        state.parentColumns.forEach((col, i) => {
            obj[col.name] = col.type === 'boolean' ? inputs[i].checked : inputs[i].value;
        });
        state.parentData.push(obj);
    });
}

document.getElementById('generate-child-btn').addEventListener('click', () => {
    collectDOMData();
    const filterCol = document.getElementById('pivot-filter-col').value;
    const filterVal = document.getElementById('pivot-filter-val').value.trim().toLowerCase();
    const childName = document.getElementById('new-child-name').value.trim() || 'SubBase';

    const filtered = state.parentData.filter(r => !filterVal || String(r[filterCol] || '').toLowerCase().includes(filterVal));
    
    state.derivedCount++;
    updateStats();

    let html = `<h3>Sub-base: ${childName} (${filtered.length} filas)</h3><table><thead><tr>`;
    state.parentColumns.forEach(c => html += `<th>${c.name}</th>`);
    html += '</tr></thead><tbody>';
    filtered.forEach(r => {
        html += '<tr>';
        state.parentColumns.forEach(c => html += `<td>${r[c.name]}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';

    document.getElementById('child-table-container').innerHTML = html;
});
