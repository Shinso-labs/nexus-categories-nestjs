import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  action: string;

  @Column({ type: 'text' })
  details: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}