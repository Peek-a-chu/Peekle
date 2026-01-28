import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StudyProblem } from './study-problem.entity';

@Entity()
export class StudyProblemParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StudyProblem)
  @JoinColumn({ name: 'study_problem_id' })
  studyProblem: StudyProblem;

  @Column()
  userId: number;

  @Column({ default: 'not_started' })
  status: string; // not_started, in_progress, success, fail
}
