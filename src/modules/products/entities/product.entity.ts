import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ProductCategory } from '../enums/product-category.enum';
import { Package } from '../../packages/entities/package.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  previewContent: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.BOOK,
  })
  category: ProductCategory;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  fullContent: string;

  @Column({ length: 500, nullable: true })
  fileUrl: string;

  @Column({ length: 255, nullable: true })
  fileName: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ length: 100, nullable: true })
  fileMimeType: string;

  @ManyToMany(() => Package, (pkg) => pkg.products)
  packages: Package[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
