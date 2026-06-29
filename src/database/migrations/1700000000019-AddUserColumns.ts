import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserColumns1700000000019 implements MigrationInterface {
  name = 'AddUserColumns1700000000019';

  private async columnExists(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [column],
    );
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'phone'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`phone\` VARCHAR(20) NULL AFTER \`email\``,
      );
    }

    if (!(await this.columnExists(queryRunner, 'is_active'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`avatar_url\``,
      );
    }

    if (await this.columnExists(queryRunner, 'last_active_at') && !(await this.columnExists(queryRunner, 'last_login'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` CHANGE COLUMN \`last_active_at\` \`last_login\` TIMESTAMP NULL`,
      );
    } else if (!(await this.columnExists(queryRunner, 'last_login'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`last_login\` TIMESTAMP NULL`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'metadata'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`metadata\` JSON NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'metadata')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`metadata\``);
    }
    if (await this.columnExists(queryRunner, 'last_login')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`last_login\``);
    }
    if (await this.columnExists(queryRunner, 'is_active')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_active\``);
    }
    if (await this.columnExists(queryRunner, 'phone')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
    }
  }
}
