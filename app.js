let state = { cols: [], data: [], wb: null };
let currentIndex = 0;

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

// Estructura y Columnas
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
    currentIndex = 0;
    state.data = [{}];
    renderFormView();
    goTo('data');
});

// Vista de Formularios
function renderFormView() {
    if (state.data.length === 0) state.data = [{}];
    if (currentIndex >= state.data.length) currentIndex = state.data.length - 1;
    if (currentIndex < 0) currentIndex = 0;

    const record = state.data[currentIndex] || {};
    const container = document.getElementById('form-card');
    
    let html = '';
    state.cols.forEach(c => {
        const val = record[c.name] !== undefined ? record[c.name] : '';
        const t = c.type === 'number' ? 'number' : (c.type === 'date' ? 'date' : 'text');
        
        html += `<div class="form-field"><label>${c.name} (${c.type})</label>`;
        if (c.type === 'boolean') {
            html += `<input type="checkbox" class="cell" data-col="${c.name}" ${val ? 'checked' : ''}>`;
        } else {
            html += `<input type="${t}" class="cell" data-col="${c.name}" value="${val}">`;
        }
        html += `</div>`;
    });
    
    container.innerHTML = html;
    document.getElementById('record-indicator').textContent = `${currentIndex + 1} / ${state.data.length}`;
}

function saveCurrentForm() {
    if (state.data.length === 0) return;
    const inputs = document.querySelectorAll('#form-card .cell');
    const obj = {};
    inputs.forEach(input => {
        const colName = input.dataset.col;
        obj[colName] = input.type === 'checkbox' ? input.checked : input.value;
    });
    state.data[currentIndex] = obj;
}

document.getElementById('next-row-btn').addEventListener('click', () => {
    saveCurrentForm();
    if (currentIndex < state.data.length - 1) {
        currentIndex++;
        renderFormView();
    }
});

document.getElementById('prev-row-btn').addEventListener('click', () => {
    saveCurrentForm();
    if (currentIndex > 0) {
        currentIndex--;
        renderFormView();
    }
});

document.getElementById('add-form-btn').addEventListener('click', () => {
    saveCurrentForm();
    state.data.push({});
    currentIndex = state.data.length - 1;
    renderFormView();
});

// Importar Excel
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

        currentIndex = 0;
        renderFormView();
        goTo('data');
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

// Pivotes
function initPivot() {
    saveCurrentForm();
    const sel = document.getElementById('pivot-filter-col');
    sel.innerHTML = state.cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

document.getElementById('generate-child-btn').addEventListener('click', () => {
    saveCurrentForm();
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
