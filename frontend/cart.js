function getCart() {
  const cart = localStorage.getItem("bloomCart");

  if (cart === null) {
    return [];
  }

  return JSON.parse(cart);
}

function saveCart(cart) {
  localStorage.setItem("bloomCart", JSON.stringify(cart));
  showCartCount();
}

function showCartCount() {
  const cartLink = document.querySelector('a[href="cart.html"]');
  if (!cartLink) return;

  const cart = getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);

  cartLink.textContent = `Cart (${count})`;
}

function addToCart(product) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === product.id) {
      cart[i].quantity = cart[i].quantity + 1;
      saveCart(cart);
      return;
    }
  }

  product.quantity = 1;
  cart.push(product);

  saveCart(cart);
}
function money(number) {
  return "$" + Number(number).toFixed(2);
}

function showCart() {
  const cart = getCart();
  const cartItems = document.getElementById("cartItems");

  if (cartItems === null) {
    return;
  }

  cartItems.innerHTML = "";

  let total = 0;

  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];

    cartItems.innerHTML += `
      <div class="cart-item">
        <img src="${item.image}">
        <div class="cart-item-details">
          <h3>${item.name}</h3>
          <p>${money(item.price)} each</p>
        </div>
        <div class="quantity-control">
          <button onclick="changeQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="changeQuantity(${item.id}, 1)">+</button>
        </div>
        <div>
          ${money(item.price * item.quantity)}
        </div>
        <button class="remove-item" onclick="removeItem(${item.id})">
          Remove
        </button>
      </div>
    `;

    total = total + item.price * item.quantity;
  }

  document.getElementById("subtotal").textContent = money(total);
  document.getElementById("total").textContent = money(total);
}

function changeQuantity(id, change) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      cart[i].quantity = cart[i].quantity + change;

      if (cart[i].quantity <= 0) {
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

const checkoutBtn = document.getElementById("checkoutBtn");

if (checkoutBtn !== null) {
  checkoutBtn.onclick = function () {
    saveCart([]);

    document.getElementById("cartItems").innerHTML = "";
    document.getElementById("orderSuccess").style.display = "block";
  };
}

showCartCount();
showCart();
