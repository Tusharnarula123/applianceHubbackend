#!/usr/bin/env node
/**
 * Drops all tables in the correct FK-safe order so TypeORM
 * synchronize can recreate the schema from scratch.
 * Only runs when DB_RESET=true env var is set.
 */
const mysql = require('mysql2/promise');

async function dropAll() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('==> Dropping all tables for clean sync...');

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  const [rows] = await conn.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE()`
  );

  for (const row of rows) {
    const tbl = row.table_name || row.TABLE_NAME;
    console.log(`    DROP TABLE IF EXISTS \`${tbl}\``);
    await conn.query(`DROP TABLE IF EXISTS \`${tbl}\``);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
  console.log('==> All tables dropped. TypeORM will recreate them.');
}

dropAll().catch(err => {
  console.error('Drop failed:', err.message);
  process.exit(1);
});
