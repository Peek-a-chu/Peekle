import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration for Next.js frontend (default port 3000)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  // Set global prefix to handle /api requests
  app.setGlobalPrefix('api');

  await app.listen(3001); // Run NestJS on 3001 to avoid conflict with NextJS
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
