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
  @Column()
  totalAttributes: number;

  /** Mapped from: Auto-incrementing ID */
  @Column()
  nextAttributeId: number;

  /** Mapped from: Last modification timestamp */
  @Column()
  lastUpdated: number;

  @CreateDateColumn()
  createdAt: Date;
}