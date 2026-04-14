import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Author entity.
 * Source: User model (author subset)
 */
@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: User.id */
  @Column()
  userId: number;

  /** Mapped from: User.name */
  @Column()
  name: string;

  /** Mapped from: User.email */
  @Column()
  email: string;

  /** Mapped from: User.avatar */
  @Column({ nullable: true })
  avatar: string | null;

  /** Mapped from: User.bio */
  @Column({ nullable: true })
  bio: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
