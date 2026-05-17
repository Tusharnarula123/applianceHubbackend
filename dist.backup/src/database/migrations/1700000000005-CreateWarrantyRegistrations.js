export class CreateWarrantyRegistrations1700000000005 {
    name = 'CreateWarrantyRegistrations1700000000005';
    async up(queryRunner) {
        await queryRunner.query(`
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
        \`status\`          ENUM('active','expired','void') NOT NULL DEFAULT 'active',
        \`created_at\`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_warranty_registrations\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_warranty_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_warranty_appliance\` (\`appliance_id\`),
        INDEX \`IDX_warranty_customer_email\` (\`customer_email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`warranty_registrations\``);
    }
}
//# sourceMappingURL=1700000000005-CreateWarrantyRegistrations.js.map