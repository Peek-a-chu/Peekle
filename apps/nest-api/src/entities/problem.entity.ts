import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Problem {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  title: string;

  @Column({ nullable: true })
  number: number; // Added problem number field

  @Column()
  source: string;

  @Column({ default: 'not_started' })
  status: string; // sqlite doesn't support enum natively well with some adapters, keeping as string for simplicity

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 0 })
  participantCount: number;

  @Column({ default: 0 })
  totalParticipants: number;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  tier: number;
}
