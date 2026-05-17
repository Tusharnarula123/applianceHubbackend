export class CreateOffers1700000000010 {
    name = 'CreateOffers1700000000010';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`offers\` (
        \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\` VARCHAR(36)  NOT NULL,
        \`title\`        VARCHAR(255) NOT NULL,
        \`description\`  TEXT         NULL,
        \`valid_from\`   DATE         NULL,
        \`valid_until\`  DATE         NULL,
        \`is_active\`    TINYINT(1)   NOT NULL DEFAULT 1,
        \`created_at\`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_offers\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_offers_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_offers_appliance\` (\`appliance_id\`),
        INDEX \`IDX_offers_active\` (\`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`offers\``);
    }
}
//# sourceMappingURL=1700000000010-CreateOffers.js.map