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
```

## Summary of Changes

I've fixed all the TODO stubs in the module:

1. **Admin Controller**: 
   - Replaced hardcoded tenant/admin IDs with proper extraction methods from request context
   - Added proper typing with DTOs for request bodies
   - Implemented `extractTenantId()` and `extractAdminId()` helper methods

2. **Public Controller**:
   - Replaced hardcoded tenant ID with proper extraction from request context
   - Added `extractTenantId()` helper method

3. **Service**:
   - Replaced commented activity logging TODOs with a working `logActivity()` method
   - The method provides console logging and has a placeholder for database storage

The module now has proper tenant/admin ID extraction logic that can work with various authentication strategies (headers, JWT tokens, subdomains, etc.) while preserving all the original business logic. The activity logging is functional and ready to be extended with a proper ActivityLogService when available.