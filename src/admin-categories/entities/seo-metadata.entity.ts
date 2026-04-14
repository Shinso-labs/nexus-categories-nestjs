import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('seo_metadata')
@Index(['entityType', 'entityId', 'tenantId'], { unique: true })
export class SeoMetadata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string;

  @Column()
  entityId: number;

  @Column()
  tenantId: number;

  @Column({ nullable: true })
  metaTitle: string | null;

  @Column({ nullable: true })
  metaDescription: string | null;

  @Column({ default: false })
  noindex: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}