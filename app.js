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

let products = JSON.parse(localStorage.getItem("products") || "[]");
let history = JSON.parse(localStorage.getItem("history") || "[]");

function saveData() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("history", JSON.stringify(history));
}

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
    dot.classList
