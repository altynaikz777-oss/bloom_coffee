async function loadHomeProducts() {
  const grid = document.querySelector(".grid");
  if (!grid) return;

  const response = await fetch("http://localhost:3000/products");
  const productList = await response.json();

  productList.forEach((product) => {
    grid.innerHTML += `
      <div class="card">
        <img src="${product.image}" alt="${product.name}">
        <div class="card-content">
          <h3 class="card-title">${product.name}</h3>
          <p class="card-desc">${product.description || ""}</p>
          <div class="card-footer">
            <span class="price">$${Number(product.price).toFixed(2)}</span>
            <button class="btn-add">Add to cart</button>
          </div>
        </div>
      </div>
    `;
  });

  const addButtons = grid.querySelectorAll(".btn-add");

  addButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (localStorage.getItem("bloomUser") === null) {
        alert("Please log in first!");
        openModal();
        switchTab("login");
        return;
      }
      addToCart(productList[index]);
      button.textContent = "Added";
    });
  });
}

loadHomeProducts();

function filterProducts(category) {
  document.querySelectorAll(".card").forEach((card) => {
    card.style.display = card.dataset.category === category ? "block" : "none";
  });
}
filterProducts("coffee");
filterProducts("tea");
filterProducts("pastries");
///////

function openModal() {
  const savedUser = localStorage.getItem("bloomUser");
  if (savedUser !== null) {
    const user = JSON.parse(savedUser);
    if (confirm("You are logged in as " + user.username + ". Log out?")) {
      logout();
    }
    return;
  }

  document.getElementById("accountModal").classList.add("open");
}

function logout() {
  localStorage.removeItem("bloomUser");
  localStorage.removeItem("bloomCart");
  window.location.href = "home.html";
}

function closeModal() {
  document.getElementById("accountModal").classList.remove("open");
}

function switchTab(tab) {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const tabLoginBtn = document.getElementById("tabLoginBtn");

  if (tab === "register") {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
  } else {
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const person = {
    username: document.getElementById("regUsername").value,
    email: document.getElementById("regEmail").value,
    password: document.getElementById("regPassword").value,
  };

  const message = document.getElementById("registerMessage");

  try {
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Something went wrong";
      return;
    }

    localStorage.setItem("bloomUser", JSON.stringify(data.user));
    window.location.href =
      data.user.role === "admin" ? "admin.html" : "menu.html";
  } catch (err) {
    console.error(err);
    message.textContent = "Cannot reach the server. Is it running?";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const message = document.getElementById("loginMessage");
  message.textContent = "";

  const person = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value,
  };

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Something went wrong";
      return;
    }

    const user = data.user;
    localStorage.setItem("bloomUser", JSON.stringify(user));

    window.location.href = user.role === "admin" ? "admin.html" : "menu.html";
  } catch (err) {
    console.error(err);
    message.textContent = "Cannot reach the server. Is it running?";
  }
}

if (new URLSearchParams(window.location.search).get("login")) {
  openModal();
  switchTab("login");
}
