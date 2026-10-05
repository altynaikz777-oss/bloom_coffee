function getCart() {
  const saved = localStorage.getItem("bloomCart");
  if (saved === null) {
    return [];
  }
  return JSON.parse(saved);
}

function saveCart(cart) {
  localStorage.setItem("bloomCart", JSON.stringify(cart));
  showCartCount();
}

function addToCart(product) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === product.id) {
      cart[i].qty = cart[i].qty + 1;
      saveCart(cart);
      return;
    }
  }

  cart.push({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.image,
    qty: 1,
  });
  saveCart(cart);
}

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

function money(number) {
  return "$" + number.toFixed(2);
}

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

function changeQty(id, change) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      cart[i].qty = cart[i].qty + change;

      if (cart[i].qty <= 0) {
        cart.splice(i, 1);
      }
      break;
    }
  }

  saveCart(cart);
  showCart();
}

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

function showCart() {
  const list = document.getElementById("cartItems");
  if (list === null) {
    return;
  }

  const cart = getCart();
  list.innerHTML = "";
  let sum = 0;

  for (let i = 0; i < cart.length; i++) {
    list.appendChild(makeCartRow(cart[i]));
    sum = sum + cart[i].price * cart[i].qty;
  }

  document.getElementById("subtotal").textContent = money(sum);
  document.getElementById("total").textContent = money(sum);

  if (cart.length === 0) {
    document.getElementById("cartEmpty").style.display = "block";
    document.getElementById("cartSummary").style.display = "none";
  } else {
    document.getElementById("cartEmpty").style.display = "none";
    document.getElementById("cartSummary").style.display = "block";
  }
}

const checkoutBtn = document.getElementById("checkoutBtn");

if (checkoutBtn !== null) {
  checkoutBtn.addEventListener("click", function (e) {
    e.preventDefault();

    saveCart([]);

    document.getElementById("cartTitle").style.display = "none";
    document.getElementById("cartItems").style.display = "none";
    document.getElementById("cartSummary").style.display = "none";
    document.getElementById("orderSuccess").style.display = "block";
  });
}

showCartCount();
showCart();
