const mysql2 = require("mysql2");
require("dotenv").config();

const pool = mysql2.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 10101,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4'
}).promise(); // we use async/await

// Test the connection
(async () => {
    try {
        const connection = await pool.getConnection(); // get a connection from the pool
        console.log("✅ Database connection successful!");
        connection.release(); // release the connection back to the pool
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
    }
})();

module.exports = pool;