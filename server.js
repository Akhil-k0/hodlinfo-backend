const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "crypto.db");

let db;

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.run(`
      CREATE TABLE IF NOT EXISTS crypto_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        last REAL,
        buy REAL,
        sell REAL,
        volume REAL,
        base_unit TEXT
      )
    `);

    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const fetchAndUpdateCryptoData = async () => {
  try {
    const response = await axios.get("https://api.wazirx.com/api/v2/tickers");
    const tickers = response.data;
    const top10 = Object.keys(tickers).slice(0, 10);

    await db.run(`DELETE FROM crypto_data`);

    const insertQuery = `
      INSERT INTO crypto_data (name, last, buy, sell, volume, base_unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    for (const key of top10) {
      const { name, last, buy, sell, volume, base_unit } = tickers[key];
      await db.run(insertQuery, [name, last, buy, sell, volume, base_unit]);
    }
  } catch (error) {
    console.error("Error fetching data from WazirX API:", error);
  }
};

fetchAndUpdateCryptoData();

app.get("/api/getTop10", async (request, response) => {
  try {
    const getCryptoDataQuery = `SELECT * FROM crypto_data LIMIT 10;`;
    const cryptoData = await db.all(getCryptoDataQuery);
    response.send(cryptoData);
  } catch (error) {
    console.error("Error fetching crypto data:", error);
    response.status(500).send("Failed to fetch data");
  }
});
