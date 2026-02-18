const API_BASE = "http://127.0.0.1:8000";

let clientsMap = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadClients();
  await loadCompletedOrders();
});


/* =========================
   LOAD CLIENTS
========================= */
async function loadClients() {
  const res = await fetch(`${API_BASE}/clients/`);
  const clients = await res.json();

  clients.forEach(client => {
    clientsMap[client.id] =
      `${client.first_name} ${client.last_name}`;
  });
}


/* =========================
   LOAD COMPLETED ORDERS
========================= */
async function loadCompletedOrders() {

  const tbody = document.getElementById("completedOrdersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/client-orders/?completed=true`);
    const orders = await res.json();

    orders.forEach(order => {

      const total = (
        Number(order.price) * order.quantity
      ).toLocaleString('en-PH', { minimumFractionDigits: 2 });

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${order.id}</td>
        <td>${clientsMap[order.client_id] || order.client_id}</td>
        <td>${order.model}</td>
        <td>${order.size}</td>
        <td>${order.material}</td>
        <td>${order.color}</td>
        <td>${order.heel_type}</td>
        <td>${order.heel_size}</td>
        <td>${order.mold}</td>
        <td>${order.has_buckle ? "Yes" : "No"}</td>
        <td>${order.has_slingback ? "Yes" : "No"}</td>
        <td>${order.has_platform ? "Yes" : "No"}</td>
        <td>${order.quantity}</td>
        <td>₱${Number(order.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td>₱${total}</td>
      `;

      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Failed to load completed orders", err);
  }
}
