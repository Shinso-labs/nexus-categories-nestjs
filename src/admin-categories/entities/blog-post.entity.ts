import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: number;

  @Column()
  authorId: number;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column('text', { nullable: true })
  content: string | null;

  @Column({ nullable: true })
  excerpt: string | null;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  featuredImage: string | null;

  @Column({ nullable: true })
  categoryId: number | null;

  @Column({ nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}