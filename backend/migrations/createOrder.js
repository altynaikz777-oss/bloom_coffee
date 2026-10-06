import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
  password: String(process.env.DB_PASSWORD || ""),
});

async function createOrders() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        user_id INT REFERENCES accounts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(query);
    console.log("Orders table created successfully");
  } catch (err) {
    console.error("Error creating orders table:", err);
  } finally {
    await pool.end();
  }
}

createOrders();
