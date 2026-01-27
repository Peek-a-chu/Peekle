import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AvailableProblem } from './available-problem.entity';
import { StudyProblemParticipant } from './study-problem-participant.entity';

@Entity()
export class StudyProblem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studyId: number;

  // Use AvailableProblem as the reference for problem details
  @ManyToOne(() => AvailableProblem)
  @JoinColumn({ name: 'problem_id' })
  problem: AvailableProblem;

  @OneToMany(() => StudyProblemParticipant, participant => participant.studyProblem)
  participants: StudyProblemParticipant[];

  @CreateDateColumn()
  createdAt: Date;
}
