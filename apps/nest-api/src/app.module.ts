import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudyController } from './controllers/study.controller';
import { SubmissionController } from './controllers/submission.controller';
import { ResponseInterceptor } from './common/response.interceptor';
import { SocketService } from './sockets/socket.service';
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
  controllers: [AppController, StudyController, SubmissionController],
  providers: [
    AppService, 
    SocketService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
