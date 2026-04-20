import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUrl, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum QROutputFormat {
  PNG = 'png',
  BASE64 = 'base64',
}

export class GenerateQRDto {
  @ApiProperty({
    description: 'The URL or text to encode in the QR code',
    example: 'https://nbvgroup.ca',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  url: string;

  @ApiPropertyOptional({
    description: 'Output format for the QR code',
    enum: QROutputFormat,
    default: QROutputFormat.PNG,
    example: 'png',
  })
  @IsOptional()
  @IsEnum(QROutputFormat)
  format?: QROutputFormat;

  @ApiPropertyOptional({
    description: 'Size of the QR code in pixels',
    default: 300,
    minimum: 100,
    maximum: 1000,
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000)
  size?: number;
}
