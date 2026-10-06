const API = "http://localhost:3000";
const user = JSON.parse(localStorage.getItem("bloomUser") || "null");
if (!user || user.role !== "admin") {
  window.location.href = "home.html";
}

function getAdminPassword(forcePrompt = false) {
  let password = sessionStorage.getItem("bloomAdminPassword");
  if (!password || forcePrompt) {
    password = prompt("Enter the admin password:");
    if (password) sessionStorage.setItem("bloomAdminPassword", password);
  }
  return password;
}
 
const grid = document.getElementById("productGrid");
const message = document.getElementById("adminMessage");
const tabs = document.querySelectorAll("#adminTabs a");
 
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editName = document.getElementById("editName");
const editPrice = document.getElementById("editPrice");
const editDescription = document.getElementById("editDescription");
const editImage = document.getElementById("editImage");
const editMessage = document.getElementById("editMessage");
 
let products = [];
let currentCategory = "all";
let editingId = null;
 
function showMessage(text) {
  message.textContent = text;
}
 

async function adminFetch(url, options) {
  const password = getAdminPassword();
  if (!password) throw new Error("Admin password is required");
 
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password,
    },
  });
  const data = await response.json();
 
  if (response.status === 403) {
    sessionStorage.removeItem("bloomAdminPassword");
    throw new Error("Wrong admin password. Try again.");
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
 
function renderCard(product) {
  const card = document.createElement("div");
  card.className = "card";
 
  const img = document.createElement("img");
  img.src = product.image || "./images/espresso.jpg";
  img.alt = product.name;
 
  const content = document.createElement("div");
  content.className = "card-content";
 
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = product.name;
 
  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = product.description || "";
 
  const footer = document.createElement("div");
  footer.className = "card-footer";
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = "$" + Number(product.price).toFixed(2);
  footer.appendChild(price);
 
  const actions = document.createElement("div");
  actions.className = "card-admin-actions";
 
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => openEdit(product));
 
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteProduct(product));
 
  actions.append(editBtn, deleteBtn);
  content.append(title, desc, footer, actions);
  card.append(img, content);
  return card;
}
 
function showProducts() {
  grid.innerHTML = "";
  const visible = products.filter(
    (p) => currentCategory === "all" || p.category === currentCategory,
  );
  if (visible.length === 0) {
    showMessage("No products in this category.");
    return;
  }
  showMessage("");
  visible.forEach((p) => grid.appendChild(renderCard(p)));
}
 // getting products from database
async function loadProducts() {
  try {
    const response = await fetch(`${API}/products`);
    if (!response.ok) throw new Error("Could not load products");
    products = await response.json();
    showProducts();
  } catch (err) {
    showMessage(err.message);
  }
}
 
// deleting products from database 
async function deleteProduct(product) {
  if (!confirm(`Delete "${product.name}"?`)) return;
  try {
    await adminFetch(`${API}/products/${product.id}`, { method: "DELETE" });
    products = products.filter((p) => p.id !== product.id);
    showProducts();
    showMessage(`"${product.name}" deleted.`);
  } catch (err) {
    showMessage(err.message);
  }
}
 
// editing products from database
function openEdit(product) {
  editingId = product.id;
  editName.value = product.name;
  editPrice.value = product.price;
  editDescription.value = product.description || "";
  editImage.value = product.image || "";
  editMessage.textContent = "";
  editModal.classList.add("open");
}
 
function closeEdit() {
  editModal.classList.remove("open");
  editingId = null;
}
 
document.getElementById("editClose").addEventListener("click", closeEdit);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEdit();
});
 // editing products from database
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  editMessage.textContent = "";
 
  try {
    const data = await adminFetch(`${API}/products/${editingId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: editName.value.trim(),
        price: editPrice.value,
        description: editDescription.value.trim(),
        image: editImage.value.trim(),
      }),
    });
 
    products = products.map((p) => (p.id === editingId ? data.product : p));
    closeEdit();
    showProducts();
    showMessage("Product updated.");
  } catch (err) {
    editMessage.textContent = err.message;
  }
});
 

tabs.forEach((tab) => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();
    currentCategory = tab.dataset.category;
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    showProducts();
  });
});
 
loadProducts();
 