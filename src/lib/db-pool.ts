import { Pool } from "pg";

export const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.PROGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) ?? 5432,
  database: process.env.POSTGRES_DATABASE,
  max: 12,
  idleTimeoutMillis: 30000,
});
