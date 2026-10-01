import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
  password: process.env.PASSWORD,
});

async function insertCard() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        price NUMERIC,
        image TEXT,
        description TEXT,
        category VARCHAR(50)
      );
    `);
    const query = `
      INSERT INTO products (name, price, image, description, category) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;

    const values = [
      "Cappuccino",
      1200,
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFTMO9tdrtekGx8SRXgOH2DIB-CvUw-EyTAdE-kn-InqcZuOKUDGhu9Gb3YRfl5O7cYSbTIEm_Td4iQIkUaudEL31hJcvdgslg5yG-Cg&s=10",
      "Delicious hot cappuccino",
      "drinks",
    ];

    const res = await pool.query(query, values);
    console.log("Food succcessfully added:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

insertCard();
