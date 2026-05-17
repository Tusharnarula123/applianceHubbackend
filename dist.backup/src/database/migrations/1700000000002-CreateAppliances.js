export class CreateAppliances1700000000002 {
    name = 'CreateAppliances1700000000002';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`appliances\` (
        \`id\`          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        \`business_id\` VARCHAR(36)   NOT NULL,
        \`name\`        VARCHAR(255)  NOT NULL,
        \`model\`       VARCHAR(255)  NOT NULL,
        \`sku\`         VARCHAR(100)  NOT NULL,
        \`category\`    VARCHAR(100)  NOT NULL,
        \`status\`      ENUM('active','training','draft') NOT NULL DEFAULT 'draft',
        \`color\`       VARCHAR(20)   NOT NULL DEFAULT '#4F46E5',
        \`bot_name\`    VARCHAR(255)  NULL,
        \`bot_welcome\` TEXT          NULL,
        \`bot_tone\`    VARCHAR(100)  NULL DEFAULT 'professional',
        \`scans_count\` INT UNSIGNED  NOT NULL DEFAULT 0,
        \`created_at\`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_appliances\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQ_appliances_sku\` UNIQUE (\`sku\`),
        CONSTRAINT \`FK_appliances_business\`
          FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_appliances_business\` (\`business_id\`),
        INDEX \`IDX_appliances_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`appliances\``);
    }
}
//# sourceMappingURL=1700000000002-CreateAppliances.js.map