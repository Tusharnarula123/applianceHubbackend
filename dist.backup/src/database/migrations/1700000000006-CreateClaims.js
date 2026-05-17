export class CreateClaims1700000000006 {
    name = 'CreateClaims1700000000006';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`claims\` (
        \`id\`               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\`     VARCHAR(36)  NOT NULL,
        \`warranty_id\`      VARCHAR(36)  NULL,
        \`customer_name\`    VARCHAR(255) NOT NULL,
        \`customer_email\`   VARCHAR(255) NOT NULL,
        \`customer_phone\`   VARCHAR(50)  NULL,
        \`issue\`            TEXT         NOT NULL,
        \`status\`           ENUM('open','pending','resolved') NOT NULL DEFAULT 'open',
        \`priority\`         ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
        \`resolution_notes\` TEXT         NULL,
        \`filed_at\`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`resolved_at\`      TIMESTAMP    NULL,
        CONSTRAINT \`PK_claims\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_claims_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_claims_warranty\`
          FOREIGN KEY (\`warranty_id\`) REFERENCES \`warranty_registrations\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`IDX_claims_appliance\` (\`appliance_id\`),
        INDEX \`IDX_claims_status\` (\`status\`),
        INDEX \`IDX_claims_warranty\` (\`warranty_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`claims\``);
    }
}
//# sourceMappingURL=1700000000006-CreateClaims.js.map