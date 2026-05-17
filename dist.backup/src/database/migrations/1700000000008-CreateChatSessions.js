export class CreateChatSessions1700000000008 {
    name = 'CreateChatSessions1700000000008';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`chat_sessions\` (
        \`id\`                  VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\`        VARCHAR(36)  NOT NULL,
        \`qr_code_id\`          VARCHAR(36)  NULL,
        \`customer_identifier\` VARCHAR(255) NULL,
        \`started_at\`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`ended_at\`            TIMESTAMP    NULL,
        CONSTRAINT \`PK_chat_sessions\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_chat_sessions_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_chat_sessions_qr\`
          FOREIGN KEY (\`qr_code_id\`) REFERENCES \`qr_codes\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`IDX_chat_sessions_appliance\` (\`appliance_id\`),
        INDEX \`IDX_chat_sessions_qr\` (\`qr_code_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`chat_sessions\``);
    }
}
//# sourceMappingURL=1700000000008-CreateChatSessions.js.map