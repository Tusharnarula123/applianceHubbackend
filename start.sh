#!/bin/bash
set -e

echo "==> Waiting for database to be ready..."
for i in $(seq 1 15); do
  node -e "
    const mysql = require('mysql2');
    const c = mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    c.connect(err => { process.exit(err ? 1 : 0); });
  " && break
  echo "  DB not ready yet (attempt $i/15), retrying in 3s..."
  sleep 3
done

if [ "$DB_RESET" = "true" ]; then
  echo "==> DB_RESET=true — dropping all tables for clean TypeORM sync..."
  node scripts/drop-all-tables.js
fi

if [ "$DB_SYNC" = "true" ]; then
  echo "==> DB_SYNC=true — skipping migrations, TypeORM will auto-sync schema"
else
  echo "==> Running database migrations..."
  npm run migration:run
fi

echo "==> Starting application..."
exec node dist/main.js
