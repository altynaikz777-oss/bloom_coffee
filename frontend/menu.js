const API = "http://localhost:3000";

const grid = document.getElementById("menuGrid");
const message = document.getElementById("menuMessage");
const tabs = document.querySelectorAll("#menuTabs a");

let products = [];
let currentCategory = "coffee";

function renderCard(product) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.category = product.category;

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

  // "Add to cart" button
  const add = document.createElement("a");
  add.href = "#";
  add.className = "btn-add";
  add.textContent = "Add to cart";

  add.addEventListener("click", function (e) {
    e.preventDefault();

    // 1. Is the user logged in? (login saves "bloomUser" in localStorage)
    if (localStorage.getItem("bloomUser") === null) {
      alert("Please log in first!");
      window.location.href = "home.html?login=1";
      return;
    }

    // 2. Put the product in the cart (addToCart is in cart.js)
    addToCart(product);
    add.textContent = "Added";
  });

  footer.append(price, add);
  content.append(title, desc, footer);
  card.append(img, content);
  return card;
}

function showProducts() {
  grid.innerHTML = "";
  const visible = products.filter((p) => p.category === currentCategory);
  message.textContent = visible.length ? "" : "No products in this category.";
  visible.forEach((p) => grid.appendChild(renderCard(p)));
}

async function loadProducts() {
  try {
    const response = await fetch(`${API}/products`);
    if (!response.ok) throw new Error("Could not load products");
    products = await response.json();
    showProducts();
  } catch (err) {
    console.error(err);
    message.textContent = "Cannot load the menu. Is the server running?";
  }
}

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
