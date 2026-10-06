import "dotenv/config";
import pg from "pg";
import parse from "co-body";
import http from "node:http";
import bcrypt from "bcrypt";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: Number(process.env.DB_PORT || process.env.PORT || 5432),
  password: String(process.env.DB_PASSWORD || process.env.PASSWORD || ""),
});

function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function checkAdmin(req) {
  const adminPassword = req.headers["x-admin-password"];
  return (
    Boolean(process.env.ADMIN_PASSWORD) &&
    adminPassword === process.env.ADMIN_PASSWORD
  );
}

function getIdFromPath(parts, resource) {
  if (parts[1] !== resource || parts.length !== 3) return null;
  const id = Number(parts[2]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const ORDER_STATUSES = [
  "pending",
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PUT, DELETE, POST, GET, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-password",
  );
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const url = new URL(req.url, "http://localhost:3000");
  const urlPath = url.pathname;
  const parts = urlPath.split("/");

  if (urlPath === "/read" && req.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT id, username, email, role FROM accounts",
      );
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      console.error("Error fetching users:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/register" && req.method === "POST") {
    try {
      const { username, password, email } = await parse.json(req);

      if (!username || !password || !email) {
        return sendJSON(res, 400, { error: "Fill in all fields!" });
      }

      const checkUser = await pool.query(
        "SELECT id FROM accounts WHERE email = $1",
        [email],
      );
      if (checkUser.rows.length > 0) {
        return sendJSON(res, 400, {
          error: "User with that email already exists!",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO accounts (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, role",
        [username, hashedPassword, email],
      );

      return sendJSON(res, 201, {
        message: "Welcome to our cafe!",
        user: result.rows[0],
      });
    } catch (err) {
      console.error("Error during registration:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/login" && req.method === "POST") {
    try {
      const { email, password } = await parse.json(req);

      if (!email || !password) {
        return sendJSON(res, 400, { error: "Write your email and password!" });
      }

      const userResult = await pool.query(
        "SELECT * FROM accounts WHERE email = $1",
        [email],
      );
      if (userResult.rows.length === 0) {
        return sendJSON(res, 400, {
          error: "This email hasn't been registered!",
        });
      }

      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return sendJSON(res, 400, { error: "Wrong password!" });
      }

      return sendJSON(res, 200, {
        message: "Successfully logged in!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Error during login:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  const accountId = getIdFromPath(parts, "accounts");

  if (accountId && req.method === "PUT") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const body = await parse.json(req);
      const { rows } = await pool.query(
        "UPDATE accounts SET username = $1 WHERE id = $2 RETURNING id, username, role",
        [body.username || null, accountId],
      );

      if (rows.length === 0) {
        return sendJSON(res, 404, { error: "User not found" });
      }
      return sendJSON(res, 200, { message: "User updated", user: rows[0] });
    } catch (err) {
      console.error("Error updating user:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (accountId && req.method === "DELETE") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const { rowCount } = await pool.query(
        "DELETE FROM accounts WHERE id = $1",
        [accountId],
      );

      if (rowCount === 0) {
        return sendJSON(res, 404, { error: "User not found" });
      }
      return sendJSON(res, 200, { message: "User deleted" });
    } catch (err) {
      console.error("Error deleting user:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/products" && req.method === "GET") {
    try {
      const result = await pool.query("SELECT * FROM products ORDER BY id");
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      console.error("Error fetching products:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/products" && req.method === "POST") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const { name, category, price, description, image } =
        await parse.json(req);

      if (!name || price === undefined || price === null) {
        return sendJSON(res, 400, { error: "name and price are required" });
      }

      const result = await pool.query(
        "INSERT INTO products (name, category, price, description, image) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [name, category, price, description, image],
      );

      return sendJSON(res, 201, {
        message: "Product added",
        product: result.rows[0],
      });
    } catch (err) {
      console.error("Error adding product:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  
  if (urlPath === "/products" && req.method === "PUT") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const { id, name, category, price, description, image } =
        await parse.json(req);

      if (!id) {
        return sendJSON(res, 400, { error: "Product id is required" });
      }

      const result = await pool.query(
        "UPDATE products SET name = $1, category = $2, price = $3, description = $4, image = $5 WHERE id = $6 RETURNING *",
        [name, category, price, description, image, id],
      );

      if (result.rows.length === 0) {
        return sendJSON(res, 404, { error: "Product not found" });
      }
      return sendJSON(res, 200, {
        message: "Product updated",
        product: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating product:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  const productId = getIdFromPath(parts, "products");


  if (productId && req.method === "PUT") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const { name, category, price, description, image } =
        await parse.json(req);

      const result = await pool.query(
        "UPDATE products SET name = $1, category = $2, price = $3, description = $4, image = $5 WHERE id = $6 RETURNING *",
        [name, category, price, description, image, productId],
      );

      if (result.rows.length === 0) {
        return sendJSON(res, 404, { error: "Product not found" });
      }
      return sendJSON(res, 200, {
        message: "Product updated",
        product: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating product:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (productId && req.method === "DELETE") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const result = await pool.query("DELETE FROM products WHERE id = $1", [
        productId,
      ]);

      if (result.rowCount === 0) {
        return sendJSON(res, 404, { error: "Product not found" });
      }
      return sendJSON(res, 200, { message: "Product deleted" });
    } catch (err) {
      console.error("Error deleting product:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/orders" && req.method === "GET") {
    try {
      const userId = url.searchParams.get("user_id");
      const result = userId
        ? await pool.query(
            "SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC",
            [userId],
          )
        : await pool.query("SELECT * FROM orders ORDER BY id DESC");
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      console.error("Error fetching orders:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (urlPath === "/orders" && req.method === "POST") {
    try {
      const { name, price, user_id } = await parse.json(req);

      if (!name || price === undefined || price === null || !user_id) {
        return sendJSON(res, 400, {
          error: "name, price and user_id are required",
        });
      }

      const result = await pool.query(
        "INSERT INTO orders (name, price, user_id) VALUES ($1, $2, $3) RETURNING *",
        [name, price, user_id],
      );
      return sendJSON(res, 201, {
        message: "Order created",
        order: result.rows[0],
      });
    } catch (err) {
      console.error("Error creating order:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  const orderId = getIdFromPath(parts, "orders");

  if (orderId && req.method === "PUT") {
    if (!checkAdmin(req)) {
      return sendJSON(res, 403, { error: "Admin access required" });
    }
    try {
      const { status } = await parse.json(req);

      if (!ORDER_STATUSES.includes(status)) {
        return sendJSON(res, 400, { error: "Invalid status" });
      }

      const result = await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [status, orderId],
      );

      if (result.rows.length === 0) {
        return sendJSON(res, 404, { error: "Order not found" });
      }
      return sendJSON(res, 200, {
        message: "Order updated",
        order: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating order:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  if (orderId && req.method === "DELETE") {
    try {
      let result;
      if (checkAdmin(req)) {
        result = await pool.query("DELETE FROM orders WHERE id = $1", [
          orderId,
        ]);
      } else {
        const body = await parse.json(req).catch(() => ({}));
        result = await pool.query(
          "DELETE FROM orders WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'new')",
          [orderId, body.user_id],
        );
      }

      if (result.rowCount === 0) {
        return sendJSON(res, 404, {
          error: "Order not found or can't be cancelled",
        });
      }
      return sendJSON(res, 200, { message: "Order cancelled" });
    } catch (err) {
      console.error("Error cancelling order:", err);
      return sendJSON(res, 500, { error: "Server error" });
    }
  }

  return sendJSON(res, 404, { error: "Route not found!" });
});

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
