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

  // Keep the exact request bytes so signed webhooks can be verified (Scana Connect)
  app.use(json({ limit: MAX_UPLOAD_BYTES, verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use(urlencoded({ extended: true, limit: MAX_UPLOAD_BYTES }));

  // Serve local uploads only when R2 is not configured (local dev fallback)
  const r2Configured = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
  if (!r2Configured) {
    app.useStaticAssets(getUploadsDir(), { prefix: '/uploads/' });
    // Disk wiped by a redeploy/sleep: serve (and restore) the database copy instead of a 404
    const { DocumentFilesService } = await import('./common/document-files.service.js');
    const documentFiles = app.get(DocumentFilesService, { strict: false });
    app.use('/uploads', async (req: any, res: any, next: any) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const name = req.path.split('/').filter(Boolean).pop();
      if (!name) return next();
      try {
        const buffer = await documentFiles.readByUrl(`/uploads/${name}`);
        res.type(name.slice(name.lastIndexOf('.'))).send(buffer);
      } catch {
        next();
      }
    });
  }

  // Correct client IP behind reverse proxy (used by rate limiting)
  app.set('trust proxy', 1);

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
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://scana.in',
        'https://www.scana.in',
      ];
      // In development, also allow phones/laptops on the local network (e.g. testing a QR scan)
      const isLanDev =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (allowed.includes(origin) || origin.endsWith('.vercel.app') || isLanDev) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

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
║   • Rate limiting (per IP, configurable via .env)        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
