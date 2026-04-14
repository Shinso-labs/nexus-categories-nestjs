import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AdminAttributeIndex entity.
 * Source: Global attribute management state
 */
@Entity('admin_attribute_indexes')
export class AdminAttributeIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Attribute count */
  @Column({ name: 'total_attributes', default: 0 })
  totalAttributes: number;

  /** Mapped from: Auto-incrementing ID */
  @Column({ name: 'next_attribute_id', default: 1 })
  nextAttributeId: number;

  /** Mapped from: Last modification timestamp */
  @Column({ name: 'last_updated', type: 'bigint', default: () => 'EXTRACT(EPOCH FROM NOW())' })
  lastUpdated: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}