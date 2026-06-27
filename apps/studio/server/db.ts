import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4',
    })
  : undefined;

export function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
