const API = "http://localhost:3000";

const currentUser = JSON.parse(localStorage.getItem("bloomUser") || "null");
if (!currentUser) {
  window.location.href = "home.html?login=1";
}

const STATUS_TEXT = {
  new: "Received",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ordersList = document.getElementById("ordersList");
const orderMessage = document.getElementById("orderMessage");

let myOrders = [];

function stageOf(order) {
  return !order.status || order.status === "pending" ? "new" : order.status;
}

function formatPrice(n) {
  return "$" + Number(n).toFixed(2);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderOrder(order) {
  const stage = stageOf(order);
  const card = el("div", "order-card");

  const head = el("div", "order-head");
  const info = el("div");
  info.appendChild(el("h3", "order-title", `Order #${order.id}`));
  if (order.created_at) {
    info.appendChild(
      el("p", "order-meta", new Date(order.created_at).toLocaleString()),
    );
  }
  head.append(info, el("span", `status status-${stage}`, STATUS_TEXT[stage]));

  const items = el("ul", "order-items");
  const row = el("li");
  row.append(el("span", "", order.name), el("span", "", formatPrice(order.price)));
  items.appendChild(row);

  const foot = el("div", "order-foot");
  foot.appendChild(el("strong", "order-total", `Total: ${formatPrice(order.price)}`));

  if (stage === "new") {
    const actions = el("div", "order-actions");
    const cancelBtn = el("button", "order-cancel", "Cancel order");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", () => cancelOrder(order));
    actions.appendChild(cancelBtn);
    foot.appendChild(actions);
  }

  card.append(head, items, foot);
  return card;
}

function showOrders() {
  ordersList.innerHTML = "";
  if (myOrders.length === 0) {
    orderMessage.textContent = "You have no orders yet. Pick something from the menu.";
    return;
  }
  orderMessage.textContent = "";
  myOrders.forEach((o) => ordersList.appendChild(renderOrder(o)));
}

async function loadMyOrders() {
  try {
    const response = await fetch(`${API}/orders`);
    if (!response.ok) throw new Error("Could not load your orders");
    const all = await response.json();

    myOrders = all
      .filter((o) => Number(o.user_id) === Number(currentUser.id))
      .sort((a, b) => b.id - a.id);
    showOrders();
  } catch (err) {
    orderMessage.textContent = err.message;
  }
}

async function cancelOrder(order) {
  if (!confirm(`Cancel order #${order.id}?`)) return;
  try {
    const response = await fetch(`${API}/orders/${order.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUser.id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not cancel the order");

    myOrders = myOrders.filter((o) => o.id !== order.id);
    showOrders();
    orderMessage.textContent = `Order #${order.id} cancelled.`;
  } catch (err) {
    orderMessage.textContent = err.message;
  }
}

loadMyOrders();
setInterval(loadMyOrders, 15000);