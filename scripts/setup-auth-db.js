import "dotenv/config";
import { closeDbPool, syncAuthDatabase } from "../server/db.js";

async function setupAuthDatabase() {
  try {
    await syncAuthDatabase();
    console.log("Auth database setup completed successfully.");
  } catch (error) {
    console.error("Failed to setup auth database.");
    console.error(error.message);
    process.exit(1);
  } finally {
    await closeDbPool();
  }
}

setupAuthDatabase();
