function openModal() {
  document.getElementById("accountModal").classList.add("open");
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
    const response = await fetch('http://localhost:3000/register', {
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
    window.location.href = data.user.role === "admin" ? "admin.html" : "menu.html";
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
    const response = await fetch('http://localhost:3000/login', {
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

let addbtns = document.querySelectorAll(".btn-add");
addbtns.forEach((element) => {
  element.addEventListener("click", function () {
    element.textContent =
      element.textContent === "Added" ? "Add to cart" : "Added";
  });
});
 