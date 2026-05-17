import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000000001 implements MigrationInterface {
  name = 'CreateUsers1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\`             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`business_id\`    VARCHAR(36)  NOT NULL,
        \`name\`           VARCHAR(255) NOT NULL,
        \`email\`          VARCHAR(255) NOT NULL,
        \`password_hash\`  VARCHAR(255) NOT NULL,
        \`role\`           ENUM('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
        \`avatar_url\`     VARCHAR(500) NULL,
        \`last_active_at\` TIMESTAMP    NULL,
        \`created_at\`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_users\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQ_users_email\` UNIQUE (\`email\`),
        CONSTRAINT \`FK_users_business\`
          FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_users_business\` (\`business_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
