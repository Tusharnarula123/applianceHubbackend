import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScanaConnect1700000000023 implements MigrationInterface {
  name = 'CreateScanaConnect1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match existing UUID column collation (MySQL 8 may use utf8mb4_0900_ai_ci)
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;
    const table = (sql: string) => queryRunner.query(`${sql} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`integration_connections\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`provider\` VARCHAR(40) NOT NULL DEFAULT 'webhook',
        \`name\` VARCHAR(120) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
        \`config\` JSON NULL,
        \`secret_encrypted\` TEXT NULL,
        \`secret_hint\` VARCHAR(8) NULL,
        \`last_tested_at\` TIMESTAMP NULL,
        \`last_test_ok\` TINYINT(1) NULL,
        \`last_delivery_at\` TIMESTAMP NULL,
        \`last_error\` TEXT NULL,
        \`created_by\` ${id36} NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_integration_connections_business_id\` (\`business_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`sync_runs\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`connection_id\` ${id36} NULL,
        \`type\` VARCHAR(30) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'running',
        \`counts\` JSON NULL,
        \`errors\` JSON NULL,
        \`source_name\` VARCHAR(255) NULL,
        \`started_by\` ${id36} NULL,
        \`started_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`finished_at\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_sync_runs_business_id\` (\`business_id\`),
        INDEX \`IDX_sync_runs_connection_id\` (\`connection_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`case_deliveries\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`case_id\` ${id36} NOT NULL,
        \`connection_id\` ${id36} NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'queued',
        \`attempts\` INT NOT NULL DEFAULT 0,
        \`next_attempt_at\` TIMESTAMP NULL,
        \`response_code\` INT NULL,
        \`last_error\` TEXT NULL,
        \`payload\` JSON NULL,
        \`approved_by\` ${id36} NULL,
        \`delivered_at\` TIMESTAMP NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_case_deliveries_case_connection\` (\`case_id\`, \`connection_id\`),
        INDEX \`IDX_case_deliveries_business_id\` (\`business_id\`),
        INDEX \`IDX_case_deliveries_status\` (\`status\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`external_record_mappings\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`connection_id\` ${id36} NOT NULL,
        \`provider\` VARCHAR(40) NOT NULL,
        \`object_type\` VARCHAR(30) NOT NULL,
        \`internal_id\` ${id36} NOT NULL,
        \`external_id\` VARCHAR(255) NOT NULL,
        \`external_url\` VARCHAR(500) NULL,
        \`external_status\` VARCHAR(60) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_external_mappings_lookup\` (\`business_id\`, \`object_type\`, \`internal_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`webhook_events\` (
        \`id\` ${id36} NOT NULL,
        \`connection_id\` ${id36} NOT NULL,
        \`external_event_id\` VARCHAR(255) NOT NULL,
        \`type\` VARCHAR(60) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL,
        \`error\` TEXT NULL,
        \`received_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_webhook_events_dedupe\` (\`connection_id\`, \`external_event_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`audit_events\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`actor_id\` ${id36} NULL,
        \`actor\` VARCHAR(255) NOT NULL,
        \`action\` VARCHAR(60) NOT NULL,
        \`target_type\` VARCHAR(40) NULL,
        \`target_id\` ${id36} NULL,
        \`metadata\` JSON NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_audit_events_business_id\` (\`business_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`product_identifiers\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`appliance_id\` ${id36} NOT NULL,
        \`identifier_type\` VARCHAR(20) NOT NULL,
        \`value\` VARCHAR(120) NOT NULL,
        \`normalized\` VARCHAR(120) NOT NULL,
        \`region\` VARCHAR(20) NULL,
        \`source\` VARCHAR(30) NOT NULL DEFAULT 'manual',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_product_identifiers_lookup\` (\`business_id\`, \`normalized\`),
        INDEX \`IDX_product_identifiers_appliance\` (\`appliance_id\`)
      )`);

    // Document versioning: checksum + revision chain (never silently replace a manual)
    const docCols: Array<{ name: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents'`,
    );
    const has = (c: string) => docCols.some((r) => r.name === c);
    if (!has('checksum')) await queryRunner.query(`ALTER TABLE \`documents\` ADD \`checksum\` VARCHAR(64) NULL`);
    if (!has('revision')) await queryRunner.query(`ALTER TABLE \`documents\` ADD \`revision\` INT NOT NULL DEFAULT 1`);
    if (!has('supersedes_id')) await queryRunner.query(`ALTER TABLE \`documents\` ADD \`supersedes_id\` ${id36} NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`supersedes_id\``);
    await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`revision\``);
    await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`checksum\``);
    for (const t of ['product_identifiers', 'audit_events', 'webhook_events', 'external_record_mappings', 'case_deliveries', 'sync_runs', 'integration_connections']) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
