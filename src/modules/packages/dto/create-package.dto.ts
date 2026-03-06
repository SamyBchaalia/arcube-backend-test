import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUrl,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({
    description: 'Package name',
    example: 'Sales Starter Bundle',
  })
  @IsNotEmpty({ message: 'Package name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Package description',
    example: 'Everything you need to start selling effectively',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Package price (typically discounted)',
    example: 49.99,
  })
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Thumbnail URL',
    example: 'https://example.com/package-thumbnail.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Array of product IDs to include in package',
    example: ['550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001'],
    type: [String],
  })
  @IsNotEmpty({ message: 'At least one product is required' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Package must contain at least one product' })
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({
    description: 'Is package active',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
