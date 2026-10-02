import "dotenv/config";
import pg from "pg";
import bcrypt from "bcrypt";

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.log("Usage: node reset-user.js your@email.com NewPassword");
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
  const hash = await bcrypt.hash(newPassword, 10);
  const r = await pool.query(
    "UPDATE accounts SET password = $1, role = 'admin' WHERE email = $2 RETURNING id, username, email, role",
    [hash, email],
  );
  if (r.rowCount === 0) {
    console.log("No account found with that email. Register it on the site first.");
  } else {
    console.log("Done. Password reset and role set to admin:", r.rows[0]);
  }
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await pool.end();
}
