import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * BlogConfig entity.
 * Source: BlogService configuration and URL handling
 */
@Entity('blog_configs')
export class BlogConfig {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogService default pagination */
  @Column()
  postsPerPage: number;

  /** Mapped from: BlogService pagination limit */
  @Column()
  maxPerPage: number;

  /** Mapped from: BlogService URL resolution */
  @Column()
  baseUrl: string;

  /** Mapped from: BlogService image URL resolution */
  @Column()
  imageBaseUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
