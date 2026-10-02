import "dotenv/config";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.log("Usage: node make-admin.js your@email.com");
  process.exit(1);
}

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
  password: String(process.env.DB_PASSWORD || ""),
});

try {
  const r = await pool.query(
    "UPDATE accounts SET role = 'admin' WHERE email = $1 RETURNING id, username, email, role",
    [email],
  );
  if (r.rowCount === 0) {
    console.log("No account found with that email. Register it on the site first.");
  } else {
    console.log("Done:", r.rows[0]);
  }
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await pool.end();
}
