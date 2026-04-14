import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AdminAttribute entity.
 * Source: Attribute model state for admin management
 */
@Entity('admin_attributes')
export class AdminAttribute {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Attribute.name */
  @Column({ name: 'name' })
  name: string;

  /** Mapped from: Attribute.slug */
  @Column({ name: 'slug' })
  slug: string;

  /** Mapped from: Attribute.type */
  @Column({ name: 'attribute_type', default: 'checkbox' })
  attributeType: string;

  /** Mapped from: Attribute.default_value */
  @Column({ name: 'default_value', nullable: true })
  defaultValue: string | null;

  /** Mapped from: Attribute.is_required */
  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  /** Mapped from: Attribute.is_searchable */
  @Column({ name: 'is_searchable', default: false })
  isSearchable: boolean;

  /** Mapped from: Attribute.sort_order */
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}