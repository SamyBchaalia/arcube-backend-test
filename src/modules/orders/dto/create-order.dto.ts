import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Array of items to purchase',
    type: [CreateOrderItemDto],
    example: [
      {
        itemType: 'product',
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 1,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.MANUAL,
    required: false,
    default: PaymentMethod.MANUAL,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.MANUAL;

  @ApiProperty({
    description: 'Optional notes for the order',
    example: 'Gift purchase',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
