import './crypto-polyfill.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = new DocumentBuilder()
        .setTitle('ApplianceHub API')
        .setDescription('Optimized REST API for appliance management with Redis caching and smart batch operations')
        .setVersion('1.0.0')
        .addTag('Businesses', 'Business account management')
        .addTag('Appliances', 'Appliance registration and management')
        .addTag('Claims', 'Warranty claims management')
        .addTag('Bookings', 'Service booking management')
        .addTag('Chat', 'Customer support chat')
        .addTag('Activities', 'Activity logs and analytics')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
        },
        customCss: `.topbar { display: none; }`,
    });
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
//# sourceMappingURL=main.js.map