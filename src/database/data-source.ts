import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve DB credentials from multiple env var conventions:
//   1. DATABASE_URL / MYSQL_URL  (Railway MySQL plugin connection string)
//   2. MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE (Railway individual vars)
//   3. DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME (custom / local)
function resolveDbConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;
  if (url) {
    const m = url.match(/^mysql(?:2)?:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/([^?]+)/);
    if (m) {
      return {
        host: m[3],
        port: parseInt(m[4], 10),
        username: decodeURIComponent(m[1]),
        password: decodeURIComponent(m[2]),
        database: m[5],
      };
    }
  }
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT || '3306', 10),
      username: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE || 'appliancehub',
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'appliancehub',
  };
}

const AppDataSource = new DataSource({
  type: 'mysql',
  ...resolveDbConfig(),
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  entities: [join(__dirname, '..', 'entities', '*.entity.{ts,js}')],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
