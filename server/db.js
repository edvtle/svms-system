import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const requiredVars = [
  "MYSQLHOST",
  "MYSQLPORT",
  "MYSQLUSER",
  "MYSQLPASSWORD",
  "MYSQLDATABASE",
];

const REQUIRED_ACCOUNTS = [
  {
    email: "jennypatanag@gmail.com",
    username: "jen25",
    password: "admin123",
    role: "admin",
  },
  {
    email: "hermoso_lyrika@plpasig.edu.ph",
    username: "leeRiKang",
    password: "student123",
    role: "student",
  },
];

const ALLOWED_USERNAMES = REQUIRED_ACCOUNTS.map((account) => account.username);
const ALLOWED_EMAILS = REQUIRED_ACCOUNTS.map((account) => account.email);

export function hasDbConfig() {
  return requiredVars.every((key) => Boolean(process.env[key]));
}

export function getMissingDbVars() {
  return requiredVars.filter((key) => !process.env[key]);
}

let pool;

export function getDbPool() {
  if (!hasDbConfig()) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQLHOST,
      port: Number(process.env.MYSQLPORT),
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      ssl:
        process.env.MYSQL_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return pool;
}

export async function closeDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function syncAuthDatabase() {
  if (!hasDbConfig()) {
    throw new Error(
      `Missing required environment variables: ${getMissingDbVars().join(", ")}`,
    );
  }

  const dbPool = getDbPool();

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'student') NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Remove any accounts that are not one of the two required seeded users.
  await dbPool.query(
    `
    DELETE FROM users
    WHERE username NOT IN (?, ?) OR email NOT IN (?, ?)
    `,
    [
      ALLOWED_USERNAMES[0],
      ALLOWED_USERNAMES[1],
      ALLOWED_EMAILS[0],
      ALLOWED_EMAILS[1],
    ],
  );

  for (const account of REQUIRED_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    await dbPool.query(
      `
      INSERT INTO users (email, username, password_hash, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        role = VALUES(role),
        is_active = 1
      `,
      [account.email, account.username, passwordHash, account.role],
    );
  }

  return {
    synced: true,
    accounts: REQUIRED_ACCOUNTS.map(({ email, username, role }) => ({
      email,
      username,
      role,
    })),
  };
}
