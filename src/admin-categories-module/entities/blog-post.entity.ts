import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

@Entity('posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'author_id' })
  authorId: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ nullable: true })
  excerpt?: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ name: 'featured_image', nullable: true })
  featuredImage?: string;

  @Column({ name: 'published_at', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category?: Category;
}