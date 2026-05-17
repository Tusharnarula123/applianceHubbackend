import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessages1700000000009 implements MigrationInterface {
  name = 'CreateMessages1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`messages\` (
        \`id\`          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`session_id\`  VARCHAR(36)  NOT NULL,
        \`role\`        ENUM('user','assistant') NOT NULL,
        \`content\`     TEXT         NOT NULL,
        \`tokens_used\` INT UNSIGNED NULL,
        \`created_at\`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_messages\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_messages_session\`
          FOREIGN KEY (\`session_id\`) REFERENCES \`chat_sessions\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_messages_session\` (\`session_id\`),
        INDEX \`IDX_messages_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`messages\``);
  }
}
