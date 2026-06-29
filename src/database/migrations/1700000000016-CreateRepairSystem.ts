import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRepairSystem1700000000016 implements MigrationInterface {
  name = 'CreateRepairSystem1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match existing UUID column collation (MySQL 8 may use utf8mb4_0900_ai_ci)
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;

    // Clean up partial runs (DDL may auto-commit on failure)
    await queryRunner.query(`DROP TABLE IF EXISTS \`parts_orders\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`spare_parts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_reviews\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_requests\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_agents\``);

    // ── repair_agents ────────────────────────────────────────────
    // No FK to businesses — collation may differ; enforced in app layer.
    await queryRunner.query(`
      CREATE TABLE \`repair_agents\` (
        \`id\`              ${id36}        NOT NULL,
        \`business_id\`     ${id36}        NULL,
        \`name\`            VARCHAR(255)   NOT NULL,
        \`email\`           VARCHAR(255)   NOT NULL,
        \`phone\`           VARCHAR(30)    NULL,
        \`whatsapp\`        VARCHAR(30)    NULL,
        \`photo_url\`       VARCHAR(500)   NULL,
        \`specializations\` JSON           NULL,
        \`service_areas\`   JSON           NULL,
        \`is_active\`       TINYINT(1)     NOT NULL DEFAULT 1,
        \`is_marketplace\`  TINYINT(1)     NOT NULL DEFAULT 0,
        \`rating\`          DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
        \`total_jobs\`      INT UNSIGNED   NOT NULL DEFAULT 0,
        \`bio\`             TEXT           NULL,
        \`created_at\`      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_repair_agents_business_id\` (\`business_id\`),
        INDEX \`IDX_repair_agents_is_active\` (\`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    // ── repair_requests ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`repair_requests\` (
        \`id\`                ${id36}        NOT NULL,
        \`appliance_id\`      ${id36}        NOT NULL,
        \`agent_id\`          ${id36}        NULL,
        \`session_id\`        ${id36}        NULL,
        \`customer_name\`     VARCHAR(255)   NOT NULL,
        \`customer_email\`    VARCHAR(255)   NULL,
        \`customer_phone\`      VARCHAR(30)    NULL,
        \`customer_address\`  TEXT           NULL,
        \`customer_city\`     VARCHAR(100)   NULL,
        \`customer_zipcode\`  VARCHAR(20)    NULL,
        \`issue_description\` TEXT           NOT NULL,
        \`status\`            ENUM('pending','assigned','in_progress','completed','cancelled')
                              NOT NULL DEFAULT 'pending',
        \`scheduled_date\`    DATETIME       NULL,
        \`completed_date\`    DATETIME       NULL,
        \`repair_cost\`       DECIMAL(10,2)  NULL,
        \`agent_notes\`       TEXT           NULL,
        \`internal_notes\`    TEXT           NULL,
        \`created_at\`        DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`        DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_repair_requests_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_repair_requests_agent_id\` (\`agent_id\`),
        INDEX \`IDX_repair_requests_status\` (\`status\`),
        INDEX \`IDX_repair_requests_session_id\` (\`session_id\`),
        CONSTRAINT \`FK_repair_requests_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_repair_requests_agent\`
          FOREIGN KEY (\`agent_id\`) REFERENCES \`repair_agents\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    // ── repair_reviews ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`repair_reviews\` (
        \`id\`                 ${id36}   NOT NULL,
        \`repair_request_id\`  ${id36}   NOT NULL,
        \`agent_id\`           ${id36}   NOT NULL,
        \`rating\`             TINYINT UNSIGNED NOT NULL,
        \`comment\`            TEXT          NULL,
        \`reviewer_name\`      VARCHAR(255)  NULL,
        \`created_at\`         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_review_per_request\` (\`repair_request_id\`),
        INDEX \`IDX_repair_reviews_agent_id\` (\`agent_id\`),
        CONSTRAINT \`FK_repair_reviews_request\`
          FOREIGN KEY (\`repair_request_id\`) REFERENCES \`repair_requests\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_repair_reviews_agent\`
          FOREIGN KEY (\`agent_id\`) REFERENCES \`repair_agents\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    // ── spare_parts ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`spare_parts\` (
        \`id\`               ${id36}   NOT NULL,
        \`business_id\`      ${id36}   NOT NULL,
        \`appliance_id\`     ${id36}   NULL,
        \`name\`             VARCHAR(255)  NOT NULL,
        \`part_number\`      VARCHAR(100)  NULL,
        \`description\`      TEXT          NULL,
        \`compatible_models\` VARCHAR(100) NULL,
        \`price\`            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`stock_quantity\`   INT UNSIGNED  NOT NULL DEFAULT 0,
        \`is_available\`     TINYINT(1)    NOT NULL DEFAULT 1,
        \`image_url\`        VARCHAR(500)  NULL,
        \`category\`         VARCHAR(100)  NULL,
        \`lead_time_days\`   INT UNSIGNED  NULL,
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_spare_parts_business_id\` (\`business_id\`),
        INDEX \`IDX_spare_parts_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_spare_parts_is_available\` (\`is_available\`),
        CONSTRAINT \`FK_spare_parts_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    // ── parts_orders ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`parts_orders\` (
        \`id\`               ${id36}   NOT NULL,
        \`appliance_id\`     ${id36}   NOT NULL,
        \`session_id\`       ${id36}   NULL,
        \`customer_name\`    VARCHAR(255)  NOT NULL,
        \`customer_email\`   VARCHAR(255)  NULL,
        \`customer_phone\`   VARCHAR(30)   NULL,
        \`customer_address\` TEXT          NULL,
        \`items\`            JSON          NOT NULL,
        \`total_amount\`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`status\`           ENUM('pending','confirmed','shipped','delivered','cancelled')
                             NOT NULL DEFAULT 'pending',
        \`tracking_number\`  VARCHAR(255)  NULL,
        \`notes\`            TEXT          NULL,
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_parts_orders_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_parts_orders_status\` (\`status\`),
        INDEX \`IDX_parts_orders_session_id\` (\`session_id\`),
        CONSTRAINT \`FK_parts_orders_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`parts_orders\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`spare_parts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_reviews\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_requests\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`repair_agents\``);
  }
}
