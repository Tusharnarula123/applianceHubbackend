export class CreateQrCodes1700000000003 {
    name = 'CreateQrCodes1700000000003';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`qr_codes\` (
        \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\` VARCHAR(36)  NOT NULL,
        \`url\`          VARCHAR(500) NOT NULL,
        \`scan_count\`   INT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_qr_codes\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_qr_codes_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_qr_codes_appliance\` (\`appliance_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`qr_codes\``);
    }
}
//# sourceMappingURL=1700000000003-CreateQrCodes.js.map