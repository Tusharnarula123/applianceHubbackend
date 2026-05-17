import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateDocuments1700000000004 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
