import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportCasesGapsMaintenance1700000000021 implements MigrationInterface {
  name = 'CreateSupportCasesGapsMaintenance1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match existing UUID column collation (MySQL 8 may use utf8mb4_0900_ai_ci)
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`support_cases\` (
        \`id\`              ${id36}       NOT NULL,
        \`appliance_id\`    ${id36}       NOT NULL,
        \`business_id\`     ${id36}       NULL,
        \`session_id\`      ${id36}       NULL,
        \`customer_name\`   VARCHAR(255)  NULL,
        \`customer_email\`  VARCHAR(255)  NULL,
        \`customer_phone\`  VARCHAR(30)   NULL,
        \`category\`        VARCHAR(30)   NOT NULL DEFAULT 'troubleshooting',
        \`symptoms\`        TEXT          NULL,
        \`error_codes\`     JSON          NULL,
        \`steps_tried\`     JSON          NULL,
        \`likely_causes\`   JSON          NULL,
        \`safety_flag\`     VARCHAR(30)   NULL,
        \`summary\`         TEXT          NULL,
        \`completeness\`    INT           NOT NULL DEFAULT 0,
        \`outcome\`         ENUM('open','resolved_by_ai','escalated','closed') NOT NULL DEFAULT 'open',
        \`resolution_note\` TEXT          NULL,
        \`created_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_support_cases_business_id\` (\`business_id\`),
        INDEX \`IDX_support_cases_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_support_cases_session_id\` (\`session_id\`),
        INDEX \`IDX_support_cases_outcome\` (\`outcome\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`knowledge_gaps\` (
        \`id\`           ${id36}       NOT NULL,
        \`appliance_id\` ${id36}       NOT NULL,
        \`business_id\`  ${id36}       NULL,
        \`question\`     TEXT          NOT NULL,
        \`normalized\`   VARCHAR(255)  NOT NULL,
        \`times_asked\`  INT           NOT NULL DEFAULT 1,
        \`dismissed\`    TINYINT(1)    NOT NULL DEFAULT 0,
        \`created_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_knowledge_gaps_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_knowledge_gaps_business_id\` (\`business_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`maintenance_tasks\` (
        \`id\`            ${id36}       NOT NULL,
        \`appliance_id\`  ${id36}       NOT NULL,
        \`title\`         VARCHAR(255)  NOT NULL,
        \`frequency\`     VARCHAR(100)  NOT NULL,
        \`interval_days\` INT           NULL,
        \`details\`       TEXT          NULL,
        \`created_at\`    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_maintenance_tasks_appliance_id\` (\`appliance_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`maintenance_tasks\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`knowledge_gaps\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`support_cases\``);
  }
}
