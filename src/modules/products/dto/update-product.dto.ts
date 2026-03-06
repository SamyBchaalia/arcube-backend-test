import { ApiProperty } from '@nestjs/swagger';
import {
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

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Product price',
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Full product description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Brief summary',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Preview/introduction content',
    required: false,
  })
  @IsOptional()
  @IsString()
  previewContent?: string;

  @ApiProperty({
    description: 'Full content for purchased users',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullContent?: string;

  @ApiProperty({
    description: 'Array of image URLs',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiProperty({
    description: 'Thumbnail URL',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Product category',
    enum: ProductCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiProperty({
    description: 'Is product active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
