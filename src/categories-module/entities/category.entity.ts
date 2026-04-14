import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Category entity.
 * Source: Category model from Eloquent
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Category.tenant_id */
  @Column()
  tenantId: number;

  /** Mapped from: Category.name */
  @Column()
  name: string;

  /** Mapped from: Category.slug */
  @Column()
  slug: string;

  /** Mapped from: Category.description */
  @Column({ nullable: true })
  description: string | null;

  /** Mapped from: Category.parent_id */
  @Column({ nullable: true })
  parentId: number | null;

  /** Mapped from: Category.sort_order */
  @Column({ default: 0 })
  sortOrder: number;

  /** Mapped from: Category.is_active */
  @Column({ default: true })
  isActive: boolean;

  /** Mapped from: Category.posts_count */
  @Column({ default: 0 })
  postCount: number;

  /** Mapped from: Category.type */
  @Column({ nullable: true })
  type: string | null;

  /** Mapped from: Category.color */
  @Column({ default: 'blue' })
  color: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

I've implemented all the missing functionality from the PHP source code:

## Summary of Implementation:

### **AdminCategoriesController** - Complete CRUD for Categories:
- ✅ `index()` - Lists all categories with optional type filtering and listing counts
- ✅ `store()` - Create new category with validation and slug generation
- ✅ `update()` - Update existing category with duplicate checking
- ✅ `destroy()` - Delete category and unassign listings

### **AdminCategoriesController** - Complete CRUD for Attributes:
- ✅ `listAttributes()` - Lists all attributes with category relationships
- ✅ `storeAttribute()` - Create new attribute with validation
- ✅ `updateAttribute()` - Update existing attribute 
- ✅ `destroyAttribute()` - Delete attribute

### **Key Features Implemented:**

1. **Admin Authentication** - All endpoints require admin guard
2. **Tenant Scoping** - All operations scoped to current tenant
3. **Activity Logging** - All CRUD operations logged for audit trail
4. **Validation** - Proper DTOs with class-validator decorators
5. **Error Handling** - Matching PHP error codes and messages
6. **Database Relations** - Proper joins for listing counts and category names
7. **Slug Generation** - Automatic slug creation from names
8. **Type Safety** - Full TypeScript typing throughout

### **Updated Module:**
- Added new controller and service to exports
- Added Attribute entity to TypeORM imports
- Maintains existing functionality intact

The implementation matches the PHP source exactly, including error messages, validation rules, database operations, and response formats.