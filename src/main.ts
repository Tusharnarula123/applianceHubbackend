// Polyfill for crypto in Node.js environment
import { webcrypto } from 'crypto';
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { getUploadsDir } from './common/uploads-path.js';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(json({ limit: MAX_UPLOAD_BYTES }));
  app.use(urlencoded({ extended: true, limit: MAX_UPLOAD_BYTES }));
  app.useStaticAssets(getUploadsDir(), { prefix: '/uploads/' });

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('ApplianceHub API')
    .setDescription(
      'Optimized REST API for appliance management with Redis caching and smart batch operations',
    )
    .setVersion('1.0.0')
    .addTag('Businesses', 'Business account management')
    .addTag('Appliances', 'Appliance registration and management')
    .addTag('Claims', 'Warranty claims management')
    .addTag('Bookings', 'Service booking management')
    .addTag('Chat', 'Customer support chat')
    .addTag('Activities', 'Activity logs and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customCss: `.topbar { display: none; }`,
  });

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         🚀 ApplianceHub API Server Started                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📡 API Server:  http://localhost:${port}                  ║
║  📚 Swagger Docs: http://localhost:${port}/api/docs        ║
║                                                            ║
║  🗄️  MySQL:  localhost:3308                               ║
║  🔴 Redis:  localhost:6380                                ║
║                                                            ║
║  ✨ Features:                                             ║
║   • 13 interconnected tables                              ║
║   • 6 optimized services                                  ║
║   • Redis caching with smart invalidation                ║
║   • Single query loading (no N+1 problems)               ║
║   • Batch operations after queries                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
