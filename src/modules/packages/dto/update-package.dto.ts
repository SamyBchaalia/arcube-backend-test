import { ApiProperty } from '@nestjs/swagger';
import {
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

export class UpdatePackageDto {
  @ApiProperty({
    description: 'Package name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Package description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Package price',
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Thumbnail URL',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Array of product IDs to include in package',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Package must contain at least one product' })
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiProperty({
    description: 'Is package active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
