import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Attribute entity for category attributes.
 * Source: Attribute model from Laravel
 */
@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Attribute.tenant_id */
  @Column()
  tenantId: number;

  /** Mapped from: Attribute.name */
  @Column()
  name: string;

  /** Mapped from: Attribute.category_id */
  @Column({ nullable: true })
  categoryId: number | null;

  /** Mapped from: Attribute.input_type */
  @Column()
  inputType: string;

  /** Mapped from: Attribute.is_active */
  @Column({ default: true })
  isActive: boolean;

  /** Mapped from: Attribute.target_type */
  @Column({ default: 'any' })
  targetType: string;

  @CreateDateColumn()
  createdAt: Date;
}