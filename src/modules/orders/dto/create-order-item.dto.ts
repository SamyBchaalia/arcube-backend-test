import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, IsOptional } from 'class-validator';
import { PurchaseType } from '../enums/purchase-type.enum';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Type of item being purchased',
    enum: PurchaseType,
    example: PurchaseType.PRODUCT,
  })
  @IsEnum(PurchaseType)
  itemType: PurchaseType;

  @ApiProperty({
    description: 'ID of the product or package',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'Quantity to purchase',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}
