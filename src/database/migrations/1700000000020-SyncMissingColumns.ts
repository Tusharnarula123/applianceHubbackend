import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comprehensive schema sync — adds every column that exists in entity
 * classes but was missing from earlier migrations.
 *
 * Tables touched:
 *  • appliances  – add deleted_at
 *  • messages    – rename session_id → chat_session_id, add message_type, metadata
 *  • businesses  – widen plan and plan_status ENUMs
 */
export class SyncMissingColumns1700000000020 implements MigrationInterface {
  name = 'SyncMissingColumns1700000000020';

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
    // ── appliances: add deleted_at ────────────────────────────────
    if (!(await this.columnExists(queryRunner, 'appliances', 'deleted_at'))) {
      await queryRunner.query(
        `ALTER TABLE \`appliances\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
      );
    }

    // ── messages: rename session_id → chat_session_id ─────────────
    const hasSessionId = await this.columnExists(queryRunner, 'messages', 'session_id');
    const hasChatSessionId = await this.columnExists(queryRunner, 'messages', 'chat_session_id');

    if (hasSessionId && !hasChatSessionId) {
      // Drop old FK first (constraint name from original migration)
      try {
        await queryRunner.query(
          `ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_messages_session\``,
        );
      } catch (_) { /* FK may not exist or have a different name — safe to ignore */ }

      await queryRunner.query(
        `ALTER TABLE \`messages\` CHANGE COLUMN \`session_id\` \`chat_session_id\` VARCHAR(36) NOT NULL`,
      );

      // Re-add FK with new column name
      try {
        await queryRunner.query(`
          ALTER TABLE \`messages\`
            ADD CONSTRAINT \`FK_messages_chat_session\`
            FOREIGN KEY (\`chat_session_id\`) REFERENCES \`chat_sessions\`(\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        `);
      } catch (_) { /* ignore if already exists */ }
    }

    // ── messages: add message_type ────────────────────────────────
    if (!(await this.columnExists(queryRunner, 'messages', 'message_type'))) {
      await queryRunner.query(
        `ALTER TABLE \`messages\` ADD COLUMN \`message_type\` VARCHAR(255) NULL`,
      );
    }

    // ── messages: add metadata ────────────────────────────────────
    if (!(await this.columnExists(queryRunner, 'messages', 'metadata'))) {
      await queryRunner.query(
        `ALTER TABLE \`messages\` ADD COLUMN \`metadata\` JSON NULL`,
      );
    }

    // ── businesses: widen plan ENUM ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`businesses\`
        MODIFY COLUMN \`plan\`
          ENUM('startup','basic','pro','enterprise','starter','growth')
          NOT NULL DEFAULT 'startup'
    `);

    // ── businesses: widen plan_status ENUM ───────────────────────
    await queryRunner.query(`
      ALTER TABLE \`businesses\`
        MODIFY COLUMN \`plan_status\`
          ENUM('active','trial','inactive','suspended','cancelled','past_due')
          NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse businesses ENUMs
    await queryRunner.query(`
      ALTER TABLE \`businesses\`
        MODIFY COLUMN \`plan_status\`
          ENUM('active','cancelled','past_due')
          NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      ALTER TABLE \`businesses\`
        MODIFY COLUMN \`plan\`
          ENUM('starter','growth','enterprise')
          NOT NULL DEFAULT 'starter'
    `);

    // Reverse messages
    if (await this.columnExists(queryRunner, 'messages', 'metadata')) {
      await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`metadata\``);
    }
    if (await this.columnExists(queryRunner, 'messages', 'message_type')) {
      await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`message_type\``);
    }

    const hasChatSessionId = await this.columnExists(queryRunner, 'messages', 'chat_session_id');
    const hasSessionId = await this.columnExists(queryRunner, 'messages', 'session_id');
    if (hasChatSessionId && !hasSessionId) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_messages_chat_session\``,
        );
      } catch (_) { /* ignore */ }
      await queryRunner.query(
        `ALTER TABLE \`messages\` CHANGE COLUMN \`chat_session_id\` \`session_id\` VARCHAR(36) NOT NULL`,
      );
    }

    // Reverse appliances
    if (await this.columnExists(queryRunner, 'appliances', 'deleted_at')) {
      await queryRunner.query(`ALTER TABLE \`appliances\` DROP COLUMN \`deleted_at\``);
    }
  }
}
