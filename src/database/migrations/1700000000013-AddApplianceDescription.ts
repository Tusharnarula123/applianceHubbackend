import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplianceDescription1700000000013 implements MigrationInterface {
  name = 'AddApplianceDescription1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appliances\` ADD \`description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`appliances\` ADD \`image_url\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appliances\` DROP COLUMN \`image_url\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`appliances\` DROP COLUMN \`description\``,
    );
  }
}
