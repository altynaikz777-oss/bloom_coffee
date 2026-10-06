import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
  password: process.env.DB_PASSWORD,
});

async function createUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        password TEXT,
        email TEXT,
        role VARCHAR(20) DEFAULT 'user'
      );
    `);
    console.log("Successfully created!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

createUsersTable();