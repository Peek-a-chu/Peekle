import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './sockets/events.gateway';
import { Submission } from './entities/submission.entity';
import { AvailableProblem } from './entities/available-problem.entity';
import { StudyProblem } from './entities/study-problem.entity';
import { StudyProblemParticipant } from './entities/study-problem-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'peekle.sqlite',
      entities: [Submission, AvailableProblem, StudyProblem, StudyProblemParticipant],
      synchronize: true, // Use only in dev!
    }),
    TypeOrmModule.forFeature([Submission, AvailableProblem, StudyProblem, StudyProblemParticipant]),
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
