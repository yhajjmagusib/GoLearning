const mysql = require("mysql2/promise");

const requiredEnvironmentVariables = ["DB_NAME", "DB_USER"];
const missingVariables = requiredEnvironmentVariables.filter(
    (name) => !process.env[name]
);

if (missingVariables.length > 0) {
    throw new Error(
        `Missing database configuration: ${missingVariables.join(", ")}. ` +
        "Copy .env.example to .env and configure the database values."
    );
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    const [rows] = await pool.query("SELECT 1 AS connected");
    return rows[0].connected === 1;
}

module.exports = { pool, testConnection };
