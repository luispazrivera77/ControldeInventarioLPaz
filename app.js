// StockSense - Sistema de Inventario Inteligente
// Funcionalidades: CRUD productos, gestión de stock, alertas, reportes, temas

class InventoryManager {
  constructor() {
    this.products = this.loadFromStorage('inventory') || [];
    this.history = this.loadFromStorage('inventory-history') || [];
    this.currentTheme = this.loadFromStorage('current-theme') || 'acero';
    this.charts = {};
    
    this.init();
  }

  // Inicialización
  init() {
    this.bindEvents();
    this.applyTheme(this.currentTheme);
    this.renderProducts();
    this.renderHistory();
    this.initCharts();
    this.updateStats();
  }

  // Event Listeners
  bindEvents() {
    // Botones principales
    document.getElementById('addProductBtn').addEventListener('click', () => this.showForm());
    document.getElementById('cancelBtn').addEventListener('click', () => this.hideForm());
    document.getElementById('productForm').addEventListener('submit', (e) => this.saveProduct(e));
    
    // Filtros y búsqueda
    document.getElementById('searchInput').addEventListener('input', (e) => this.filterProducts(e.target.value));
    document.getElementById('filterAlert').addEventListener('change', (e) => this.filterByAlert(e.target.value));
    document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));

    // Eventos del teclado
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.showForm();
      }
      if (e.key === 'Escape') {
        this.hideForm();
      }
    });
  }

  // Gestión del formulario
  showForm(product = null, index = null) {
    const form = document.getElementById('formContainer');
    const title = document.getElementById('formTitle');
    
    if (product) {
      title.textContent = 'Editar producto';
      document.getElementById('productIndex').value = index;
      this.populateForm(product);
    } else {
      title.textContent = 'Nuevo producto';
      document.getElementById('productForm').reset();
      document.getElementById('productIndex').value = '';
    }
    
    form.classList.remove('hidden');
    document.getElementById('prodName').focus();
  }

  populateForm(product) {
    document.getElementById('prodName').value = product.name || '';
    document.getElementById('prodCode').value = product.code || '';
    document.getElementById('prodCategory').value = product.category || '';
    document.getElementById('prodSupplier').value = product.supplier || '';
    document.getElementById('prodStock').value = product.stock || 0;
    document.getElementById('prodMin').value = product.minStock || 0;
    document.getElementById('prodBuy').value = product.buyPrice || '';
    document.getElementById('prodSell').value = product.sellPrice || '';
  }

  hideForm() {
    document.getElementById('formContainer').classList.add('hidden');
  }

  saveProduct(e) {
    e.preventDefault();
    
    const index = document.getElementById('productIndex').value;
    const product = this.getFormData();
    
    if (!this.validateProduct(product)) return;
    
    if (index !== '') {
      const oldProduct = this.products[index];
      this.products[index] = { ...product, id: oldProduct.id, createdAt: oldProduct.createdAt };
      this.addToHistory(`Producto "${product.name}" actualizado`);
    } else {
      product.id = this.generateId();
      product.createdAt = new Date().toISOString();
      this.products.push(product);
      this.addToHistory(`Producto "${product.name}" creado`);
    }

    this.saveToStorage();
    this.renderProducts();
    this.updateCharts();
    this.updateStats();
    this.hideForm();
    this.showNotification('Producto guardado exitosamente', 'success');
  }

  getFormData() {
    return {
      name: document.getElementById('prodName').value.trim(),
      code: document.getElementById('prodCode').value.trim(),
      category: document.getElementById('prodCategory').value.trim(),
      supplier: document.getElementById('prodSupplier').value.trim(),
      stock: parseInt(document.getElementById('prodStock').value) || 0,
      minStock: parseInt(document.getElementById('prodMin').value) || 0,
      buyPrice: parseFloat(document.getElementById('prodBuy').value) || 0,
      sellPrice: parseFloat(document.getElementById('prodSell').value) || 0,
      lastUpdate: new Date().toISOString()
    };
  }

  validateProduct(product) {
    if (!product.name) {
      this.showNotification('El nombre del producto es obligatorio', 'error');
      return false;
    }
    
    if (product.stock < 0) {
      this.showNotification('El stock no puede ser negativo', 'error');
      return false;
    }
    
    if (product.minStock < 0) {
      this.showNotification('El stock mínimo no puede ser negativo', 'error');
      return false;
    }
    
    return true;
  }

  // CRUD Operations
  deleteProduct(index) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    const product = this.products[index];
    this.products.splice(index, 1);
    this.addToHistory(`Producto "${product.name}" eliminado`);
    this.saveToStorage();
    this.renderProducts();
    this.updateCharts();
    this.updateStats();
    this.showNotification('Producto eliminado', 'success');
  }

  moveStock(index, type) {
    const product = this.products[index];
    const quantity = this.promptQuantity(type, product);
    
    if (!quantity) return;
    
    const oldStock = product.stock;
    
    if (type === 'in') {
      product.stock += quantity;
    } else {
      if (quantity > product.stock) {
        this.showNotification('No hay suficiente stock disponible', 'error');
        return;
      }
      product.stock -= quantity;
    }
    
    const action = type === 'in' ? 'Entrada' : 'Salida';
    this.addToHistory(`${action}: ${product.name} - ${oldStock} → ${product.stock} (${type === 'in' ? '+' : '-'}${quantity})`);
    
    product.lastUpdate = new Date().toISOString();
    this.saveToStorage();
    this.renderProducts();
    this.updateCharts();
    this.updateStats();
    this.showNotification(`${action} registrada exitosamente`, 'success');
  }

  promptQuantity(type, product) {
    const message = type === 'in' ? 
      `Entrada de stock para "${product.name}"\nStock actual: ${product.stock}` :
      `Salida de stock para "${product.name}"\nStock actual: ${product.stock}\nStock disponible: ${product.stock}`;
    
    const quantity = prompt(message + '\n\nCantidad:');
    
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
      if (quantity !== null) {
        this.showNotification('Cantidad inválida', 'error');
      }
      return null;
    }
    
    return parseInt(quantity);
  }

  // Renderizado
  renderProducts() {
    const container = document.getElementById('products');
    const empty = document.getElementById('emptyState');
    
    if (this.products.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    
    empty.style.display = 'none';
    container.innerHTML = '';
    
    this.products.forEach((product, index) => {
      const card = this.createProductCard(product, index);
      container.appendChild(card);
    });
  }

  createProductCard(product, index) {
    const template = document.getElementById('productCardTpl');
    const card = template.content.cloneNode(true);
    
    // Información básica
    card.querySelector('.prod-name').textContent = product.name;
    
    // Stock info
    const stockInfo = `Stock: ${product.stock} / Mín: ${product.minStock}`;
    const categoryInfo = product.category ? ` • ${product.category}` : '';
    card.querySelector('.prod-stock').textContent = stockInfo + categoryInfo;
    
    // Barra de progreso
    const fillPercent = this.calculateStockPercentage(product);
    const fill = card.querySelector('.stock-fill');
    fill.style.width = fillPercent + '%';
    
    // Estado de alerta
    const statusDot = card.querySelector('.status-dot');
    if (product.stock <= product.minStock) {
      statusDot.classList.add('alert');
      fill.classList.add('low');
    }
    
    // Información adicional (tooltip)
    const cardElement = card.querySelector('.product-card');
    cardElement.title = this.buildTooltip(product);
    
    // Event listeners
    card.querySelector('.edit').addEventListener('click', () => this.showForm(product, index));
    card.querySelector('.delete').addEventListener('click', () => this.deleteProduct(index));
    card.querySelector('.moveIn').addEventListener('click', () => this.moveStock(index, 'in'));
    card.querySelector('.moveOut').addEventListener('click', () => this.moveStock(index, 'out'));
    
    return card;
  }

  calculateStockPercentage(product) {
    if (product.minStock === 0) return product.stock > 0 ? 100 : 0;
    return Math.min(100, Math.max(0, (product.stock / (product.minStock * 2)) * 100));
  }

  buildTooltip(product) {
    let tooltip = `Código: ${product.code || 'N/A'}\n`;
    tooltip += `Proveedor: ${product.supplier || 'N/A'}\n`;
    tooltip += `Precio compra: $${product.buyPrice || 0}\n`;
    tooltip += `Precio venta: $${product.sellPrice || 0}\n`;
    tooltip += `Última actualización: ${new Date(product.lastUpdate).toLocaleDateString('es-ES')}`;
    return tooltip;
  }

  // Historial
  addToHistory(action) {
    this.history.unshift({
      id: this.generateId(),
      action,
      timestamp: new Date().toISOString()
    });
    
    // Mantener solo los últimos 100 registros
    this.history = this.history.slice(0, 100);
    localStorage.setItem('inventory-history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    const container = document.getElementById('history');
    if (this.history.length === 0) {
      container.innerHTML = '<div class="empty">No hay movimientos registrados.</div>';
      return;
    }
    
    const historyHTML = this.history.slice(0, 15).map(entry => {
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="history-item" style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <span style="flex: 1;">${entry.action}</span>
          <small style="color: #64748b; white-space: nowrap; margin-left: 12px;">${formattedDate}</small>
        </div>
      `;
    }).join('');
    
    container.innerHTML = historyHTML;
  }

  // Filtros
  filterProducts(searchTerm) {
    const cards = document.querySelectorAll('.product-card');
    const term = searchTerm.toLowerCase();
    
    cards.forEach(card => {
      const name = card.querySelector('.prod-name').textContent.toLowerCase();
      const stock = card.querySelector('.prod-stock').textContent.toLowerCase();
      const visible = name.includes(term) || stock.includes(term);
      card.style.display = visible ? 'block' : 'none';
    });
    
    this.updateFilterStats(searchTerm);
  }

  filterByAlert(filter) {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
      const hasAlert = card.querySelector('.status-dot').classList.contains('alert');
      const visible = filter === 'all' || (filter === 'alert' && hasAlert);
      card.style.display = visible ? 'block' : 'none';
    });
  }

  updateFilterStats(searchTerm) {
    if (searchTerm) {
      const visibleCards = document.querySelectorAll('.product-card[style*="block"], .product-card:not([style])');
      const total = document.querySelectorAll('.product-card').length;
      console.log(`Mostrando ${visibleCards.length} de ${total} productos`);
    }
  }

  // Temas
  changeTheme(theme) {
    this.currentTheme = theme;
    this.applyTheme(theme);
    localStorage.setItem('current-theme', theme);
  }

  applyTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-acero', 'theme-oscuro', 'theme-claro');
    
    switch(theme) {
      case 'oscuro':
        body.classList.add('theme-oscuro');
        this.addDarkThemeStyles();
        break;
      case 'claro':
        body.classList.add('theme-claro');
        this.addLightThemeStyles();
        break;
      default:
        body.classList.add('theme-acero');
        // El tema por defecto ya está en el CSS
    }
  }

  addDarkThemeStyles() {
    let darkStyles = document.getElementById('dark-theme-styles');
    if (!darkStyles) {
      darkStyles = document.createElement('style');
      darkStyles.id = 'dark-theme-styles';
      document.head.appendChild(darkStyles);
    }
    
    darkStyles.textContent = `
      .theme-oscuro {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
        color: #e2e8f0 !important;
      }
      .theme-oscuro .topbar {
        background: rgba(30, 41, 59, 0.95) !important;
      }
      .theme-oscuro .card {
        background: #1e293b !important;
        color: #e2e8f0 !important;
        border: 1px solid #334155 !important;
      }
      .theme-oscuro .product-card {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        border-color: #475569 !important;
      }
      .theme-oscuro input, .theme-oscuro select {
        background: #334155 !important;
        color: #e2e8f0 !important;
        border-color: #475569 !important;
      }
      .theme-oscuro .empty {
        background: #334155 !important;
        border-color: #475569 !important;
      }
    `;
  }

  addLightThemeStyles() {
    let lightStyles = document.getElementById('light-theme-styles');
    if (!lightStyles) {
      lightStyles = document.createElement('style');
      lightStyles.id = 'light-theme-styles';
      document.head.appendChild(lightStyles);
    }
    
    lightStyles.textContent = `
      .theme-claro {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
        color: #1e293b !important;
      }
      .theme-claro .topbar {
        background: rgba(255, 255, 255, 0.98) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }
      .theme-claro .card {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
      }
      .theme-claro .product-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
      }
    `;
  }

  // Charts
  initCharts() {
    this.initStockChart();
    this.initSalesChart();
  }

  initStockChart() {
    const ctx = document.getElementById('stockChart')?.getContext('2d');
    if (!ctx) return;
    
    this.charts.stock = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Stock Actual',
          data: [],
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 1
        }, {
          label: 'Stock Mínimo',
          data: [],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Niveles de Stock por Producto'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    this.updateStockChart();
  }

  initSalesChart() {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    
    this.charts.sales = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#4f46e5', '#06d6a0', '#f72585', '#f77f00',
            '#fcbf49', '#d90429', '#8ecae6', '#219ebc'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Productos por Categoría'
          }
        }
      }
    });
    
    this.updateSalesChart();
  }

  updateCharts() {
    this.updateStockChart();
    this.updateSalesChart();
  }

  updateStockChart() {
    if (!this.charts.stock) return;
    
    const topProducts = this.products
      .slice(0, 10)
      .map(p => ({ name: p.name, stock: p.stock, minStock: p.minStock }));
    
    this.charts.stock.data.labels = topProducts.map(p => p.name);
    this.charts.stock.data.datasets[0].data = topProducts.map(p => p.stock);
    this.charts.stock.data.datasets[1].data = topProducts.map(p => p.minStock);
    this.charts.stock.update();
  }

  updateSalesChart() {
    if (!this.charts.sales) return;
    
    const categories = {};
    this.products.forEach(product => {
      const category = product.category || 'Sin categoría';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    this.charts.sales.data.labels = Object.keys(categories);
    this.charts.sales.data.datasets[0].data = Object.values(categories);
    this.charts.sales.update();
  }

  // Estadísticas
  updateStats() {
    const totalProducts = this.products.length;
    const lowStockProducts = this.products.filter(p => p.stock <= p.minStock).length;
    const totalValue = this.products.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
    
    console.log(`Estadísticas:
    - Total productos: ${totalProducts}
    - Productos con stock bajo: ${lowStockProducts}
    - Valor total inventario: $${totalValue.toFixed(2)}`);
  }

  // Notificaciones
  showNotification(message, type = 'info') {
    // Crear o actualizar elemento de notificación
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      document.body.appendChild(notification);
    }
    
    // Colores según tipo
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
    }, 3000);
  }

  // Utilidades
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  loadFromStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  saveToStorage() {
    localStorage.setItem('inventory', JSON.stringify(this.products));
  }

  // Exportar/Importar datos
  exportData() {
    const data = {
      products: this.products,
      history: this.history,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Datos exportados exitosamente', 'success');
  }

  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.products && Array.isArray(data.products)) {
          this.products = data.products;
          if (data.history && Array.isArray(data.history)) {
            this.history = data.history;
          }
          this.saveToStorage();
          this.renderProducts();
          this.renderHistory();
          this.updateCharts();
          this.updateStats();
          this.showNotification('Datos importados exitosamente', 'success');
        } else {
          throw new Error('Formato inválido');
        }
      } catch {
        this.showNotification('Error al importar datos', 'error');
      }
    };
    reader.readAsText(file);
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.inventoryApp = new InventoryManager();
  
  // Agregar funciones globales útiles
  window.exportInventory = () => window.inventoryApp.exportData();
  
  console.log('StockSense - Sistema de Inventario Inteligente iniciado ✅');
  console.log('Atajos de teclado:');
  console.log('- Ctrl+N: Nuevo producto');
  console.log('- Esc: Cerrar formulario');
  console.log('- Función global: exportInventory() para exportar datos');
});
