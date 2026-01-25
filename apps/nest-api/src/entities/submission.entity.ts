import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studyId: number; // Connect to a study context conceptually

  @Column()
  problemId: number;

  @Column()
  userId: number;

  @Column()
  username: string;

  @Column()
  language: string;

  @Column({ type: 'int' })
  memory: number;

  @Column({ type: 'int' })
  time: number;

  @Column()
  status: string;

  @Column({ nullable: true })
  code: string;

  @Column()
  submittedAt: string;
}
