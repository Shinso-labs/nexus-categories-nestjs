import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

/**
 * SeoMetadata entity.
 * Source: Laravel SEO metadata table for posts and other entities
 */
@Entity('seo_metadata')
@Unique(['entityType', 'entityId', 'tenantId'])
export class SeoMetadata {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: seo_metadata.entity_type */
  @Column()
  entityType: string;

  /** Mapped from: seo_metadata.entity_id */
  @Column()
  entityId: number;

  /** Mapped from: seo_metadata.tenant_id */
  @Column()
  tenantId: number;

  /** Mapped from: seo_metadata.meta_title */
  @Column({ nullable: true })
  metaTitle: string | null;

  /** Mapped from: seo_metadata.meta_description */
  @Column({ type: 'text', nullable: true })
  metaDescription: string | null;

  /** Mapped from: seo_metadata.noindex */
  @Column({ default: false })
  noindex: boolean;

  /** Mapped from: seo_metadata.canonical_url */
  @Column({ nullable: true })
  canonicalUrl: string | null;

  /** Mapped from: seo_metadata.og_title */
  @Column({ nullable: true })
  ogTitle: string | null;

  /** Mapped from: seo_metadata.og_description */
  @Column({ type: 'text', nullable: true })
  ogDescription: string | null;

  /** Mapped from: seo_metadata.og_image */
  @Column({ nullable: true })
  ogImage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}