import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './sockets/events.gateway';
import { Problem } from './entities/problem.entity';
import { Submission } from './entities/submission.entity';
import { AvailableProblem } from './entities/available-problem.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'peekle.sqlite',
      entities: [Problem, Submission, AvailableProblem],
      synchronize: true, // Use only in dev!
    }),
    TypeOrmModule.forFeature([Problem, Submission, AvailableProblem]),
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
