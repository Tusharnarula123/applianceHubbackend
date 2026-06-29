import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPageIndexToDocumentChunks1700000000015 implements MigrationInterface {
  name = 'AddPageIndexToDocumentChunks1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn: Array<{ c: number }> = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'document_chunks' AND COLUMN_NAME = 'page_index'`,
    );

    if (Number(hasColumn[0]?.c) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`document_chunks\` ADD \`page_index\` int NOT NULL DEFAULT 0 AFTER \`chunk_index\``,
      );
      await queryRunner.query(
        `CREATE INDEX \`IDX_document_chunks_doc_page\` ON \`document_chunks\` (\`document_id\`, \`page_index\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_document_chunks_doc_page\` ON \`document_chunks\``);
    await queryRunner.query(`ALTER TABLE \`document_chunks\` DROP COLUMN \`page_index\``);
  }
}
