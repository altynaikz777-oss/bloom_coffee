const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const frontendRoot = path.resolve(__dirname, "../frontend");
const databasePath = path.resolve(
  process.env.ADMIN_DB_PATH || path.join(__dirname, "data", "admins.json"),
);
const sessionCookie = "bloom_admin_session";
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(response, statusCode, value, headers = {}) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function validAdminRecord(admin) {
  return (
    admin &&
    typeof admin.email === "string" &&
    /^[a-f0-9]{32}$/i.test(admin.salt) &&
    /^[a-f0-9]{128}$/i.test(admin.passwordHash)
  );
}

async function hashPassword(password, salt) {
  const derivedKey = await scrypt(password, Buffer.from(salt, "hex"), 64);
  return derivedKey.toString("hex");
}

async function saveDatabase(database) {
  const temporaryPath = `${databasePath}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.rename(temporaryPath, databasePath);
}

async function loadDatabase() {
  let database;
  try {
    database = JSON.parse(await fs.readFile(databasePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    database = { admins: [] };
  }

  if (!database || !Array.isArray(database.admins)) {
    throw new Error("Admin database must contain an admins array.");
  }
  if (!database.admins.every(validAdminRecord)) {
    throw new Error("Admin database contains an invalid account record.");
  }

  if (database.admins.length === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error(
        "No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD for the first startup.",
      );
    }
    if (!emailPattern.test(email) || password.length < 12) {
      throw new Error(
        "Use a valid admin email and a password of at least 12 characters.",
      );
    }

    const salt = crypto.randomBytes(16).toString("hex");
    database.admins.push({
      email,
      salt,
      passwordHash: await hashPassword(password, salt),
    });
    await saveDatabase(database);
    console.log(`Created the initial admin account for ${email}.`);
  }

  return database;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request must contain valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) {
      return decodeURIComponent(item.slice(separator + 1).trim());
    }
  }
  return "";
}

function getSession(request) {
  const id = getCookie(request, sessionCookie);
  const session = sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

function cookieHeader(request, value, maxAge) {
  const secure = request.socket.encrypted ? "; Secure" : "";
  return `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function sameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function rateLimitFor(request) {
  const address = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = loginAttempts.get(address);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + 10 * 60 * 1000 };
    loginAttempts.set(address, entry);
  }
  if (entry.count >= 6) return false;
  entry.count += 1;
  return true;
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function serveFrontend(request, response, pathname) {
  const relativePath = pathname === "/" ? "/home.html" : pathname;
  const frontendPath = relativePath.startsWith("/frontend/")
    ? relativePath.slice("/frontend".length)
    : relativePath;
  const filePath = path.resolve(frontendRoot, `.${frontendPath}`);
  if (!filePath.startsWith(`${frontendRoot}${path.sep}`)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type":
        contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    throw error;
  }
}

function createServer(database) {
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");

    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      sendJson(response, 400, { error: "Invalid URL." });
      return;
    }

    if (pathname === "/api/admin/session" && request.method === "GET") {
      const session = getSession(request);
      sendJson(response, 200, {
        authenticated: Boolean(session),
        email: session?.email || null,
      });
      return;
    }

    if (pathname === "/api/admin/login" && request.method === "POST") {
      if (!sameOriginRequest(request)) {
        sendJson(response, 403, { error: "Request rejected." });
        return;
      }
      if (!rateLimitFor(request)) {
        sendJson(response, 429, {
          error: "Too many attempts. Try again in 10 minutes.",
        });
        return;
      }

      try {
        const body = await readJsonBody(request);
        const email =
          typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (!email || !password || password.length > 1024) {
          sendJson(response, 400, { error: "Enter your email and password." });
          return;
        }

        const admin = database.admins.find((entry) => entry.email === email);
        const salt = admin?.salt || "0".repeat(32);
        const actualHash = Buffer.from(
          await hashPassword(password, salt),
          "hex",
        );
        const expectedHash = Buffer.from(
          admin?.passwordHash || "0".repeat(128),
          "hex",
        );
        if (!admin || !crypto.timingSafeEqual(actualHash, expectedHash)) {
          sendJson(response, 401, { error: "Email or password is incorrect." });
          return;
        }

        loginAttempts.delete(request.socket.remoteAddress || "unknown");
        const id = crypto.randomBytes(32).toString("hex");
        sessions.set(id, {
          email: admin.email,
          expiresAt: Date.now() + sessionLifetimeMs,
        });
        response.setHeader(
          "Set-Cookie",
          cookieHeader(request, id, Math.floor(sessionLifetimeMs / 1000)),
        );
        sendJson(response, 200, { authenticated: true, email: admin.email });
      } catch (error) {
        sendJson(response, error.statusCode || 400, { error: error.message });
      }
      return;
    }

    if (pathname === "/api/admin/logout" && request.method === "POST") {
      if (!sameOriginRequest(request)) {
        sendJson(response, 403, { error: "Request rejected." });
        return;
      }
      sessions.delete(getCookie(request, sessionCookie));
      response.setHeader("Set-Cookie", cookieHeader(request, "", 0));
      sendJson(response, 200, { authenticated: false });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    try {
      await serveFrontend(request, response, pathname);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Internal server error." });
    }
  });
}

async function start() {
  const database = await loadDatabase();
  const server = createServer(database);
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`Bloom Coffee is available at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
