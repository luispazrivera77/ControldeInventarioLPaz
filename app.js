// Referencias DOM
const productsDiv = document.getElementById("products");
const emptyState = document.getElementById("emptyState");
const addProductBtn = document.getElementById("addProductBtn");
const formContainer = document.getElementById("formContainer");
const productForm = document.getElementById("productForm");
const cancelBtn = document.getElementById("cancelBtn");
const searchInput = document.getElementById("searchInput");
const filterAlert = document.getElementById("filterAlert");
const themeSelect = document.getElementById("themeSelect");
const historyDiv = document.getElementById("history");

// Datos
let products = JSON.parse(localStorage.getItem("products") || "[]");
let history = JSON.parse(localStorage.getItem("history") || "[]");

// Guardar en localStorage
function saveData() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("history", JSON.stringify(history));
}

// Estado visual
function getStatus(prod) {
  if (prod.stock <= 0) return "status-red";
  if (prod.stock <= prod.min) return "status-yellow";
  return "status-green";
}

// Renderizar productos
function renderProducts() {
  productsDiv.innerHTML = "";
  const term = searchInput.value.toLowerCase();
  const filter = filterAlert.value;

  const filtered = products.filter(p => {
    const match = p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
    const alertStatus = getStatus(p) !== "status-green";
    return match && (filter === "all" || (filter === "alert" && alertStatus));
  });

  emptyState.classList.toggle("hidden", filtered.length > 0);

  filtered.forEach((p, idx) => {
    const tpl = document.getElementById("productCardTpl").content.cloneNode(true);
    tpl.querySelector(".prod-name").textContent = p.name;
    tpl.querySelector(".prod-stock").textContent = `Stock: ${p.stock}`;
    const dot = tpl.querySelector(".status-dot");
    dot.classList.add(getStatus(p));

    // Barra de progreso
    const fill = tpl.querySelector(".stock-fill");
    const percent = Math.min(100, (p.stock / (p.min || 1)) * 100);
    fill.style.width = `${percent}%`;
    fill.style.background = getStatus(p) === "status-green" ? "#4CB944" :
                            getStatus(p) === "status-yellow" ? "#FFD166" : "#E63946";

    // Acciones
    tpl.querySelector(".edit").addEventListener("click", () => editProduct(idx));
    tpl.querySelector(".delete").addEventListener("click", () => deleteProduct(idx));
    tpl.querySelector(".moveIn").addEventListener("click", () => moveStock(idx, "in"));
    tpl.querySelector(".moveOut").addEventListener("click", () => moveStock(idx, "out"));

    productsDiv.appendChild(tpl);
  });

  renderReports();
}

// Renderizar historial
function renderHistory() {
  historyDiv.innerHTML = "";
  if (history.length === 0) {
    historyDiv.textContent = "Sin movimientos aún.";
    return;
  }
  history.slice().reverse().forEach(h => {
    const div = document.createElement("div");
    div.textContent = `${h.date} - ${h.type.toUpperCase()} - ${h.name} (${h.qty})`;
    historyDiv.appendChild(div);
  });
}

// Renderizar reportes
function renderReports() {
  const ctx1 = document.getElementById("stockChart").getContext("2d");
  const ctx2 = document.getElementById("salesChart").getContext("2d");

  const labels = products.map(p => p.name);
  const stockData = products.map(p => p.stock);
  const salesData = products.map(p => p.sales || 0);

  if (window.stockChartInstance) window.stockChartInstance.destroy();
  if (window.salesChartInstance) window.salesChartInstance.destroy();

  window.stockChartInstance = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Stock actual',
        data: stockData,
        backgroundColor: '#4CB944'
      }]
    }
  });

  window.salesChartInstance = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Movimientos (salidas)',
        data: salesData,
        backgroundColor: '#FF6B35'
      }]
    }
  });
}

// Abrir formulario
function openForm(editIndex = null) {
  formContainer.classList.remove("hidden");
  productForm.reset();
  document.getElementById("productIndex").value = editIndex !== null ? editIndex : "";
  if (editIndex !== null) {
    const p = products[editIndex];
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodCode").value = p.code;
    document.getElementById("prodCategory").value = p.category;
    document.getElementById("prodSupplier").value = p.supplier;
    document.getElementById("prodStock").value = p.stock;
    document.getElementById("prodMin").value = p.min;
    document.getElementById("prodBuy").value = p.buy;
    document.getElementById("prodSell").value = p.sell;
  }
}

// Cerrar formulario
function closeForm() {
  formContainer.classList.add("hidden");
}

// Guardar producto
productForm.addEventListener("submit", e => {
  e.preventDefault();
  const idx = document.getElementById("productIndex").value;
  const prod = {
    name: document.getElementById("prodName").value,
    code: document.getElementById("prodCode").value,
    category: document.getElementById("prodCategory").value,
    supplier: document.getElementById("prodSupplier").value,
    stock: parseInt(document.getElementById("prodStock").value),
    min: parseInt(document.getElementById("prodMin").value),
    buy: parseFloat(document.getElementById("prodBuy").value) || 0,
    sell: parseFloat(document.getElementById("prodSell").value) || 0,
    sales: products[idx]?.sales || 0
  };
  if (idx) {
    products[idx] = prod;
  } else {
    products.push(prod);
  }
  saveData();
  renderProducts();
  closeForm();
});

// Editar producto
function editProduct(idx) {
  openForm(idx);
}

// Eliminar producto
function deleteProduct(idx) {
  if (confirm("¿Eliminar este producto?")) {
    products.splice(idx, 1);
    saveData();
    renderProducts();
  }
}

// Movimiento de stock
function moveStock(idx, type) {
  const qty = parseInt(prompt(`Cantidad a ${type === "in" ? "ingresar" : "retirar"}:`));
  if (!qty || qty <= 0) return;
  if (type === "out" && products[idx].stock < qty) {
    alert("Stock insuficiente");
    return;
  }
  products[idx].stock += type === "in" ? qty : -qty;
  if (type === "out") products[idx].sales = (products[idx].sales || 0) + qty;
  history.push({
    date: new Date().toLocaleString(),
    type,
    name: products[idx].name,
    qty
  });
  saveData();
  renderProducts();
  renderHistory();
}

// Cambio de tema
themeSelect.addEventListener("change", () => {
  const theme = themeSelect.value;
  document.body.className = theme;
});

// Eventos
addProductBtn.addEventListener("click", () => openForm());
cancelBtn.addEventListener("click", closeForm);
searchInput.addEventListener("input", renderProducts);
filterAlert.addEventListener("change", renderProducts);

// Inicializar
renderProducts();
renderHistory();
