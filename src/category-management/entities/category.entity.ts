import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

/**
 * Category entity — translated from Laravel Category model.
 * Source: app/Models/Category.php
 * Table: categories
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ default: 'blue' })
  color: string;

  @Column({ default: 'listing' })
  type: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Category, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (cat) => cat.parent)
  children: Category[];
}
