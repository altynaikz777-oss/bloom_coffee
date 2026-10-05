// ==========================================================
// CART
// The cart is an array saved in localStorage under the name "bloomCart".
// One item looks like this:
//   { id: 3, name: "Latte", price: 4.5, image: "latte.jpg", qty: 2 }
// ==========================================================

// Get the cart from localStorage
function getCart() {
  const saved = localStorage.getItem("bloomCart");
  if (saved === null) {
    return []; // nothing saved yet, so the cart is empty
  }
  return JSON.parse(saved); // text -> array
}

// Save the cart to localStorage
function saveCart(cart) {
  localStorage.setItem("bloomCart", JSON.stringify(cart)); // array -> text
  showCartCount();
}

// Add one product to the cart (used by menu.js)
function addToCart(product) {
  const cart = getCart();

  // 1. if the product is already in the cart, make qty bigger by 1
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === product.id) {
      cart[i].qty = cart[i].qty + 1;
      saveCart(cart);
      return;
    }
  }

  // 2. if it is not in the cart yet, add it as a new item
  cart.push({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.image,
    qty: 1,
  });
  saveCart(cart);
}

// Show the number of items in the header: Cart (3)
function showCartCount() {
  const link = document.querySelector('header nav a[href="cart.html"]');
  if (link === null) {
    return;
  }

  const cart = getCart();
  let count = 0;
  for (let i = 0; i < cart.length; i++) {
    count = count + cart[i].qty;
  }

  if (count > 0) {
    link.textContent = "Cart (" + count + ")";
  } else {
    link.textContent = "Cart";
  }
}

// ==========================================================
// CART PAGE (this part only does something on cart.html)
// ==========================================================

// 4.5 -> "$4.50"
function money(number) {
  return "$" + number.toFixed(2);
}

// Make one row of the cart (one product)
function makeCartRow(item) {
  const row = document.createElement("div");
  row.className = "cart-item";

  const img = document.createElement("img");
  img.src = item.image;
  img.alt = item.name;

  const details = document.createElement("div");
  details.className = "cart-item-details";

  const title = document.createElement("div");
  title.className = "cart-item-title";
  title.textContent = item.name;

  const price = document.createElement("div");
  price.className = "cart-item-price";
  price.textContent = money(item.price) + " each";

  details.append(title, price);

  // the  -  1  +  buttons
  const control = document.createElement("div");
  control.className = "quantity-control";

  const minus = document.createElement("button");
  minus.textContent = "-";
  minus.addEventListener("click", function () {
    changeQty(item.id, -1);
  });

  const qty = document.createElement("span");
  qty.textContent = item.qty;

  const plus = document.createElement("button");
  plus.textContent = "+";
  plus.addEventListener("click", function () {
    changeQty(item.id, 1);
  });

  control.append(minus, qty, plus);

  // price x quantity
  const total = document.createElement("div");
  total.className = "cart-item-total";
  total.textContent = money(item.price * item.qty);

  const remove = document.createElement("a");
  remove.href = "#";
  remove.className = "remove-link";
  remove.textContent = "Remove";
  remove.addEventListener("click", function (e) {
    e.preventDefault();
    removeItem(item.id);
  });

  row.append(img, details, control, total, remove);
  return row;
}

// Change the quantity: change is +1 or -1
function changeQty(id, change) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      cart[i].qty = cart[i].qty + change;

      if (cart[i].qty <= 0) {
        cart.splice(i, 1); // remove this item from the array
      }
      break; // we found it, stop the loop
    }
  }

  saveCart(cart);
  showCart();
}

// Remove a product from the cart completely
function removeItem(id) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      cart.splice(i, 1);
      break;
    }
  }

  saveCart(cart);
  showCart();
}

// Draw the whole cart on the page
function showCart() {
  const list = document.getElementById("cartItems");
  if (list === null) {
    return; // we are not on cart.html, so do nothing
  }

  const cart = getCart();
  list.innerHTML = ""; // clear old rows
  let sum = 0;

  for (let i = 0; i < cart.length; i++) {
    list.appendChild(makeCartRow(cart[i]));
    sum = sum + cart[i].price * cart[i].qty;
  }

  document.getElementById("subtotal").textContent = money(sum);
  document.getElementById("total").textContent = money(sum);

  // empty cart -> show the message, hide the totals
  if (cart.length === 0) {
    document.getElementById("cartEmpty").style.display = "block";
    document.getElementById("cartSummary").style.display = "none";
  } else {
    document.getElementById("cartEmpty").style.display = "none";
    document.getElementById("cartSummary").style.display = "block";
  }
}

// ==========================================================
// CHECKOUT
// ==========================================================
const checkoutBtn = document.getElementById("checkoutBtn");

if (checkoutBtn !== null) {
  checkoutBtn.addEventListener("click", function (e) {
    e.preventDefault();

    saveCart([]); // empty the cart

    // hide the cart, show the "order placed" message
    document.getElementById("cartTitle").style.display = "none";
    document.getElementById("cartItems").style.display = "none";
    document.getElementById("cartSummary").style.display = "none";
    document.getElementById("orderSuccess").style.display = "block";
  });
}

// Run when the page loads
showCartCount();
showCart();
