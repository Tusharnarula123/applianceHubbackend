import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBusinessesAddColumns1700000000017 implements MigrationInterface {
  name = 'AlterBusinessesAddColumns1700000000017';

  private async columnExists(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows: Array<{ c: number }> = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses' AND COLUMN_NAME = ?`,
      [column],
    );
    return Number(rows[0]?.c) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols: Array<{ name: string; sql: string }> = [
      { name: 'description', sql: `ALTER TABLE \`businesses\` ADD COLUMN \`description\` TEXT NULL` },
      { name: 'timezone', sql: `ALTER TABLE \`businesses\` ADD COLUMN \`timezone\` VARCHAR(255) NULL` },
      { name: 'metadata', sql: `ALTER TABLE \`businesses\` ADD COLUMN \`metadata\` JSON NULL` },
    ];

    for (const col of cols) {
      if (!(await this.columnExists(queryRunner, col.name))) {
        await queryRunner.query(col.sql);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`businesses\` DROP COLUMN IF EXISTS \`metadata\``);
    await queryRunner.query(`ALTER TABLE \`businesses\` DROP COLUMN IF EXISTS \`timezone\``);
    await queryRunner.query(`ALTER TABLE \`businesses\` DROP COLUMN IF EXISTS \`description\``);
  }
}
