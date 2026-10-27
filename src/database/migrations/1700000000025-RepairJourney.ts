import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairJourney1700000000025 implements MigrationInterface {
  name = 'RepairJourney1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;

    const cols: Array<{ name: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'support_cases'`,
    );
    const add = async (name: string, ddl: string) => {
      if (!cols.some((c) => c.name === name)) await queryRunner.query(`ALTER TABLE \`support_cases\` ADD \`${name}\` ${ddl}`);
    };
    await add('public_token', 'VARCHAR(64) NULL');
    await add('canonical_status', "VARCHAR(30) NOT NULL DEFAULT 'received'");
    await add('purchase_date', 'VARCHAR(10) NULL');
    await add('serial_number', 'VARCHAR(100) NULL');
    await add('evidence', 'JSON NULL');
    await add('prior_case_refs', 'JSON NULL');
    await add('last_event_at', 'TIMESTAMP NULL');
    await add('customer_confirmed_fixed', 'TINYINT(1) NULL');
    const idx: Array<{ name: string }> = await queryRunner.query(
      `SELECT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'support_cases'`,
    );
    if (!idx.some((i) => i.name === 'UQ_support_cases_public_token')) {
      await queryRunner.query('CREATE UNIQUE INDEX `UQ_support_cases_public_token` ON `support_cases` (`public_token`)');
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`case_events\` (
        \`id\` ${id36} NOT NULL,
        \`case_id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NULL,
        \`type\` VARCHAR(30) NOT NULL,
        \`status\` VARCHAR(30) NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`detail\` TEXT NULL,
        \`data\` JSON NULL,
        \`source\` VARCHAR(20) NOT NULL,
        \`source_ref\` VARCHAR(255) NULL,
        \`visible_to_customer\` TINYINT(1) NOT NULL DEFAULT 1,
        \`occurred_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_case_events_case_time\` (\`case_id\`, \`occurred_at\`),
        INDEX \`IDX_case_events_business_id\` (\`business_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`product_resolutions\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NULL,
        \`method\` VARCHAR(20) NOT NULL,
        \`input\` VARCHAR(255) NOT NULL,
        \`outcome\` VARCHAR(20) NOT NULL,
        \`candidate_ids\` JSON NULL,
        \`chosen_appliance_id\` ${id36} NULL,
        \`corrected\` TINYINT(1) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_product_resolutions_business_id\` (\`business_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `product_resolutions`');
    await queryRunner.query('DROP TABLE IF EXISTS `case_events`');
    await queryRunner.query('DROP INDEX `UQ_support_cases_public_token` ON `support_cases`');
    for (const c of ['customer_confirmed_fixed', 'last_event_at', 'prior_case_refs', 'evidence', 'serial_number', 'purchase_date', 'canonical_status', 'public_token']) {
      await queryRunner.query(`ALTER TABLE \`support_cases\` DROP COLUMN \`${c}\``);
    }
  }
}
