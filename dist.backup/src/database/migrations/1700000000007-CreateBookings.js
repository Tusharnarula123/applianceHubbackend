export class CreateBookings1700000000007 {
    name = 'CreateBookings1700000000007';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`bookings\` (
        \`id\`             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\`   VARCHAR(36)  NOT NULL,
        \`claim_id\`       VARCHAR(36)  NULL,
        \`customer_name\`  VARCHAR(255) NOT NULL,
        \`customer_email\` VARCHAR(255) NOT NULL,
        \`customer_phone\` VARCHAR(50)  NULL,
        \`service_type\`   ENUM('repair','maintenance','inspection','installation') NOT NULL DEFAULT 'repair',
        \`preferred_date\` DATE         NOT NULL,
        \`preferred_time\` VARCHAR(50)  NULL,
        \`status\`         ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
        \`notes\`          TEXT         NULL,
        \`created_at\`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_bookings\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_bookings_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_bookings_claim\`
          FOREIGN KEY (\`claim_id\`) REFERENCES \`claims\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`IDX_bookings_appliance\` (\`appliance_id\`),
        INDEX \`IDX_bookings_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`bookings\``);
    }
}
//# sourceMappingURL=1700000000007-CreateBookings.js.map