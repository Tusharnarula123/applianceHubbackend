export class CreateActivity1700000000012 {
    name = 'CreateActivity1700000000012';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`activity\` (
        \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`business_id\`  VARCHAR(36)  NOT NULL,
        \`appliance_id\` VARCHAR(36)  NULL,
        \`type\`         ENUM('claim','scan','resolve','upload') NOT NULL,
        \`text\`         VARCHAR(500) NOT NULL,
        \`metadata\`     JSON         NULL,
        \`created_at\`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_activity\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_activity_business\`
          FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_activity_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`IDX_activity_business\` (\`business_id\`),
        INDEX \`IDX_activity_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`activity\``);
    }
}
//# sourceMappingURL=1700000000012-CreateActivity.js.map