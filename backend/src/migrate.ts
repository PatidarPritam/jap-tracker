import dotenv from "dotenv";
dotenv.config();

import { pool, runMigration } from "./db";

runMigration()
  .then(async () => {
    console.log("Database migration applied");
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Database migration failed");
    console.error(error);
    await pool.end();
    process.exit(1);
  });
