import http from "http";
import fs from "fs";
import { json } from "co-body";
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  user: "altynaj",
  database: "bloom",
});

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, PUT, DELETE, GET, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Content-Type": "application/json" });
    res.end();
    return;
  }
});
server.listen(3000, console.log("Listening to the port 3000..."));
