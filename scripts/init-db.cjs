#!/usr/bin/env node
/**
 * Creates all tables from scratch with correct columns and FKs.
 * Runs when DB_RESET=true. Safe to run multiple times (DROP IF EXISTS).
 */
const mysql = require('mysql2/promise');

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log('==> Dropping all tables...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  const [rows] = await conn.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
  );
  for (const row of rows) {
    const tbl = row.table_name || row.TABLE_NAME;
    await conn.query(`DROP TABLE IF EXISTS \`${tbl}\``);
    console.log(`    dropped: ${tbl}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('==> Creating tables...');

  await conn.query(`
    CREATE TABLE \`businesses\` (
      \`id\`            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`name\`          VARCHAR(255)  NOT NULL,
      \`email\`         VARCHAR(255)  NULL,
      \`support_email\` VARCHAR(255)  NULL,
      \`website\`       VARCHAR(500)  NULL,
      \`phone\`         VARCHAR(50)   NULL,
      \`industry\`      VARCHAR(100)  NULL,
      \`logo_url\`      TEXT          NULL,
      \`plan\`          ENUM('startup','basic','pro','enterprise','starter','growth') NOT NULL DEFAULT 'startup',
      \`plan_status\`   ENUM('active','trial','inactive','suspended','cancelled','past_due') NOT NULL DEFAULT 'active',
      \`description\`   TEXT          NULL,
      \`timezone\`      VARCHAR(255)  NULL,
      \`metadata\`      JSON          NULL,
      \`created_at\`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`users\` (
      \`id\`            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`business_id\`   VARCHAR(36)   NOT NULL,
      \`name\`          VARCHAR(255)  NOT NULL,
      \`email\`         VARCHAR(255)  NOT NULL,
      \`phone\`         VARCHAR(20)   NULL,
      \`role\`          ENUM('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
      \`avatar_url\`    VARCHAR(255)  NULL,
      \`is_active\`     TINYINT(1)    NOT NULL DEFAULT 1,
      \`password_hash\` VARCHAR(255)  NULL,
      \`last_login\`    TIMESTAMP     NULL,
      \`metadata\`      JSON          NULL,
      \`created_at\`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_users_email\` (\`email\`),
      INDEX \`IDX_users_business\` (\`business_id\`),
      CONSTRAINT \`FK_users_business\` FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`appliances\` (
      \`id\`           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`business_id\`  VARCHAR(36)   NOT NULL,
      \`name\`         VARCHAR(255)  NOT NULL,
      \`model\`        VARCHAR(255)  NULL,
      \`sku\`          VARCHAR(100)  NOT NULL,
      \`category\`     VARCHAR(100)  NOT NULL,
      \`status\`       ENUM('active','training','draft') NOT NULL DEFAULT 'draft',
      \`color\`        VARCHAR(20)   NOT NULL DEFAULT '#4F46E5',
      \`bot_name\`     VARCHAR(255)  NULL,
      \`bot_welcome\`  TEXT          NULL,
      \`bot_tone\`     VARCHAR(100)  NULL DEFAULT 'professional',
      \`description\`  TEXT          NULL,
      \`image_url\`    VARCHAR(500)  NULL,
      \`scans_count\`  INT UNSIGNED  NOT NULL DEFAULT 0,
      \`created_at\`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\`   DATETIME      NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_appliances_business\` (\`business_id\`),
      INDEX \`IDX_appliances_status\` (\`status\`),
      CONSTRAINT \`FK_appliances_business\` FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`qr_codes\` (
      \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`appliance_id\` VARCHAR(36)  NOT NULL,
      \`url\`          VARCHAR(500) NOT NULL,
      \`scan_count\`   INT UNSIGNED NOT NULL DEFAULT 0,
      \`created_at\`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_qr_codes_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_qr_codes_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`documents\` (
      \`id\`               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`appliance_id\`     VARCHAR(36)  NOT NULL,
      \`name\`             VARCHAR(255) NOT NULL,
      \`file_url\`         VARCHAR(500) NOT NULL,
      \`file_size_bytes\`  BIGINT UNSIGNED NULL,
      \`file_type\`        ENUM('Manual','Warranty','Parts Catalog','Error Codes','Service Guide') NOT NULL,
      \`mime_type\`        VARCHAR(100) NULL,
      \`embedding_status\` ENUM('pending','processing','indexed','failed') NOT NULL DEFAULT 'pending',
      \`indexed_at\`       TIMESTAMP    NULL,
      \`created_at\`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_documents_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_documents_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`document_chunks\` (
      \`id\`           VARCHAR(36) NOT NULL DEFAULT (UUID()),
      \`document_id\`  VARCHAR(36) NOT NULL,
      \`appliance_id\` VARCHAR(36) NOT NULL,
      \`content\`      TEXT        NOT NULL,
      \`embedding\`    JSON        NULL,
      \`chunk_index\`  INT         NOT NULL DEFAULT 0,
      \`page_index\`   INT         NOT NULL DEFAULT 0,
      \`created_at\`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_chunks_document\` (\`document_id\`),
      INDEX \`IDX_chunks_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_chunks_document\` FOREIGN KEY (\`document_id\`) REFERENCES \`documents\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_chunks_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`warranty_registrations\` (
      \`id\`              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`appliance_id\`    VARCHAR(36)  NOT NULL,
      \`customer_name\`   VARCHAR(255) NOT NULL,
      \`customer_email\`  VARCHAR(255) NOT NULL,
      \`customer_phone\`  VARCHAR(50)  NULL,
      \`serial_number\`   VARCHAR(100) NULL,
      \`purchase_date\`   DATE         NULL,
      \`receipt_url\`     VARCHAR(500) NULL,
      \`expiry_date\`     DATE         NULL,
      \`status\`          ENUM('active','expired','void') NOT NULL,
      \`created_at\`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_warranty_appliance\` (\`appliance_id\`),
      INDEX \`IDX_warranty_email\` (\`customer_email\`),
      CONSTRAINT \`FK_warranty_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`claims\` (
      \`id\`               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`appliance_id\`     VARCHAR(36)  NOT NULL,
      \`warranty_id\`      VARCHAR(36)  NULL,
      \`customer_name\`    VARCHAR(255) NOT NULL,
      \`customer_email\`   VARCHAR(255) NOT NULL,
      \`customer_phone\`   VARCHAR(50)  NULL,
      \`issue\`            TEXT         NOT NULL,
      \`status\`           ENUM('open','pending','resolved') NOT NULL,
      \`priority\`         ENUM('low','medium','high') NOT NULL,
      \`resolution_notes\` TEXT         NULL,
      \`filed_at\`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`resolved_at\`      TIMESTAMP    NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_claims_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_claims_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_claims_warranty\` FOREIGN KEY (\`warranty_id\`) REFERENCES \`warranty_registrations\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`bookings\` (
      \`id\`             VARCHAR(36) NOT NULL DEFAULT (UUID()),
      \`appliance_id\`   VARCHAR(36) NOT NULL,
      \`claim_id\`       VARCHAR(36) NULL,
      \`customer_name\`  VARCHAR(255) NOT NULL,
      \`customer_email\` VARCHAR(255) NOT NULL,
      \`customer_phone\` VARCHAR(50)  NULL,
      \`service_type\`   ENUM('repair','maintenance','inspection','installation') NOT NULL,
      \`preferred_date\` DATE         NOT NULL,
      \`preferred_time\` VARCHAR(50)  NULL,
      \`status\`         ENUM('pending','confirmed','completed','cancelled') NOT NULL,
      \`notes\`          TEXT         NULL,
      \`created_at\`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_bookings_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_bookings_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_bookings_claim\` FOREIGN KEY (\`claim_id\`) REFERENCES \`claims\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`chat_sessions\` (
      \`id\`                  VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`appliance_id\`        VARCHAR(36)  NOT NULL,
      \`qr_code_id\`          VARCHAR(36)  NULL,
      \`customer_identifier\` VARCHAR(255) NULL,
      \`started_at\`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`ended_at\`            TIMESTAMP    NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_sessions_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_sessions_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_sessions_qr\` FOREIGN KEY (\`qr_code_id\`) REFERENCES \`qr_codes\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`messages\` (
      \`id\`              VARCHAR(36) NOT NULL DEFAULT (UUID()),
      \`chat_session_id\` VARCHAR(36) NOT NULL,
      \`role\`            ENUM('user','assistant') NOT NULL,
      \`content\`         TEXT        NOT NULL,
      \`message_type\`    VARCHAR(255) NULL,
      \`metadata\`        JSON         NULL,
      \`created_at\`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_messages_session\` (\`chat_session_id\`),
      CONSTRAINT \`FK_messages_session\` FOREIGN KEY (\`chat_session_id\`) REFERENCES \`chat_sessions\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`offers\` (
      \`id\`                VARCHAR(36)    NOT NULL DEFAULT (UUID()),
      \`appliance_id\`      VARCHAR(36)    NOT NULL,
      \`title\`             VARCHAR(255)   NOT NULL,
      \`description\`       TEXT           NULL,
      \`discount_amount\`   DECIMAL(10,2)  NOT NULL DEFAULT 0,
      \`discount_percentage\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`valid_from\`        DATE           NOT NULL,
      \`valid_until\`       DATE           NOT NULL,
      \`is_active\`         TINYINT(1)     NOT NULL DEFAULT 1,
      \`usage_count\`       INT            NOT NULL DEFAULT 0,
      \`max_usage_count\`   INT            NULL,
      \`metadata\`          JSON           NULL,
      \`created_at\`        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_offers_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_offers_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`notifications\` (
      \`id\`          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`business_id\` VARCHAR(36)  NOT NULL,
      \`claim_id\`    VARCHAR(36)  NULL,
      \`booking_id\`  VARCHAR(36)  NULL,
      \`channel\`     ENUM('email','sms','in_app') NOT NULL,
      \`recipient\`   VARCHAR(255) NOT NULL,
      \`message\`     TEXT         NOT NULL,
      \`status\`      ENUM('pending','sent','failed') NOT NULL,
      \`sent_at\`     TIMESTAMP    NULL,
      \`created_at\`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_notifications_business\` (\`business_id\`),
      CONSTRAINT \`FK_notifications_business\` FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_notifications_claim\` FOREIGN KEY (\`claim_id\`) REFERENCES \`claims\`(\`id\`) ON DELETE SET NULL,
      CONSTRAINT \`FK_notifications_booking\` FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`activity\` (
      \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`business_id\`  VARCHAR(36)  NOT NULL,
      \`appliance_id\` VARCHAR(36)  NULL,
      \`type\`         ENUM('claim','scan','resolve','upload') NOT NULL,
      \`text\`         VARCHAR(500) NOT NULL,
      \`metadata\`     JSON         NULL,
      \`created_at\`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_activity_business\` (\`business_id\`),
      INDEX \`IDX_activity_created\` (\`created_at\`),
      CONSTRAINT \`FK_activity_business\` FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_activity_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`repair_agents\` (
      \`id\`              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`business_id\`     VARCHAR(36)   NULL,
      \`name\`            VARCHAR(255)  NOT NULL,
      \`email\`           VARCHAR(255)  NOT NULL,
      \`phone\`           VARCHAR(30)   NULL,
      \`whatsapp\`        VARCHAR(30)   NULL,
      \`photo_url\`       VARCHAR(500)  NULL,
      \`specializations\` JSON          NULL,
      \`service_areas\`   JSON          NULL,
      \`is_active\`       TINYINT(1)    NOT NULL DEFAULT 1,
      \`is_marketplace\`  TINYINT(1)    NOT NULL DEFAULT 0,
      \`rating\`          DECIMAL(3,2)  NOT NULL DEFAULT 0,
      \`total_jobs\`      INT UNSIGNED  NOT NULL DEFAULT 0,
      \`bio\`             TEXT          NULL,
      \`created_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_repair_agents_business\` (\`business_id\`),
      INDEX \`IDX_repair_agents_active\` (\`is_active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`repair_requests\` (
      \`id\`                VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`appliance_id\`      VARCHAR(36)   NOT NULL,
      \`agent_id\`          VARCHAR(36)   NULL,
      \`session_id\`        VARCHAR(36)   NULL,
      \`customer_name\`     VARCHAR(255)  NOT NULL,
      \`customer_email\`    VARCHAR(255)  NULL,
      \`customer_phone\`    VARCHAR(30)   NULL,
      \`customer_address\`  TEXT          NULL,
      \`customer_city\`     VARCHAR(100)  NULL,
      \`customer_zipcode\`  VARCHAR(20)   NULL,
      \`issue_description\` TEXT          NOT NULL,
      \`status\`            ENUM('pending','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
      \`scheduled_date\`    DATETIME      NULL,
      \`completed_date\`    DATETIME      NULL,
      \`repair_cost\`       DECIMAL(10,2) NULL,
      \`agent_notes\`       TEXT          NULL,
      \`internal_notes\`    TEXT          NULL,
      \`created_at\`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_repair_req_appliance\` (\`appliance_id\`),
      INDEX \`IDX_repair_req_agent\` (\`agent_id\`),
      INDEX \`IDX_repair_req_status\` (\`status\`),
      CONSTRAINT \`FK_repair_req_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_repair_req_agent\` FOREIGN KEY (\`agent_id\`) REFERENCES \`repair_agents\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`repair_reviews\` (
      \`id\`                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      \`repair_request_id\` VARCHAR(36)  NOT NULL,
      \`agent_id\`          VARCHAR(36)  NOT NULL,
      \`rating\`            TINYINT UNSIGNED NOT NULL,
      \`comment\`           TEXT         NULL,
      \`reviewer_name\`     VARCHAR(255) NULL,
      \`created_at\`        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_review_per_request\` (\`repair_request_id\`),
      INDEX \`IDX_repair_reviews_agent\` (\`agent_id\`),
      CONSTRAINT \`FK_review_request\` FOREIGN KEY (\`repair_request_id\`) REFERENCES \`repair_requests\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_review_agent\` FOREIGN KEY (\`agent_id\`) REFERENCES \`repair_agents\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`spare_parts\` (
      \`id\`               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`business_id\`      VARCHAR(36)   NOT NULL,
      \`appliance_id\`     VARCHAR(36)   NULL,
      \`name\`             VARCHAR(255)  NOT NULL,
      \`part_number\`      VARCHAR(100)  NULL,
      \`description\`      TEXT          NULL,
      \`compatible_models\` VARCHAR(100) NULL,
      \`price\`            DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`stock_quantity\`   INT UNSIGNED  NOT NULL DEFAULT 0,
      \`is_available\`     TINYINT(1)    NOT NULL DEFAULT 1,
      \`image_url\`        VARCHAR(500)  NULL,
      \`category\`         VARCHAR(100)  NULL,
      \`lead_time_days\`   INT UNSIGNED  NULL,
      \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_spare_parts_business\` (\`business_id\`),
      INDEX \`IDX_spare_parts_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_spare_parts_business\` FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_spare_parts_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE \`parts_orders\` (
      \`id\`               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
      \`appliance_id\`     VARCHAR(36)   NOT NULL,
      \`session_id\`       VARCHAR(36)   NULL,
      \`customer_name\`    VARCHAR(255)  NOT NULL,
      \`customer_email\`   VARCHAR(255)  NULL,
      \`customer_phone\`   VARCHAR(30)   NULL,
      \`customer_address\` TEXT          NULL,
      \`items\`            JSON          NOT NULL,
      \`total_amount\`     DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`status\`           ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
      \`tracking_number\`  VARCHAR(255)  NULL,
      \`notes\`            TEXT          NULL,
      \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_parts_orders_appliance\` (\`appliance_id\`),
      CONSTRAINT \`FK_parts_orders_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.end();
  console.log('==> All tables created successfully!');
}

init().catch(err => {
  console.error('Init DB failed:', err.message);
  process.exit(1);
});
