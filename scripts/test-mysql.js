import "dotenv/config";
import mysql from "mysql2/promise";

const requiredVars = [
  "MYSQLHOST",
  "MYSQLPORT",
  "MYSQLUSER",
  "MYSQLPASSWORD",
  "MYSQLDATABASE",
];

const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

async function testConnection() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      port: Number(process.env.MYSQLPORT),
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      ssl:
        process.env.MYSQL_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
      connectTimeout: 10000,
    });

    const [rows] = await connection.query("SELECT 1 AS ok");

    if (Array.isArray(rows) && rows[0]?.ok === 1) {
      console.log("MySQL connection successful: SELECT 1 returned ok=1");
      process.exit(0);
    }

    console.error(
      "MySQL connection opened, but test query did not return expected value.",
    );
    process.exit(1);
  } catch (error) {
    console.error("MySQL connection failed.");
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection();
