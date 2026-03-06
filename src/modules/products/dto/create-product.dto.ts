import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUrl,
  IsEnum,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductCategory } from '../enums/product-category.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Sales Mastery Book',
  })
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Product price',
    example: 29.99,
  })
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Full product description',
    example: 'Complete guide to modern sales techniques and strategies',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Brief summary',
    example: 'Learn proven sales strategies',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Preview/introduction content',
    example: 'Introduction: Welcome to Sales Mastery...',
    required: false,
  })
  @IsOptional()
  @IsString()
  previewContent?: string;

  @ApiProperty({
    description: 'Full content for purchased users',
    example: 'Chapter 1: The Art of Sales...',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullContent?: string;

  @ApiProperty({
    description: 'Array of image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiProperty({
    description: 'Thumbnail URL',
    example: 'https://example.com/thumbnail.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Product category',
    enum: ProductCategory,
    example: ProductCategory.BOOK,
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({
    description: 'Is product active',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
