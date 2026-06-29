import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserColumns1700000000019 implements MigrationInterface {
  name = 'AddUserColumns1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add phone column
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN IF NOT EXISTS \`phone\` VARCHAR(20) NULL AFTER \`email\`
    `);

    // Add is_active column
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN IF NOT EXISTS \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`avatar_url\`
    `);

    // Add last_login column (rename from last_active_at if it exists, otherwise add fresh)
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    const colNames: string[] = cols.map((c: any) => c.COLUMN_NAME);

    if (colNames.includes('last_active_at') && !colNames.includes('last_login')) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          CHANGE COLUMN \`last_active_at\` \`last_login\` TIMESTAMP NULL
      `);
    } else if (!colNames.includes('last_login')) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          ADD COLUMN \`last_login\` TIMESTAMP NULL AFTER \`is_active\`
      `);
    }

    // Add metadata column
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN IF NOT EXISTS \`metadata\` JSON NULL AFTER \`last_login\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`metadata\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`last_login\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`is_active\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`phone\``);
  }
}
