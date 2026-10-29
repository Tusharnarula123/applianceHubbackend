import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentBlobs1700000000026 implements MigrationInterface {
  name = 'CreateDocumentBlobs1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    // LONGTEXT: base64 PDFs up to ~100 MB do not fit in TEXT (64 KB)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`document_blobs\` (
        \`document_id\` varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation} NOT NULL,
        \`data_base64\` LONGTEXT NOT NULL,
        \`mime_type\` VARCHAR(100) NOT NULL,
        \`size_bytes\` INT NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`document_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `document_blobs`');
  }
}
