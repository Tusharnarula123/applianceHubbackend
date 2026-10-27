import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCampaignsAndNotifications1700000000024 implements MigrationInterface {
  name = 'CreateCampaignsAndNotifications1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match existing UUID column collation (MySQL 8 may use utf8mb4_0900_ai_ci)
    const colRows: Array<{ collation: string | null }> = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appliances' AND COLUMN_NAME = 'id'`,
    );
    const collation = colRows[0]?.collation ?? 'utf8mb4_unicode_ci';
    const id36 = `varchar(36) CHARACTER SET utf8mb4 COLLATE ${collation}`;
    const table = (sql: string) => queryRunner.query(`${sql} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`campaigns\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft',
        \`offer_type\` VARCHAR(30) NOT NULL DEFAULT 'accessory',
        \`headline\` VARCHAR(120) NOT NULL,
        \`body\` TEXT NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`cta_label\` VARCHAR(40) NOT NULL DEFAULT 'View offer',
        \`cta_url\` VARCHAR(500) NOT NULL,
        \`coupon_code\` VARCHAR(60) NULL,
        \`target_appliance_ids\` JSON NULL,
        \`target_categories\` JSON NULL,
        \`moments\` JSON NULL,
        \`channels\` JSON NULL,
        \`starts_at\` TIMESTAMP NULL,
        \`ends_at\` TIMESTAMP NULL,
        \`priority\` INT NOT NULL DEFAULT 0,
        \`impressions\` INT NOT NULL DEFAULT 0,
        \`clicks\` INT NOT NULL DEFAULT 0,
        \`sends\` INT NOT NULL DEFAULT 0,
        \`created_by\` ${id36} NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_campaigns_business_id\` (\`business_id\`),
        INDEX \`IDX_campaigns_status\` (\`status\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`campaign_events\` (
        \`id\` ${id36} NOT NULL,
        \`campaign_id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`type\` VARCHAR(20) NOT NULL,
        \`channel\` VARCHAR(20) NOT NULL,
        \`appliance_id\` ${id36} NULL,
        \`session_id\` ${id36} NULL,
        \`subscriber_id\` ${id36} NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_campaign_events_campaign_date\` (\`campaign_id\`, \`created_at\`),
        INDEX \`IDX_campaign_events_business_id\` (\`business_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`subscribers\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`appliance_id\` ${id36} NOT NULL,
        \`name\` VARCHAR(255) NULL,
        \`email\` VARCHAR(255) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`push_subscription\` JSON NULL,
        \`email_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        \`push_enabled\` TINYINT(1) NOT NULL DEFAULT 0,
        \`whatsapp_enabled\` TINYINT(1) NOT NULL DEFAULT 0,
        \`consent_service\` TINYINT(1) NOT NULL DEFAULT 1,
        \`consent_marketing\` TINYINT(1) NOT NULL DEFAULT 0,
        \`consent_record\` JSON NULL,
        \`unsubscribe_token\` VARCHAR(64) NOT NULL,
        \`unsubscribed_at\` TIMESTAMP NULL,
        \`last_marketing_at\` TIMESTAMP NULL,
        \`session_id\` ${id36} NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_subscribers_unsubscribe_token\` (\`unsubscribe_token\`),
        INDEX \`IDX_subscribers_business_id\` (\`business_id\`),
        INDEX \`IDX_subscribers_appliance_id\` (\`appliance_id\`)
      )`);

    await table(`
      CREATE TABLE IF NOT EXISTS \`notification_jobs\` (
        \`id\` ${id36} NOT NULL,
        \`business_id\` ${id36} NOT NULL,
        \`subscriber_id\` ${id36} NOT NULL,
        \`campaign_id\` ${id36} NULL,
        \`kind\` VARCHAR(30) NOT NULL,
        \`channel\` VARCHAR(20) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'queued',
        \`dedupe_key\` VARCHAR(191) NOT NULL,
        \`payload\` JSON NOT NULL,
        \`attempts\` INT NOT NULL DEFAULT 0,
        \`send_after\` TIMESTAMP NULL,
        \`error\` TEXT NULL,
        \`sent_at\` TIMESTAMP NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_notification_jobs_dedupe\` (\`dedupe_key\`),
        INDEX \`IDX_notification_jobs_status_send_after\` (\`status\`, \`send_after\`),
        INDEX \`IDX_notification_jobs_business_id\` (\`business_id\`)
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of ['notification_jobs', 'subscribers', 'campaign_events', 'campaigns']) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
