export class CreateNotifications1700000000011 {
    name = 'CreateNotifications1700000000011';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\`          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        \`business_id\` VARCHAR(36)   NOT NULL,
        \`claim_id\`    VARCHAR(36)   NULL,
        \`booking_id\`  VARCHAR(36)   NULL,
        \`channel\`     ENUM('email','sms','in_app') NOT NULL DEFAULT 'email',
        \`recipient\`   VARCHAR(255)  NOT NULL,
        \`message\`     TEXT          NOT NULL,
        \`status\`      ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        \`sent_at\`     TIMESTAMP     NULL,
        \`created_at\`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_notifications\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_notifications_business\`
          FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_notifications_claim\`
          FOREIGN KEY (\`claim_id\`) REFERENCES \`claims\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_notifications_booking\`
          FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`IDX_notifications_business\` (\`business_id\`),
        INDEX \`IDX_notifications_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\``);
    }
}
//# sourceMappingURL=1700000000011-CreateNotifications.js.map