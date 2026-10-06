import "dotenv/config";
import pg from "pg";
import parse from "co-body";
import http from "node:http";
import bcrypt from "bcrypt";
import { error } from "node:console";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
  password: String(process.env.DB_PASSWORD || ""),
});

function checkAdmin(req) {
  const adminPassword = req.headers["x-admin-password"];
  return adminPassword === process.env.ADMIN_PASSWORD;
}

async function getUsers() {
  const result = await pool.query(
    "SELECT id, username, email, role FROM accounts",
  );
  return result.rows;
}

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

  // --- Users ---
  if (req.url === "/read" && req.method === "GET") {
    try {
      const data = await getUsers();
      res.statusCode = 200;
      return res.end(JSON.stringify(data));
    } catch (err) {
      console.error("Error fetching users:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  if (req.url === "/register" && req.method === "POST") {
    try {
      const body = await parse.json(req);
      const { username, password, email } = body;

      if (!username || !password || !email) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Fill in all fields!" }));
      }

      const checkUser = await pool.query(
        "SELECT * FROM accounts WHERE email = $1",
        [email],
      );

      if (checkUser.rows.length > 0) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
          error: "User with that email already exists!",
        }));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO accounts (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, role",
        [username, hashedPassword, email],
      );

      res.statusCode = 201;
      return res.end(JSON.stringify({
        message: "Welcome to our cafe!",
        user: result.rows[0],
      }));
    } catch (err) {
      console.error("Error during registration:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  if (req.url === "/login" && req.method === "POST") {
    try {
      const body = await parse.json(req);
      const { email, password } = body;

      if (!email || !password) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
          error: "Write your email and password!",
        }));
      }

      const userResult = await pool.query(
        "SELECT * FROM accounts WHERE email = $1",
        [email],
      );

      if (userResult.rows.length === 0) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
          error: "This email hasn't been registered!",
        }));
      }

      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Wrong password!" }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({
        message: "Successfully logged in!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      }));
    } catch (err) {
      console.error("Error during login:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  // --- Accounts ---
  const accountParts = req.url.split("/");
  const accountId = Number(accountParts[2]);
  const hasAccountId =
    accountParts[1] === "accounts" &&
    accountParts.length === 3 &&
    Number.isInteger(accountId) &&
    accountId > 0;

  if (hasAccountId && req.method === "PUT") {
    try {
      const body = await parse.json(req);
      const { rows } = await pool.query(
        `UPDATE accounts SET username = $1 WHERE id = $2 RETURNING id, username, role`,
        [body.username || null, accountId],
      );

      if (rows.length === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "User not found" }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "User updated", user: rows[0] }));
    } catch (err) {
      console.error("Error updating user:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  if (hasAccountId && req.method === "DELETE") {
    try {
      const { rowCount } = await pool.query(
        "DELETE FROM accounts WHERE id = $1",
        [accountId],
      );

      if (rowCount === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "User not found" }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "User deleted" }));
    } catch (err) {
      console.error("Error deleting user:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  // --- Products ---
  if (req.url === "/products" && req.method === "GET") {
    try {
      const result = await pool.query("SELECT * FROM products ORDER BY id");
      res.statusCode = 200;
      return res.end(JSON.stringify(result.rows));
    } catch (err) {
      console.error("Error fetching products:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  if (req.url === "/products" && req.method === "POST") {
    if (!checkAdmin(req)) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: "Admin access required" }));
    }
    try {
      const body = await parse.json(req);
      const { name, category, price, description, image } = body;

      const result = await pool.query(
        "INSERT INTO products (name, category, price, description, image) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [name, category, price, description, image],
      );

      res.statusCode = 201;
      return res.end(JSON.stringify({
        message: "Product added",
        product: result.rows[0],
      }));
    } catch (err) {
      console.error("Error adding product:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  const productParts = req.url.split("/");
  const productId = Number(productParts[2]);
  const hasProductId =
    productParts[1] === "products" &&
    productParts.length === 3 &&
    Number.isInteger(productId) &&
    productId > 0;

  if (hasProductId && req.method === "PUT") {
    if (!checkAdmin(req)) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: "Admin access required" }));
    }
    try {
      const body = await parse.json(req);
      const { name, price, description, image } = body;

      const result = await pool.query(
        "UPDATE products SET name = $1, price = $2, description = $3, image = $4 WHERE id = $5 RETURNING *",
        [name, price, description, image, productId],
      );

      if (result.rows.length === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Product not found" }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({
        message: "Product updated",
        product: result.rows[0],
      }));
    } catch (err) {
      console.error("Error updating product:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

  if (hasProductId && req.method === "DELETE") {
    if (!checkAdmin(req)) {
      res.statusCode = 403;
    return res.end(JSON.stringify({ error: "Admin access required" }));
    }
    try {
      const result = await pool.query("DELETE FROM products WHERE id = $1", [
        productId,
      ]);

      if (result.rowCount === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Product not found" }))
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Product deleted!" }))
    } catch (err) {
      console.error("Error deleting product:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }))
    }
  }

  res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Route not found" }))
});

server.listen(3000, () => {
  console.log(`Server is listening on port 3000`);
});
