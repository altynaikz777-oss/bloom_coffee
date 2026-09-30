const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const databasePath = path.resolve(
  process.env.ADMIN_DB_PATH || path.join(__dirname, "data", "admins.json"),
);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function askForPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error(
        "Run this command directly in a terminal to enter a hidden password.",
      ),
    );
  }

  const input = process.stdin;
  process.stdout.write("Admin password (minimum 12 characters): ");
  input.setRawMode(true);
  input.setEncoding("utf8");
  input.resume();

  return new Promise((resolve, reject) => {
    let password = "";
    const finish = (error) => {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Admin creation cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else if (character >= " ") {
          password += character;
        }
      }
    };
    input.on("data", onData);
  });
}

async function readDatabase() {
  try {
    const database = JSON.parse(await fs.readFile(databasePath, "utf8"));
    if (!database || !Array.isArray(database.admins)) {
      throw new Error("Admin database must contain an admins array.");
    }
    return database;
  } catch (error) {
    if (error.code === "ENOENT") return { admins: [] };
    throw error;
  }
}

async function main() {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
  prompt.close();

  if (!emailPattern.test(email))
    throw new Error("Enter a valid email address.");
  const password = await askForPassword();
  if (password.length < 12)
    throw new Error("Password must be at least 12 characters.");

  const database = await readDatabase();
  if (database.admins.some((admin) => admin.email === email)) {
    throw new Error("An admin with that email already exists.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = (
    await scrypt(password, Buffer.from(salt, "hex"), 64)
  ).toString("hex");
  database.admins.push({ email, salt, passwordHash });

  const temporaryPath = `${databasePath}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.rename(temporaryPath, databasePath);
  console.log(`Admin account created for ${email}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
