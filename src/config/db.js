const mysql2 = require("mysql2");
require("dotenv").config();

const pool =  mysql2.createPool({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    waitForConnections: true, 
    queueLimit: 0,
    charset: 'utf8mb4'
})


module.exports = pool.promise();// so we use async/await