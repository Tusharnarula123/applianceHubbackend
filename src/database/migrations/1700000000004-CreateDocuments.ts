import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1700000000004 implements MigrationInterface {
  name = 'CreateDocuments1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`documents\` (
        \`id\`              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        \`appliance_id\`    VARCHAR(36)  NOT NULL,
        \`name\`            VARCHAR(255) NOT NULL,
        \`file_url\`        VARCHAR(500) NOT NULL,
        \`file_size_bytes\` BIGINT UNSIGNED NULL,
        \`file_type\`       ENUM('Manual','Warranty','Parts Catalog','Error Codes','Service Guide') NOT NULL DEFAULT 'Manual',
        \`mime_type\`       VARCHAR(100) NULL,
        \`indexed_at\`      TIMESTAMP    NULL,
        \`created_at\`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`PK_documents\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_documents_appliance\`
          FOREIGN KEY (\`appliance_id\`) REFERENCES \`appliances\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX \`IDX_documents_appliance\` (\`appliance_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`documents\``);
  }
}
