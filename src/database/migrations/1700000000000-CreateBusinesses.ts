import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinesses1700000000000 implements MigrationInterface {
  name = 'CreateBusinesses1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`businesses\` (
        \`id\`            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        \`name\`          VARCHAR(255)  NOT NULL,
        \`email\`         VARCHAR(255)  NOT NULL,
        \`support_email\` VARCHAR(255)  NULL,
        \`website\`       VARCHAR(500)  NULL,
        \`phone\`         VARCHAR(50)   NULL,
        \`industry\`      VARCHAR(100)  NULL,
        \`logo_url\`      VARCHAR(500)  NULL,
        \`plan\`          ENUM('starter','growth','enterprise') NOT NULL DEFAULT 'starter',
        \`plan_status\`   ENUM('active','cancelled','past_due') NOT NULL DEFAULT 'active',
        \`created_at\`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_businesses\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQ_businesses_email\` UNIQUE (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`businesses\``);
  }
}
