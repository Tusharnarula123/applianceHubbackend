import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentChunks1700000000014 implements MigrationInterface {
  name = 'AddDocumentChunks1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';

    const hasEmbeddingStatus: Array<{ c: number }> = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'embedding_status'`,
    );

    if (Number(hasEmbeddingStatus[0]?.c) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`documents\` ADD \`embedding_status\` enum('pending','processing','indexed','failed') NOT NULL DEFAULT 'pending'`,
      );
    }

    await queryRunner.query(`
      CREATE TABLE \`document_chunks\` (
        \`id\` varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation} NOT NULL,
        \`document_id\` varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation} NOT NULL,
        \`appliance_id\` varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation} NOT NULL,
        \`content\` text NOT NULL,
        \`embedding\` json NULL,
        \`chunk_index\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_document_chunks_appliance_id\` (\`appliance_id\`),
        INDEX \`IDX_document_chunks_document_id\` (\`document_id\`),
        CONSTRAINT \`FK_document_chunks_document\` FOREIGN KEY (\`document_id\`) REFERENCES \`documents\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_document_chunks_appliance\` FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`document_chunks\``);
    await queryRunner.query(
      `ALTER TABLE \`documents\` DROP COLUMN \`embedding_status\``,
    );
  }
}
