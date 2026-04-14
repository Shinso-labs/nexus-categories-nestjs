import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AuthorSummary entity.
 * Source: formatAuthor output
 */
@Entity('author_summaries')
export class AuthorSummary {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: User.name */
  @Column()
  name: string;

  /** Mapped from: Resolved avatar URL */
  @Column({ nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}