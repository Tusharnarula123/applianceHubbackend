import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateMessages1700000000009 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
