import mysql from "mysql2/promise";

export const db = mysql.createPool({
    host: process.env.DB_HOST, // MySQL host
    user: process.env.DB_USER, // MySQL user
    password: process.env.DB_PASSWORD, // MySQL password
    database: process.env.DB_NAME, // Database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});