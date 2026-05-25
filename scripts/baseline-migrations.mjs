/**
 * One-time: mark migrations 0–12 as applied when tables already exist
 * but the `migrations` table is empty. Then run: npm run migration:run
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config();

const APPLIED = [
  [1700000000000, 'CreateBusinesses1700000000000'],
  [1700000000001, 'CreateUsers1700000000001'],
  [1700000000002, 'CreateAppliances1700000000002'],
  [1700000000003, 'CreateQrCodes1700000000003'],
  [1700000000004, 'CreateDocuments1700000000004'],
  [1700000000005, 'CreateWarrantyRegistrations1700000000005'],
  [1700000000006, 'CreateClaims1700000000006'],
  [1700000000007, 'CreateBookings1700000000007'],
  [1700000000008, 'CreateChatSessions1700000000008'],
  [1700000000009, 'CreateMessages1700000000009'],
  [1700000000010, 'CreateOffers1700000000010'],
  [1700000000011, 'CreateNotifications1700000000011'],
  [1700000000012, 'CreateActivity1700000000012'],
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appliancehub',
});

const [tables] = await conn.query(
  `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = 'businesses'`,
  [process.env.DB_NAME || 'appliancehub'],
);

if (tables[0].c === 0) {
  console.log('No existing schema found — run npm run migration:run (no baseline needed).');
  await conn.end();
  process.exit(0);
}

for (const [timestamp, name] of APPLIED) {
  await conn.query(
    `INSERT IGNORE INTO migrations (timestamp, name) VALUES (?, ?)`,
    [timestamp, name],
  );
}

console.log(`Baseline complete: marked ${APPLIED.length} migrations as applied.`);
console.log('Next: npm run migration:run');
await conn.end();
