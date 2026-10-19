import { registerAs } from '@nestjs/config';

export type DbType = 'mysql' | 'postgres';

/**
 * Resolves DB connection from multiple env var conventions:
 *   1. DATABASE_URL / MYSQL_URL  — full connection string (mysql:// or postgres://)
 *   2. MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE
 *      — individual vars set by Railway MySQL plugin
 *   3. DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME (+ DB_TYPE)
 *      — custom vars (local dev)
 */
export function parseConnectionUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const protocol = u.protocol.replace(':', '');
  let type: DbType;
  if (protocol === 'mysql' || protocol === 'mysql2') type = 'mysql';
  else if (protocol === 'postgres' || protocol === 'postgresql') type = 'postgres';
  else return null;
  return {
    type,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : type === 'postgres' ? 5432 : 3306,
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

export function resolveDbConfig() {
  // Priority 1: full connection URL
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;
  if (url) {
    const parsed = parseConnectionUrl(url);
    if (parsed) return parsed;
  }

  // Priority 2: Railway MySQL plugin individual vars
  if (process.env.MYSQLHOST) {
    return {
      type: 'mysql' as DbType,
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT || '3306', 10),
      username: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE || 'appliancehub',
    };
  }

  // Priority 3: explicit DB_* vars (local dev / custom vars)
  const type: DbType = process.env.DB_TYPE === 'postgres' ? 'postgres' : 'mysql';
  return {
    type,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (type === 'postgres' ? '5432' : '3306'), 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'appliancehub',
  };
}

export default registerAs('database', () => resolveDbConfig());
