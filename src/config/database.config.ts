import { registerAs } from '@nestjs/config';

/**
 * Resolves DB connection from multiple env var conventions:
 *   1. DATABASE_URL / MYSQL_URL  — full connection string (Railway plugin default)
 *   2. MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE
 *      — individual vars set by Railway MySQL plugin
 *   3. DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
 *      — custom vars (set these in Railway if you prefer)
 */
function parseConnectionUrl(url: string) {
  // mysql://user:pass@host:port/dbname
  const match = url.match(/^mysql(?:2)?:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
  if (!match) return null;
  return {
    username: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4], 10),
    database: match[5].split('?')[0],
  };
}

export default registerAs('database', () => {
  // Priority 1: full connection URL
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;
  if (url) {
    const parsed = parseConnectionUrl(url);
    if (parsed) return parsed;
  }

  // Priority 2: Railway MySQL plugin individual vars
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT || '3306', 10),
      username: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE || 'appliancehub',
    };
  }

  // Priority 3: explicit DB_* vars (local dev / custom Railway vars)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'appliancehub',
  };
});
