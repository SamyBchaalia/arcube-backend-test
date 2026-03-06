import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentSessionDto {
  @ApiProperty({
    description: 'Order ID to create payment session for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Success URL to redirect after payment',
    example: 'http://localhost:5173/payment/success',
    required: false,
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({
    description: 'Cancel URL to redirect if payment cancelled',
    example: 'http://localhost:5173/payment/cancel',
    required: false,
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
