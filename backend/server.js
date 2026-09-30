import pg from 'pg';
import parse from 'co-body';
import http from 'node:http';
import { error } from 'node:console';

const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  port: 5432,
}); 

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
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
        return res.end(
          JSON.stringify({
            error: "User with that email already exists!",
          }),
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO accounts (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username, hashedPassword, email],
      );

      res.statusCode = 201;
      return res.end(
        JSON.stringify({
          message: "Welcome to our cafe!",
          user: result.rows[0],
        }),
      );
    } catch (err) {
      console.error("Error during registration:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server error" }));
    }
  }

    if (req.url === '/login' && req.method === 'POST') {
      try {
        const body = await parse.json(req);
        const {email, password} = body;

        if (!email || !password) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Write your email and login!" }));
        }
        const userResult = await pool.query(
            "SELECT * FROM accounts WHERE email = $1",
            [email]
        );

        if (userResult.rows.length === 0) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "This email hasn't been registered!" }));
        }

        const user = userResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Wrong password!" }));
        }

        res.statusCode = 200;
        return res.end(JSON.stringify({
            message: "Succesfully logged in!",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role 
            }
        }));
      } catch(err) {
        console.error("Error during login:", err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: "Server error" }));
      };
    }
  res.statusCode = 404;
  return res.end({ error: 'Server not found!'})
})

server.listen(3000, () => {
  console.log(`Server is listening on port 3000`);
})

