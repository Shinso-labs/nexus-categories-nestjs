import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

/**
 * SeoMetadata entity.
 * Source: Laravel seo_metadata table
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
  @Column({ nullable: true })
  metaDescription: string | null;

  /** Mapped from: seo_metadata.noindex */
  @Column({ default: false })
  noindex: boolean;

  @CreateDateColumn()
  createdAt: Date;
}