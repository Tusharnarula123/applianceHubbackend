import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config();
export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'appliancehub',
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    synchronize: false,
    logging: true,
});
//# sourceMappingURL=data-source.js.map