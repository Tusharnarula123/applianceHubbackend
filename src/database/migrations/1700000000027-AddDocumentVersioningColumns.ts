import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentVersioningColumns1700000000027 implements MigrationInterface {
  name = 'AddDocumentVersioningColumns1700000000027';

  private async columnExists(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const rows: Array<{ cnt: number | string }> = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = ?`,
      [column],
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'checksum'))) {
      await queryRunner.query('ALTER TABLE `documents` ADD COLUMN `checksum` VARCHAR(64) NULL');
    }
    if (!(await this.columnExists(queryRunner, 'revision'))) {
      await queryRunner.query('ALTER TABLE `documents` ADD COLUMN `revision` INT NOT NULL DEFAULT 1');
    }
    if (!(await this.columnExists(queryRunner, 'supersedes_id'))) {
      await queryRunner.query('ALTER TABLE `documents` ADD COLUMN `supersedes_id` VARCHAR(36) NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'supersedes_id')) {
      await queryRunner.query('ALTER TABLE `documents` DROP COLUMN `supersedes_id`');
    }
    if (await this.columnExists(queryRunner, 'revision')) {
      await queryRunner.query('ALTER TABLE `documents` DROP COLUMN `revision`');
    }
    if (await this.columnExists(queryRunner, 'checksum')) {
      await queryRunner.query('ALTER TABLE `documents` DROP COLUMN `checksum`');
    }
  }
}
