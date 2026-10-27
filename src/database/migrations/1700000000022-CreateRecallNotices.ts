import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecallNotices1700000000022 implements MigrationInterface {
  name = 'CreateRecallNotices1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match existing UUID column collation (MySQL 8 may use utf8mb4_0900_ai_ci)
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recall_notices\` (
        \`id\`              ${id36}       NOT NULL,
        \`business_id\`     ${id36}       NOT NULL,
        \`appliance_id\`    ${id36}       NULL,
        \`title\`           VARCHAR(255)  NOT NULL,
        \`description\`     TEXT          NOT NULL,
        \`remedy\`          TEXT          NOT NULL,
        \`affected_models\` JSON          NULL,
        \`serial_from\`     VARCHAR(100)  NULL,
        \`serial_to\`       VARCHAR(100)  NULL,
        \`severity\`        VARCHAR(20)   NOT NULL DEFAULT 'safety',
        \`official_url\`    VARCHAR(500)  NULL,
        \`is_active\`       TINYINT(1)    NOT NULL DEFAULT 1,
        \`created_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_recall_notices_business_id\` (\`business_id\`),
        INDEX \`IDX_recall_notices_appliance_id\` (\`appliance_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`recall_notices\``);
  }
}
