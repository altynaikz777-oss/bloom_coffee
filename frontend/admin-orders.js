const API = "http://localhost:3000";

const user = JSON.parse(localStorage.getItem("bloomUser") || "null");
if (!user || user.role !== "admin") {
  window.location.href = "home.html";
}

const LABELS = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const NEXT = {
  new: { status: "preparing", text: "Start preparing" },
  preparing: { status: "ready", text: "Mark ready" },
  ready: { status: "completed", text: "Mark completed" },
};

const list = document.getElementById("ordersList");
const message = document.getElementById("orderMessage");
const tabs = document.querySelectorAll("#orderTabs a");

let orders = [];
let users = {};
let currentStatus = "all";

function getAdminPassword() {
  let password = sessionStorage.getItem("bloomAdminPassword");
  if (!password) {
    password = prompt("Enter the admin password:");
    if (password) sessionStorage.setItem("bloomAdminPassword", password);
  }
  return password;
}

async function adminFetch(url, options = {}) {
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
    throw new Error("Wrong admin password. Reload the page and try again.");
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// An order with no status (or "pending") is a new order
function stageOf(order) {
  return !order.status || order.status === "pending" ? "new" : order.status;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(n) {
  return "$" + Number(n).toFixed(2);
}

function renderOrder(order) {
  const stage = stageOf(order);
  const owner = users[order.user_id];
  const who = owner
    ? `${owner.username} (${owner.email})`
    : `User #${order.user_id}`;
  const when = order.created_at
    ? ` · ${new Date(order.created_at).toLocaleString()}`
    : "";

  const card = el("div", "order-card");

  const head = el("div", "order-head");
  const info = el("div");
  info.append(
    el("h3", "order-title", `Order #${order.id}`),
    el("p", "order-meta", who + when),
  );
  head.append(info, el("span", `status status-${stage}`, LABELS[stage]));

  const items = el("ul", "order-items");
  const row = el("li");
  row.append(el("span", "", order.name), el("span", "", money(order.price)));
  items.appendChild(row);

  const foot = el("div", "order-foot");
  foot.appendChild(el("strong", "order-total", `Total: ${money(order.price)}`));

  const actions = el("div", "order-actions");
  const next = NEXT[stage];
  if (next) {
    const nextBtn = el("button", "order-next", next.text);
    nextBtn.type = "button";
    nextBtn.addEventListener("click", () => setStatus(order, next.status));
    actions.appendChild(nextBtn);
  }
  if (stage === "new" || stage === "preparing") {
    const doneBtn = el("button", "order-next", "Complete now");
    doneBtn.type = "button";
    doneBtn.addEventListener("click", () => setStatus(order, "completed"));
    actions.appendChild(doneBtn);
  }
  if (stage !== "completed" && stage !== "cancelled") {
    const cancelBtn = el("button", "order-cancel", "Cancel order");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", () => {
      if (confirm(`Cancel order #${order.id}?`)) setStatus(order, "cancelled");
    });
    actions.appendChild(cancelBtn);
  }
  foot.appendChild(actions);

  card.append(head, items, foot);
  return card;
}

function showOrders() {
  list.innerHTML = "";
  const visible = orders.filter(
    (o) => currentStatus === "all" || stageOf(o) === currentStatus,
  );
  message.textContent = visible.length ? "" : "No orders here yet.";
  visible.forEach((o) => list.appendChild(renderOrder(o)));
}

async function loadOrders() {
  try {
    const [ordersRes, usersRes] = await Promise.all([
      fetch(`${API}/orders`),
      fetch(`${API}/read`),
    ]);
    if (!ordersRes.ok) throw new Error("Could not load orders");

    orders = await ordersRes.json();
    orders.sort((a, b) => b.id - a.id);

    if (usersRes.ok) {
      (await usersRes.json()).forEach((u) => (users[u.id] = u));
    }
    showOrders();
  } catch (err) {
    message.textContent = err.message;
  }
}

async function setStatus(order, status) {
  try {
    const data = await adminFetch(`${API}/orders/${order.id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    order.status = data.order.status;
    showOrders();
    message.textContent = `Order #${order.id}: ${LABELS[stageOf(order)]}.`;
  } catch (err) {
    message.textContent = err.message;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();
    currentStatus = tab.dataset.status;
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    showOrders();
  });
});

loadOrders();