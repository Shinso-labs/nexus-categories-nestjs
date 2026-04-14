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
  @Column()
  name: string;

  /** Mapped from: Attribute.slug */
  @Column()
  slug: string;

  /** Mapped from: Attribute.type */
  @Column()
  attributeType: string;

  /** Mapped from: Attribute.default_value */
  @Column({ nullable: true })
  defaultValue: string | null;

  /** Mapped from: Attribute.is_required */
  @Column()
  isRequired: boolean;

  /** Mapped from: Attribute.is_searchable */
  @Column()
  isSearchable: boolean;

  /** Mapped from: Attribute.sort_order */
  @Column()
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
