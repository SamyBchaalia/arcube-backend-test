import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayPalCaptureDto {
  @ApiProperty({
    description: 'PayPal order ID to capture',
    example: '8XV12345ABC12345D',
  })
  @IsString()
  paypalOrderId: string;

  @ApiProperty({
    description: 'Internal order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;
}
