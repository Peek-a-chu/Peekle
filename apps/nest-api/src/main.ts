import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as sockjs from 'sockjs';
import { SocketService } from './sockets/socket.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration for local development
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Set global prefix to handle /api requests
  app.setGlobalPrefix('api');

  // Start listening first to ensure http server is ready
  await app.listen(8080, '0.0.0.0'); 

  // Setup SockJS
  const socketService = app.get(SocketService);
  const echo = sockjs.createServer({ prefix: '/ws-stomp' });
  
  echo.on('connection', (conn) => {
      socketService.handleConnection(conn);
      conn.on('data', (message) => socketService.handleMessage(conn, message));
      conn.on('close', () => socketService.handleDisconnect(conn));
  });

  const httpServer = app.getHttpServer();
  echo.installHandlers(httpServer);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
