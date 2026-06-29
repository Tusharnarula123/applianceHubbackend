import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align `businesses` with BusinessEntity for DBs that still use contact_email/contact_phone.
 * Safe to run when columns were already renamed (each step skips on duplicate / missing).
 */
export class SyncBusinessesSchema1700000000018 implements MigrationInterface {
  name = 'SyncBusinessesSchema1700000000018';

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const rows: Array<{ c: number }> = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return Number(rows[0]?.c) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasContactEmail = await this.columnExists(queryRunner, 'businesses', 'contact_email');
    const hasEmail = await this.columnExists(queryRunner, 'businesses', 'email');

    if (hasContactEmail && !hasEmail) {
      await queryRunner.query(
        `ALTER TABLE \`businesses\` CHANGE \`contact_email\` \`email\` VARCHAR(255) NULL`,
      );
    }

    const hasContactPhone = await this.columnExists(queryRunner, 'businesses', 'contact_phone');
    const hasPhone = await this.columnExists(queryRunner, 'businesses', 'phone');

    if (hasContactPhone && !hasPhone) {
      await queryRunner.query(
        `ALTER TABLE \`businesses\` CHANGE \`contact_phone\` \`phone\` VARCHAR(50) NULL`,
      );
    }

    const optionalCols = [
      `ALTER TABLE \`businesses\` ADD COLUMN \`description\` TEXT NULL`,
      `ALTER TABLE \`businesses\` ADD COLUMN \`timezone\` VARCHAR(255) NULL`,
      `ALTER TABLE \`businesses\` ADD COLUMN \`metadata\` JSON NULL`,
      `ALTER TABLE \`businesses\` ADD COLUMN \`support_email\` VARCHAR(255) NULL`,
      `ALTER TABLE \`businesses\` ADD COLUMN \`industry\` VARCHAR(100) NULL`,
    ];

    for (const sql of optionalCols) {
      try {
        await queryRunner.query(sql);
      } catch (err: any) {
        if (err?.errno !== 1060 && !err?.message?.includes('Duplicate column')) throw err;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasEmail = await this.columnExists(queryRunner, 'businesses', 'email');
    const hasContactEmail = await this.columnExists(queryRunner, 'businesses', 'contact_email');

    if (hasEmail && !hasContactEmail) {
      await queryRunner.query(
        `ALTER TABLE \`businesses\` CHANGE \`email\` \`contact_email\` VARCHAR(255) NULL`,
      );
    }

    const hasPhone = await this.columnExists(queryRunner, 'businesses', 'phone');
    const hasContactPhone = await this.columnExists(queryRunner, 'businesses', 'contact_phone');

    if (hasPhone && !hasContactPhone) {
      await queryRunner.query(
        `ALTER TABLE \`businesses\` CHANGE \`phone\` \`contact_phone\` VARCHAR(20) NULL`,
      );
    }
  }
}
