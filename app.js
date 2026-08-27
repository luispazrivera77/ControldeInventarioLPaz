const state = { cols: [], data: [], wb: null };

function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    
    document.querySelectorAll('.dock-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === screenId);
    });

    if(screenId === 'pivot') initPivot();
}

document.querySelectorAll('.dock-btn').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.view));
});

// Columnas
document.getElementById('add-col-btn').addEventListener('click', () => {
    const name = document.getElementById('col-name').value.trim();
    const type = document.getElementById('col-type').value;
    if(!name) return;
    
    state.cols.push({ name, type });
    document.getElementById('col-name').value = '';
    renderChips();
});

function renderChips() {
    const container = document.getElementById('columns-chips');
    container.innerHTML = state.cols.map(c => `<span class="chip">${c.name} (${c.type})</span>`).join('');
    document.getElementById('create-table-btn').classList.toggle('hidden', state.cols.length === 0);
}

document.getElementById('create-table-btn').addEventListener('click', () => {
    renderTable();
    goTo('data');
});

function renderTable(customData = null) {
    let html = '<table><thead><tr>';
    state.cols.forEach(c => html += `<th>${c.name}</th>`);
    html += '<th></th></tr></thead><tbody id="tbody">';
    
    const rows = customData || [{}, {}, {}];
    rows.forEach(r => html += rowHtml(r));
    html += '</tbody></table>';
    
    document.getElementById('table-container').innerHTML = html;
}

function rowHtml(vals = {}) {
    let h = '<tr>';
    state.cols.forEach(c => {
        const v = vals[c.name] !== undefined ? vals[c.name] : '';
        const t = c.type === 'number' ? 'number' : (c.type === 'date' ? 'date' : 'text');
        h += c.type === 'boolean' 
            ? `<td><input type="checkbox" class="cell" ${v?'checked':''}></td>`
            : `<td><input type="${t}" class="cell" value="${v}"></td>`;
    });
    return h + `<td><button class="btn" onclick="this.closest('tr').remove()">×</button></td></tr>`;
}

document.getElementById('add-row-btn').addEventListener('click', () => {
    document.getElementById('tbody').insertAdjacentHTML('beforeend', rowHtml());
});

// Excel
document.getElementById('excel-file-input').addEventListener('change', e => {
    const reader = new FileReader();
    reader.onload = ev => {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if(!json.length) return;

        state.cols = json[0].map(h => ({ name: String(h || 'Col'), type: 'string' }));
        state.data = json.slice(1).map(row => {
            const obj = {};
            state.cols.forEach((c, i) => obj[c.name] = row[i] !== undefined ? row[i] : '');
            return obj;
        });

        renderTable(state.data);
        goTo('data');
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

// Pivotes
function initPivot() {
    collectDOM();
    const sel = document.getElementById('pivot-filter-col');
    sel.innerHTML = state.cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function collectDOM() {
    state.data = [];
    document.querySelectorAll('#tbody tr').forEach(row => {
        const inputs = row.querySelectorAll('.cell');
        const obj = {};
        state.cols.forEach((c, i) => {
            obj[c.name] = c.type === 'boolean' ? inputs[i].checked : inputs[i].value;
        });
        state.data.push(obj);
    });
}

document.getElementById('generate-child-btn').addEventListener('click', () => {
    collectDOM();
    const col = document.getElementById('pivot-filter-col').value;
    const val = document.getElementById('pivot-filter-val').value.trim().toLowerCase();
    
    const filtered = state.data.filter(r => !val || String(r[col] || '').toLowerCase().includes(val));

    let h = `<table><thead><tr>`;
    state.cols.forEach(c => h += `<th>${c.name}</th>`);
    h += '</tr></thead><tbody>';
    filtered.forEach(r => {
        h += '<tr>';
        state.cols.forEach(c => h += `<td>${r[c.name]}</td>`);
        h += '</tr>';
    });
    h += '</tbody></table>';

    document.getElementById('child-table-container').innerHTML = h;
});
