import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './category.entity';

/**
 * Attribute entity — translated from Laravel Attribute model.
 * Source: app/Models/Attribute.php
 * Table: attributes
 */
@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @Column({ name: 'input_type', default: 'checkbox' })
  inputType: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'target_type', default: 'any' })
  targetType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;
}