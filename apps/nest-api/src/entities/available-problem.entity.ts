import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AvailableProblem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  number: number;

  @Column()
  title: string;

  @Column()
  source: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  tier: number;
}
