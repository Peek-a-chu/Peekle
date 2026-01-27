import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration for local development
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Set global prefix to handle /api requests
  app.setGlobalPrefix('api');

  await app.listen(8080, '0.0.0.0'); // Listen on all interfaces
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
